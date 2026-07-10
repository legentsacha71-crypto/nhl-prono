import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/utils/supabase/admin";

// Webhook Stripe : seule source de vérité pour activer/désactiver
// profiles.is_premium. Ne jamais faire confiance au client pour ça — tout
// passe par la signature vérifiée du webhook. À configurer dans le
// dashboard Stripe sur https://<domaine>/api/stripe/webhook, événements :
// checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted.
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Config webhook manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (userId) {
        await admin
          .from("profiles")
          .update({
            is_premium: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: (session.subscription as string) ?? null,
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive =
        subscription.status === "active" || subscription.status === "trialing";

      await admin
        .from("profiles")
        .update({ is_premium: isActive })
        .eq("stripe_customer_id", subscription.customer as string);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
