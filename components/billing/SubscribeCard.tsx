// v1 (Dev A): functional, lightly styled. Dev B owns the look from here; keep the props contract.
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscribeCardProps } from "@/components/billing/types";

export function SubscribeCard({ subscription, priceLabel, features, pending, error, onSubscribe }: SubscribeCardProps) {
  const active = subscription.status === "active";
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          TelDeal Desk
          {active ? <Badge className="bg-emerald-600 text-white">Active</Badge> : <Badge variant="outline">{subscription.status === "canceled" ? "Canceled" : "Not subscribed"}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-2xl font-semibold">{priceLabel}</p>
        <ul className="flex flex-col gap-1 text-sm">
          {features.map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>
        {active ? (
          <p className="text-sm text-muted-foreground">
            Approval and Payments export are unlocked
            {subscription.current_period_end && ` until ${new Date(subscription.current_period_end).toLocaleDateString("en-IE", { dateStyle: "medium" })}`}.
          </p>
        ) : (
          <div>
            <Button size="lg" disabled={pending} onClick={onSubscribe}>
              {pending ? "Opening Stripe Checkout…" : "Subscribe"}
            </Button>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
