// POST /api/billing/checkout -> { url } of a Stripe-hosted Checkout Session (subscription mode, sandbox)
import { apiError, handleErrors } from "@/lib/api/respond";
import { DESK_ID } from "@/lib/billing/plan";
import { billingConfigured, getSubscription, stripe } from "@/lib/billing/stripe";
import { publicUrl } from "@/lib/twilio/webhook";

export async function POST(request: Request) {
  if (!billingConfigured()) return apiError("upstream_error", "Billing isn't configured (Stripe keys missing).", 503);
  return handleErrors(async () => {
    if ((await getSubscription()).status === "active") return apiError("conflict", "This desk already has an active subscription.", 409);
    const origin = new URL(publicUrl(request)).origin;
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      client_reference_id: DESK_ID,
      subscription_data: { metadata: { desk_id: DESK_ID } },
      metadata: { desk_id: DESK_ID },
      success_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=1`,
    });
    return Response.json({ url: session.url });
  });
}
