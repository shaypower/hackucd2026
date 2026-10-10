// POST /api/billing/cancel: cancels the sandbox subscription now (to re-run the purchase demo).
import { apiError, handleErrors } from "@/lib/api/respond";
import { getSubscription, stripe, syncSubscription } from "@/lib/billing/stripe";

export async function POST() {
  return handleErrors(async () => {
    const { stripe_subscription_id } = await getSubscription();
    if (!stripe_subscription_id) return apiError("conflict", "No subscription to cancel.", 409);
    const sub = await stripe().subscriptions.cancel(stripe_subscription_id);
    await syncSubscription(sub);
    return Response.json({ status: "canceled" });
  });
}
