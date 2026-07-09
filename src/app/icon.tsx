import { ImageResponse } from "next/og";

// Icône générée par code plutôt qu'une image statique — l'ancienne icon.png
// reprenait le style du logo officiel de la LNH (typo penchée + étoile),
// ce qui est un risque de marque déposée. Ici, un simple monogramme.
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0369a1",
          color: "white",
          fontSize: 20,
          fontWeight: 900,
          fontStyle: "italic",
        }}
      >
        LN
      </div>
    ),
    { ...size },
  );
}
