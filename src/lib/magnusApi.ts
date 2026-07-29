// Client bas niveau pour l'API JSON (non documentée mais publique) de
// liguemagnus.com. Le site est un WordPress qui charge son calendrier et
// ses classements via des appels AJAX à `admin-ajax.php` — pas besoin de
// scraper le HTML ni d'un navigateur headless, juste du fetch + JSON.
//
// Découvert en inspectant le bundle JS chargé par
// https://liguemagnus.com/calendrier-resultats/ (actions `get_rencontres`,
// `get_phases`, `get_competition_by_type`, `get_classementsphase`...).
// Aucune authentification requise.

const ADMIN_AJAX_URL = "https://liguemagnus.com/wp-admin/admin-ajax.php";

// id_type interne du site pour "Ligue Magnus" (par opposition à D3, U20
// Elite, Coupe de France, etc., qui partagent la même API).
const LIGUE_MAGNUS_TYPE_ID = 1;

async function magnusAjax<T>(
  action: string,
  params: Record<string, string | number> = {},
  revalidate = 3600,
): Promise<T> {
  const body = new URLSearchParams({ action, ...toStringParams(params) });

  const res = await fetch(ADMIN_AJAX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`Erreur API Ligue Magnus (${action}): ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(`Erreur API Ligue Magnus (${action}): réponse en échec`);
  }
  return json.data.data as T;
}

function toStringParams(
  params: Record<string, string | number>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
}

export type MagnusCompetition = {
  id: number;
  saison: number;
};

export type MagnusPhase = {
  id: number;
  libelle: string;
  type_phase: string;
};

export type MagnusApiTeam = {
  id: number;
  libelle_court: string;
  libelle_complet: string;
  abreviation: string;
};

export type MagnusApiScore = {
  equipe_id: number;
  score: number;
};

export type MagnusApiMatch = {
  id: number;
  date_rencontre: string; // Heure de Paris, sans fuseau : "2025-09-12 20:00"
  // La ligue publie parfois des dates de rencontre avant d'avoir désigné les
  // deux équipes (ex. saison à venir programmée par blocs de dates) : dans ce
  // cas receveur/visiteur valent la chaîne "NA" au lieu d'un objet équipe, et
  // rencontre_libelle vaut "Non assigné / Non assigné".
  receveur: MagnusApiTeam | "NA";
  visiteur: MagnusApiTeam | "NA";
  score: MagnusApiScore[];
  etat: string; // "T" = terminé
  victoire_par: string | null; // "S" (temps réglementaire) | "PRL" (prolongation) | "TAB" (tirs au but)
};

export type AssignedMagnusApiMatch = MagnusApiMatch & {
  receveur: MagnusApiTeam;
  visiteur: MagnusApiTeam;
};

// Vrai si les deux équipes de la rencontre sont désignées (voir le
// commentaire sur MagnusApiMatch pour le cas "NA").
export function isMatchAssigned(
  m: MagnusApiMatch,
): m is AssignedMagnusApiMatch {
  return typeof m.receveur === "object" && typeof m.visiteur === "object";
}

// Repère la saison la plus récente qui a déjà un calendrier publié : au
// moment du rollover annuel (~août), la nouvelle saison existe côté
// compétitions mais n'a encore aucune phase/match, donc on retombe
// automatiquement sur la dernière saison jouée.
export async function getCurrentCompetitionId(): Promise<number | null> {
  const competitions = await magnusAjax<MagnusCompetition[]>(
    "get_competition_by_type",
    { id_type: LIGUE_MAGNUS_TYPE_ID },
  );
  const bySeasonDesc = [...competitions].sort((a, b) => b.saison - a.saison);

  for (const competition of bySeasonDesc) {
    const phases = await getPhases(competition.id);
    if (phases.length > 0) return competition.id;
  }
  return null;
}

export async function getPhases(competitionId: number): Promise<MagnusPhase[]> {
  return magnusAjax<MagnusPhase[]>("get_phases", {
    competition_id: competitionId,
  });
}

// La "saison régulière" n'a pas de marqueur fiable dans `type_phase` (elle
// partage son code "C" avec la série de maintien) : on identifie donc la
// phase par son libellé, qui est stable d'une saison à l'autre.
export function findRegularSeasonPhase(
  phases: MagnusPhase[],
): MagnusPhase | null {
  return (
    phases.find((p) => p.libelle.toLowerCase().includes("régulière")) ??
    phases[0] ??
    null
  );
}

export async function getMatchesForPhase(
  competitionId: number,
  phaseId: number,
  revalidate = 60,
): Promise<MagnusApiMatch[]> {
  return magnusAjax<MagnusApiMatch[]>(
    "get_rencontres",
    { competition_id: competitionId, phase_id: phaseId, par_page: 700 },
    revalidate,
  );
}

// Tous les matchs de la saison (saison régulière + séries finales
// confondues), toutes phases aplaties. Contrairement à la NHL où les
// séries éliminatoires suivent un calendrier séparé de la saison
// régulière, ici tout appartient à la même compétition et mérite d'être
// pronostiqué de la même façon.
export async function getAllSeasonMatches(
  competitionId: number,
  revalidate = 60,
): Promise<MagnusApiMatch[]> {
  const phases = await getPhases(competitionId);
  const perPhase = await Promise.all(
    phases.map((phase) =>
      getMatchesForPhase(competitionId, phase.id, revalidate),
    ),
  );
  return perPhase.flat();
}

// L'API renvoie les horaires en heure de Paris sans indication de fuseau
// ("2025-09-12 20:00"). On calcule le décalage réel de Paris à cette date
// précise (CET l'hiver, CEST l'été) via Intl, sans dépendance externe, pour
// reconstruire un vrai timestamp UTC.
export function parisLocalToUTC(dateStr: string): string {
  const [datePart, timePart] = dateStr.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const naiveUTC = Date.UTC(year, month - 1, day, hour, minute);
  const offsetMinutes = getParisOffsetMinutes(new Date(naiveUTC));
  return new Date(naiveUTC - offsetMinutes * 60_000).toISOString();
}

function getParisOffsetMinutes(date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const parisAsUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  return (parisAsUTC - date.getTime()) / 60_000;
}

// Le score renvoyé par l'API inclut le but de prolongation / tir au but
// décisif. Comme pour la NHL, les pronostics portent sur le score après
// temps réglementaire : en prolongation ou tirs au but, la victoire se
// joue toujours sur exactement 1 but d'écart (mort subite), donc le score
// réglementaire est simplement le score à égalité juste avant.
export function regulationScore(match: AssignedMagnusApiMatch): {
  homeScore: number;
  awayScore: number;
} {
  const homeScore =
    match.score.find((s) => s.equipe_id === match.receveur.id)?.score ?? 0;
  const awayScore =
    match.score.find((s) => s.equipe_id === match.visiteur.id)?.score ?? 0;

  if (match.victoire_par === "PRL" || match.victoire_par === "TAB") {
    const tied = Math.min(homeScore, awayScore);
    return { homeScore: tied, awayScore: tied };
  }
  return { homeScore, awayScore };
}
