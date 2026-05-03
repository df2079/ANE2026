import { DEFAULT_SETTINGS } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAppDateTime } from "@/lib/utils";

export type AppSettings = {
  voting_start_at: string | null;
  voting_end_at: string | null;
  voting_opened_at: string | null;
  voting_closed_at: string | null;
  results_revealed_at: string | null;
};

export type VotingLifecyclePhase = "before" | "open" | "closed";
export type AdminLifecycleState = "before" | "open" | "closed";

export type VotingLifecycle = {
  phase: VotingLifecyclePhase;
  adminState: AdminLifecycleState;
  isLive: boolean;
  isClosed: boolean;
  canStart: boolean;
  canEnd: boolean;
};

export async function getAppSettings(): Promise<AppSettings> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("admin_settings").select("key, value");

  if (error) {
    throw error;
  }

  const merged = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const row of data) {
    merged[row.key] = row.value;
  }

  return merged as AppSettings;
}

export async function upsertSettings(values: Partial<AppSettings>) {
  const supabase = createSupabaseAdminClient();
  const entries = Object.entries(values);
  const keysToClear = entries.filter(([, value]) => value === null).map(([key]) => key);
  const rows = entries
    .filter(([, value]) => value !== null)
    .map(([key, value]) => ({
      key,
      value
    }));

  if (keysToClear.length) {
    const { error: deleteError } = await supabase.from("admin_settings").delete().in("key", keysToClear);
    if (deleteError) {
      throw deleteError;
    }
  }

  if (rows.length) {
    const { error } = await supabase.from("admin_settings").upsert(rows);
    if (error) {
      throw error;
    }
  }
}

export function getVotingLifecycle(settings: AppSettings, now = new Date()): VotingLifecycle {
  const nowMs = now.getTime();
  const startsAtMs = parseAppDateTime(settings.voting_start_at)?.getTime() ?? null;
  const endsAtMs = parseAppDateTime(settings.voting_end_at)?.getTime() ?? null;
  const openedAtMs = parseAppDateTime(settings.voting_opened_at)?.getTime() ?? null;
  const closedAtMs = parseAppDateTime(settings.voting_closed_at)?.getTime() ?? null;

  const hasManualOpen = openedAtMs !== null && (closedAtMs === null || openedAtMs > closedAtMs);
  const beforeStart = !hasManualOpen && startsAtMs !== null && nowMs < startsAtMs;
  const afterEnd = endsAtMs !== null && nowMs > endsAtMs && (openedAtMs === null || openedAtMs <= endsAtMs);
  const manuallyClosed = closedAtMs !== null && (openedAtMs === null || closedAtMs >= openedAtMs);

  const phase: VotingLifecyclePhase = manuallyClosed || afterEnd ? "closed" : beforeStart ? "before" : "open";
  const adminState: AdminLifecycleState = phase;

  return {
    phase,
    adminState,
    isLive: phase === "open",
    isClosed: phase === "closed",
    canStart: phase !== "open",
    canEnd: phase === "open"
  };
}
