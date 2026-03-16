"use server";

import { decideApproval } from "@/lib/platform";

export async function decide(approvalId: string, decision: "approved" | "denied") {
  return decideApproval(approvalId, decision);
}
