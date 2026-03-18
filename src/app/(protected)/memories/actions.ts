"use server";

const MEMORY_FABRIC = process.env.MEMORY_FABRIC_URL ?? "http://localhost:3007";

export async function deleteMemory(memoryId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${MEMORY_FABRIC}/memories/${memoryId}`, { method: "DELETE" });
  return { ok: res.ok };
}

export async function updateMemory(
  memoryId: string,
  content: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${MEMORY_FABRIC}/memories/${memoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return { ok: res.ok };
}

export async function addGoal(
  actorId: string,
  text: string,
): Promise<{ ok: boolean; memoryId?: string }> {
  const res = await fetch(`${MEMORY_FABRIC}/memories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actorId,
      memoryType: "goal",
      content: { text },
      confidence: 1.0,
    }),
  });
  if (!res.ok) return { ok: false };
  const data = (await res.json()) as { memory_id?: string };
  return { ok: true, memoryId: data.memory_id };
}
