/**
 * Human-readable action name mapping.
 *
 * Maps dot-notation platform action names to user-friendly labels,
 * descriptions, and visual metadata. Used throughout the UI wherever
 * actions are displayed to users (chat intents, approvals, inbox, dashboard).
 */

export interface ActionMeta {
  label: string;
  description: string;
  icon: string;
  /** Suggested prompt text if the user wants to trigger this action from chat */
  suggestedPrompt?: string;
  /** Sensitivity badge color */
  sensitivityColor: "green" | "amber" | "red";
}

const ACTION_MAP: Record<string, ActionMeta> = {
  // Schedule actions
  "schedule.event.create": {
    label: "Create calendar event",
    description: "Add a new event to your calendar",
    icon: "📅",
    suggestedPrompt: "Schedule a meeting for tomorrow at 2pm",
    sensitivityColor: "green",
  },
  "schedule.event.list": {
    label: "View calendar events",
    description: "See your upcoming events",
    icon: "📋",
    suggestedPrompt: "What's on my calendar this week?",
    sensitivityColor: "green",
  },
  "schedule.event.cancel": {
    label: "Cancel calendar event",
    description: "Remove an event from your calendar",
    icon: "🚫",
    suggestedPrompt: "Cancel my 3pm meeting",
    sensitivityColor: "amber",
  },
  "schedule.conflict.check": {
    label: "Check schedule conflicts",
    description: "See if a time slot overlaps with existing events",
    icon: "⚡",
    suggestedPrompt: "Do I have any conflicts on Friday?",
    sensitivityColor: "green",
  },
  "schedule.availability.find": {
    label: "Find free time",
    description: "Search for an available slot in your calendar",
    icon: "🔍",
    suggestedPrompt: "Find me a free 90-minute slot next Tuesday",
    sensitivityColor: "green",
  },

  // Wishlist actions
  "wishlist.create": {
    label: "Create wishlist",
    description: "Start a new named wishlist",
    icon: "✨",
    suggestedPrompt: "Create a wishlist called Birthday Ideas",
    sensitivityColor: "green",
  },
  "wishlist.item.add": {
    label: "Add to wishlist",
    description: "Add an item to one of your wishlists",
    icon: "➕",
    suggestedPrompt: "Add new headphones to my wishlist",
    sensitivityColor: "green",
  },
  "wishlist.item.remove": {
    label: "Remove from wishlist",
    description: "Remove an item from a wishlist",
    icon: "🗑️",
    sensitivityColor: "green",
  },
  "wishlist.item.list": {
    label: "View wishlist",
    description: "See all items on a wishlist",
    icon: "📝",
    suggestedPrompt: "Show my wishlist",
    sensitivityColor: "green",
  },
  "wishlist.item.purchase": {
    label: "Purchase wishlist item",
    description: "Buy an item from your wishlist",
    icon: "💳",
    suggestedPrompt: "Purchase the headphones from my wishlist",
    sensitivityColor: "red",
  },
  "wishlist.share": {
    label: "Share wishlist",
    description: "Share a wishlist with family or friends",
    icon: "🔗",
    suggestedPrompt: "Share my holiday wishlist with my family",
    sensitivityColor: "green",
  },
};

const DEFAULT_META: ActionMeta = {
  label: "Action",
  description: "Platform action",
  icon: "⚙️",
  sensitivityColor: "amber",
};

/**
 * Get human-readable metadata for a platform action.
 * Falls back to a formatted version of the dot-notation name if unknown.
 */
export function getActionMeta(action: string): ActionMeta {
  if (ACTION_MAP[action]) return ACTION_MAP[action];

  // Generate a reasonable label from the dot-notation: "schedule.event.create" → "Schedule event create"
  const parts = action.split(".");
  const label = parts
    .map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(" ");

  return { ...DEFAULT_META, label };
}

/**
 * Get all actions that have suggested prompts (for chat suggestion chips).
 */
export function getSuggestedActions(): Array<ActionMeta & { action: string }> {
  return Object.entries(ACTION_MAP)
    .filter(([, meta]) => meta.suggestedPrompt)
    .map(([action, meta]) => ({ action, ...meta }));
}

/**
 * Sensitivity level to ActionMeta color mapping.
 */
export function sensitivityToColor(level: string): "green" | "amber" | "red" {
  switch (level) {
    case "low": return "green";
    case "medium": return "amber";
    case "high": return "red";
    default: return "amber";
  }
}
