"use server";

import { interact, decideApproval, listEvents } from "@/lib/platform";

interface SendMessageArgs {
  actorId: string;
  input: string;
  sessionId?: string;
}

export interface ProposedIntent {
  intentId?: string;
  action: string;
  parameters?: Record<string, unknown>;
  rationale?: string;
  sensitiveAction?: boolean;
  /** Set after approval flow creates a request */
  approvalId?: string;
}

export interface SendMessageResult {
  text: string;
  sessionId?: string;
  eventId?: string;
  workflowId?: string;
  proposedIntents?: ProposedIntent[];
}

/**
 * Send a message through the full governed actor interaction flow.
 */
export async function sendMessage(args: SendMessageArgs): Promise<SendMessageResult> {
  try {
    const result = await interact(args.actorId, args.input, args.sessionId);
    return {
      text: result.text,
      sessionId: result.workflowId,
      eventId: result.eventId,
      workflowId: result.workflowId,
      proposedIntents: result.proposedIntents as ProposedIntent[] | undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      text: `Sorry, I couldn't process that right now. (${message})`,
    };
  }
}

/**
 * Load previous chat messages from event-store.
 * Reconstructs user/assistant message pairs from interaction events.
 */
export async function loadChatHistory(
  actorId: string,
  limit = 20,
): Promise<Array<{ role: "user" | "assistant"; content: string; timestamp: string }>> {
  try {
    const events = await listEvents(actorId, limit);
    const interactions = events
      .filter((e) => e.event_type === "interaction")
      .reverse(); // oldest first

    const messages: Array<{ role: "user" | "assistant"; content: string; timestamp: string }> = [];
    for (const event of interactions) {
      const payload = event.payload as Record<string, unknown>;
      const input = payload.input as string | undefined;
      const output = payload.output as Record<string, unknown> | undefined;

      if (input) {
        messages.push({ role: "user", content: input, timestamp: event.created_at });
      }
      if (output?.text) {
        messages.push({ role: "assistant", content: output.text as string, timestamp: event.created_at });
      }
    }
    return messages;
  } catch {
    return [];
  }
}

/**
 * Approve or deny a proposed action from within the chat.
 */
export async function decideIntent(
  approvalId: string,
  decision: "approved" | "denied",
): Promise<{ ok: boolean; error?: string }> {
  return decideApproval(approvalId, decision);
}
