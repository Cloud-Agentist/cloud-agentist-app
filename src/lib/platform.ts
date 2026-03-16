/**
 * Platform API client
 *
 * Thin wrappers around the Cloud Agentist platform services.
 * All calls run server-side (Next.js Server Components / Route Handlers).
 * Raw credentials and internal service URLs never reach the browser.
 */

const ACTOR_REGISTRY = process.env.ACTOR_REGISTRY_URL ?? "http://localhost:3002";
const APPROVAL_SERVICE = process.env.APPROVAL_SERVICE_URL ?? "http://localhost:3006";
const MEMORY_FABRIC = process.env.MEMORY_FABRIC_URL ?? "http://localhost:3007";
const EVENT_STORE = process.env.EVENT_STORE_URL ?? "http://localhost:3003";
const COGNITION_GATEWAY = process.env.COGNITION_GATEWAY_URL ?? "http://localhost:3000";

// ── Actor registry ────────────────────────────────────────────────────────────

export interface Actor {
  actor_id: string;
  actor_type: string;
  display_name: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

/**
 * Find or create the platform actor for this Auth0 user.
 * Uses external_id = Auth0 sub to ensure idempotency.
 */
export async function ensureActor(auth0Sub: string, displayName: string): Promise<Actor> {
  // Try to find existing actor by external_id
  const listRes = await fetch(`${ACTOR_REGISTRY}/actors?externalId=${encodeURIComponent(auth0Sub)}`);
  if (listRes.ok) {
    const data = (await listRes.json()) as { actors?: Actor[] };
    if (data.actors && data.actors.length > 0) {
      return data.actors[0];
    }
  }

  // Create new actor
  const createRes = await fetch(`${ACTOR_REGISTRY}/actors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actorType: "human",
      displayName,
      externalId: auth0Sub,
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Failed to create actor: ${createRes.status}`);
  }
  return createRes.json() as Promise<Actor>;
}

export async function getActor(actorId: string): Promise<Actor | null> {
  const res = await fetch(`${ACTOR_REGISTRY}/actors/${actorId}`);
  if (!res.ok) return null;
  return res.json() as Promise<Actor>;
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export interface ApprovalRequest {
  approval_id: string;
  actor_id: string;
  action: string;
  parameters?: Record<string, unknown>;
  rationale?: string;
  status: "pending" | "approved" | "denied";
  workflow_id?: string;
  created_at: string;
  decided_at?: string;
}

export async function listPendingApprovals(actorId: string): Promise<ApprovalRequest[]> {
  const res = await fetch(
    `${APPROVAL_SERVICE}/approvals?actorId=${encodeURIComponent(actorId)}&status=pending`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { approvals?: ApprovalRequest[] };
  return data.approvals ?? [];
}

export async function decideApproval(
  approvalId: string,
  decision: "approved" | "denied",
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${APPROVAL_SERVICE}/approvals/${approvalId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: body || `status ${res.status}` };
  }
  return { ok: true };
}

// ── Memory fabric ─────────────────────────────────────────────────────────────

export interface Memory {
  memory_id: string;
  actor_id: string;
  memory_type: string;
  content: Record<string, unknown>;
  confidence?: number;
  created_at: string;
}

export async function listMemories(actorId: string, limit = 20): Promise<Memory[]> {
  const res = await fetch(
    `${MEMORY_FABRIC}/memories?actorId=${encodeURIComponent(actorId)}&limit=${limit}`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { memories?: Memory[] };
  return data.memories ?? [];
}

// ── Event store ───────────────────────────────────────────────────────────────

export interface ActorEvent {
  event_id: string;
  actor_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export async function listEvents(actorId: string, limit = 30): Promise<ActorEvent[]> {
  const res = await fetch(
    `${EVENT_STORE}/events?actorId=${encodeURIComponent(actorId)}&limit=${limit}`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { events?: ActorEvent[] };
  return data.events ?? [];
}

// ── Cognition gateway ─────────────────────────────────────────────────────────

export interface ReasoningResult {
  text: string;
  sessionId?: string;
  proposedIntents?: unknown[];
  providerMetadata?: Record<string, unknown>;
}

export async function reason(
  actorId: string,
  input: string,
  sessionId?: string,
): Promise<ReasoningResult> {
  const res = await fetch(`${COGNITION_GATEWAY}/v1/reasoning`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorId, input, mode: "ask", sessionId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gateway error ${res.status}: ${body}`);
  }
  return res.json() as Promise<ReasoningResult>;
}
