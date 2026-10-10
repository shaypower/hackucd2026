// GET /api/billing -> the desk's subscription (drives the Billing page and the approval gate in the UI)
import { handleErrors } from "@/lib/api/respond";
import { billingConfigured, getSubscription } from "@/lib/billing/stripe";

export async function GET() {
  return handleErrors(async () => {
    const { stripe_subscription_id, ...sub } = await getSubscription();
    return Response.json({ ...sub, has_stripe_subscription: Boolean(stripe_subscription_id), configured: billingConfigured() });
  });
}
