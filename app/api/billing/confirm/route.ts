// POST /api/billing/confirm { session_id } -> payment details. Confirms the purchase directly with Stripe
// when the customer lands back on /billing (the webhook does the same; whichever arrives first wins).
import { apiError, handleErrors, readJson } from "@/lib/api/respond";
import { DESK_ID } from "@/lib/billing/plan";
import { stripe, syncSubscription } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const body = (await readJson(request)) as { session_id?: unknown } | undefined;
  const sessionId = typeof body?.session_id === "string" ? body.session_id : "";
  if (!/^cs_test_[A-Za-z0-9]+$/.test(sessionId)) return apiError("bad_request", "Invalid checkout session.", 400);

  return handleErrors(async () => {
    const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription", "invoice"] });
    if (session.client_reference_id !== DESK_ID) return apiError("not_found", "Checkout session not found.", 404);
    if (session.status !== "complete" || session.payment_status !== "paid" || typeof session.subscription !== "object" || !session.subscription) {
      return apiError("conflict", "Payment hasn't completed yet.", 409);
    }
    await syncSubscription(session.subscription, DESK_ID);
    const invoice = typeof session.invoice === "object" ? session.invoice : null;
    return Response.json({
      subscription_id: session.subscription.id,
      subscription_status: session.subscription.status,
      amount_paid: invoice?.amount_paid ?? session.amount_total,
      currency: session.currency,
      invoice_id: invoice?.id ?? null,
      customer_email: session.customer_details?.email ?? null,
    });
  });
}
