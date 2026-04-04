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
  if (createRes.ok) {
    return createRes.json() as Promise<Actor>;
  }

  // Race condition: another request created the actor between our lookup and create.
  // Re-fetch by external_id.
  const retryRes = await fetch(`${ACTOR_REGISTRY}/actors?externalId=${encodeURIComponent(auth0Sub)}`);
  if (retryRes.ok) {
    const retryData = (await retryRes.json()) as { actors?: Actor[] };
    if (retryData.actors && retryData.actors.length > 0) {
      return retryData.actors[0];
    }
  }
  throw new Error(`Failed to create actor: ${createRes.status}`);
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

export async function listRecentApprovals(actorId: string, limit = 10): Promise<ApprovalRequest[]> {
  try {
    const res = await fetch(
      `${APPROVAL_SERVICE}/approvals?actorId=${encodeURIComponent(actorId)}&limit=${limit}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { approvals?: ApprovalRequest[] };
    return (data.approvals ?? []).filter((a) => a.status !== "pending");
  } catch { return []; }
}

export async function decideApproval(
  approvalId: string,
  decision: "approved" | "denied",
  decidedBy?: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${APPROVAL_SERVICE}/approvals/${approvalId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, decidedBy: decidedBy ?? "human-user" }),
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
  // API returns camelCase; support both for safety
  event_id?: string;
  eventId?: string;
  actor_id?: string;
  actorId?: string;
  event_type?: string;
  eventType?: string;
  payload: Record<string, unknown>;
  created_at?: string;
  occurredAt?: string;
}

export async function listEvents(actorId: string, limit = 30): Promise<ActorEvent[]> {
  const res = await fetch(
    `${EVENT_STORE}/events?actorId=${encodeURIComponent(actorId)}&limit=${limit}`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { events?: ActorEvent[] };
  return data.events ?? [];
}

// ── Intent orchestration (for inbox) ─────────────────────────────────────────

const INTENT_ORCHESTRATION = process.env.INTENT_ORCHESTRATION_URL ?? "http://localhost:3013";

export interface ActorIntent {
  intentId: string;
  actorId: string;
  action: string;
  rationale?: string;
  status: "pending" | "dispatched" | "completed" | "cancelled";
  createdAt: string;
}

export async function listPendingIntents(actorId: string, limit = 20): Promise<ActorIntent[]> {
  try {
    const res = await fetch(
      `${INTENT_ORCHESTRATION}/intents?actorId=${encodeURIComponent(actorId)}&status=pending&limit=${limit}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { intents?: ActorIntent[] };
    return data.intents ?? [];
  } catch { return []; }
}

// ── Financial summary (for dashboard) ────────────────────────────────────────

const DOMAIN_FINANCE = process.env.DOMAIN_FINANCE_URL ?? "http://localhost:3024";

export interface FinancialAccount {
  account_id: string;
  name: string;
  currency: string;
  account_type: string;
}

export interface SpendingSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  breakdown: Array<{ category: string; entry_type: string; total: string; count: string }>;
}

export async function listFinancialAccounts(actorId: string): Promise<FinancialAccount[]> {
  try {
    const res = await fetch(
      `${DOMAIN_FINANCE}/accounts?actorId=${encodeURIComponent(actorId)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { accounts?: FinancialAccount[] };
    return data.accounts ?? [];
  } catch { return []; }
}

export async function getSpendingSummary(accountId: string): Promise<SpendingSummary | null> {
  try {
    const res = await fetch(`${DOMAIN_FINANCE}/accounts/${accountId}/summary`);
    if (!res.ok) return null;
    return res.json() as Promise<SpendingSummary>;
  } catch { return null; }
}

// ── Capability registry ──────────────────────────────────────────────────────

const CAPABILITY_REGISTRY = process.env.CAPABILITY_REGISTRY_URL ?? "http://localhost:3010";

export interface Capability {
  action: string;
  displayName?: string;
  description?: string;
  sensitivityLevel: string;
  providerName: string;
}

export async function listCapabilities(): Promise<Capability[]> {
  try {
    const res = await fetch(`${CAPABILITY_REGISTRY}/capabilities`);
    if (!res.ok) return [];
    const data = (await res.json()) as { capabilities?: Capability[] };
    return data.capabilities ?? [];
  } catch {
    return [];
  }
}

// ── Actor interaction (governed flow via Temporal) ───────────────────────────

const ACTOR_RUNTIME = process.env.ACTOR_RUNTIME_URL ?? "http://localhost:3004";

export interface InteractionResult {
  text: string;
  eventId: string;
  workflowId?: string;
  proposedIntents?: unknown[];
}

/**
 * Send a message through the full governed actor interaction flow.
 *
 * Flow: actor-runtime → Temporal workflow → cognition-gateway → provider
 *       → per-intent authority evaluation → approval if needed → action-bus dispatch
 *
 * This is the PRIMARY interaction path. For quick queries where governance
 * overhead is not needed, use reasonDirect().
 */
export async function interact(
  actorId: string,
  input: string,
  sessionId?: string,
): Promise<InteractionResult> {
  const res = await fetch(`${ACTOR_RUNTIME}/actors/${encodeURIComponent(actorId)}/interact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, sessionId }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Fall back to direct gateway call if actor-runtime or Temporal is unavailable
    if (res.status === 502 || res.status === 503 || res.status >= 500) {
      return reasonDirect(actorId, input, sessionId);
    }
    throw new Error(`Actor runtime error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    result?: { text?: string; eventId?: string };
    workflowId?: string;
  };

  return {
    text: data.result?.text ?? "",
    eventId: data.result?.eventId ?? "",
    workflowId: data.workflowId,
  };
}

/**
 * Start an async interaction that may require approval.
 * Returns a workflowId for polling.
 */
export async function interactAsync(
  actorId: string,
  input: string,
  sessionId?: string,
): Promise<{ workflowId: string }> {
  const res = await fetch(
    `${ACTOR_RUNTIME}/actors/${encodeURIComponent(actorId)}/interact/async`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, sessionId }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Actor runtime error ${res.status}: ${body}`);
  }
  return res.json() as Promise<{ workflowId: string }>;
}

/**
 * Poll a workflow for completion.
 */
export async function getWorkflowStatus(
  workflowId: string,
): Promise<{ status: string; result?: { text?: string; eventId?: string } }> {
  const res = await fetch(`${ACTOR_RUNTIME}/workflows/${encodeURIComponent(workflowId)}`);
  if (!res.ok) throw new Error(`Workflow poll error ${res.status}`);
  return res.json() as Promise<{ status: string; result?: { text?: string; eventId?: string } }>;
}

// ── Direct gateway call (fallback, bypasses governance) ──────────────────────

const COGNITION_GATEWAY = process.env.COGNITION_GATEWAY_URL ?? "http://localhost:3000";
const PERCEPTION_BUS = process.env.PERCEPTION_BUS_URL ?? "http://localhost:3022";

export interface ReasoningResult {
  text: string;
  sessionId?: string;
  proposedIntents?: unknown[];
  providerMetadata?: Record<string, unknown>;
}

/**
 * Fetch perception frame from perception-bus (non-fatal if unavailable).
 */
async function fetchPerceptionFrame(actorId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${PERCEPTION_BUS}/perceive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { frame?: Record<string, unknown> };
    return data.frame ?? null;
  } catch {
    return null;
  }
}

/**
 * Log a direct interaction to event-store and memory-fabric (non-fatal).
 * Mirrors what the Temporal workflow does in appendEvent + storeInteractionMemory.
 */
async function logDirectInteraction(
  actorId: string,
  input: string,
  responseText: string,
  sessionId?: string,
): Promise<string> {
  let eventId = "";

  // Log to event-store
  try {
    const res = await fetch(`${EVENT_STORE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId,
        eventType: "interaction",
        payload: { input, response: responseText, sessionId, path: "direct" },
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { eventId?: string };
      eventId = data.eventId ?? "";
    }
  } catch {
    // Non-fatal — don't break the chat if logging fails
  }

  // Store as memory in memory-fabric
  try {
    await fetch(`${MEMORY_FABRIC}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId,
        memoryType: "experience",
        content: { text: `User said: "${input}" — I responded: "${responseText.slice(0, 500)}"` },
        confidence: 0.8,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Non-fatal
  }

  return eventId;
}

/**
 * Direct call to cognition-gateway, bypassing Temporal governance.
 * Used as fallback when actor-runtime is unavailable.
 * Includes perception context if perception-bus is available.
 * Logs the interaction to event-store + memory-fabric.
 */
export async function reasonDirect(
  actorId: string,
  input: string,
  sessionId?: string,
): Promise<InteractionResult> {
  // Fetch perception context (non-fatal)
  const perceptionFrame = await fetchPerceptionFrame(actorId);

  const body: Record<string, unknown> = { actorId, input, mode: "ask", sessionId };
  if (perceptionFrame) {
    body.perceptionFrame = perceptionFrame;
  }

  const res = await fetch(`${COGNITION_GATEWAY}/v1/reasoning`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gateway error ${res.status}: ${errBody}`);
  }
  const data = (await res.json()) as ReasoningResult;

  // Log the interaction (non-fatal — don't block the response)
  const eventId = await logDirectInteraction(actorId, input, data.text, sessionId);

  return {
    text: data.text,
    eventId,
    proposedIntents: data.proposedIntents,
  };
}
