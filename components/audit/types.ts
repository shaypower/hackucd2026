// Props contract for the audit trail. Owner: Dev A; change only by adding optional props.
import type { AuditEvent } from "@/lib/types";

export interface AuditTrailProps {
  events: AuditEvent[]; // oldest first
}
