// POST /api/stripe/webhook: Stripe's signed notifications. This is how the product recognises a purchase.
import type Stripe from "stripe";
import { stripe, syncSubscription } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch (error) {
    console.warn("Rejected Stripe webhook:", (error as Error).message);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.payment_status === "paid" && typeof session.subscription === "string") {
          await syncSubscription(await stripe().subscriptions.retrieve(session.subscription), session.client_reference_id ?? undefined);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      default:
        break; // other events are acknowledged and ignored
    }
  } catch (error) {
    console.error("Stripe webhook handling failed:", event.type, error);
    return new Response("Handler error", { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}
