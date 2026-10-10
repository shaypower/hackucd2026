// Props contract for billing components. Owner: Dev A; change only by adding optional props.
import type { Subscription, UiError } from "@/lib/types";

export interface SubscribeCardProps {
  subscription: Subscription;
  priceLabel: string; // e.g. "€49 / month per desk"
  features: string[];
  pending: boolean; // redirecting to Stripe Checkout
  error: UiError | null;
  onSubscribe: () => void;
}
