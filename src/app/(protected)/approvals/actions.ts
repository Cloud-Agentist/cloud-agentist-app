"use server";

import { decideApproval } from "@/lib/platform";

export async function decide(approvalId: string, decision: "approved" | "denied", decidedBy?: string) {
  return decideApproval(approvalId, decision, decidedBy);
}
