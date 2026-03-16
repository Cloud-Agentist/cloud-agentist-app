"use server";

import { reason } from "@/lib/platform";

interface SendMessageArgs {
  actorId: string;
  input: string;
  sessionId?: string;
}

interface SendMessageResult {
  text: string;
  sessionId?: string;
  proposedIntents?: unknown[];
}

export async function sendMessage(args: SendMessageArgs): Promise<SendMessageResult> {
  try {
    const result = await reason(args.actorId, args.input, args.sessionId);
    return {
      text: result.text,
      sessionId: result.sessionId,
      proposedIntents: result.proposedIntents,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      text: `Sorry, I couldn't reach the platform right now. (${message})`,
    };
  }
}
