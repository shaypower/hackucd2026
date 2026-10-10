// Live counts from the audit trail. Server component; render inside <Suspense>.
import { connection } from "next/server";
import { DeskCounts } from "@/components/landing/landing-blocks";
import { getDeskStats } from "@/lib/db/trades";

export async function DeskStatsCards() {
  await connection();
  return <DeskCounts stats={await getDeskStats()} />;
}
