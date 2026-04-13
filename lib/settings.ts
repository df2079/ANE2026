import { DEFAULT_SETTINGS } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AppSettings = {
  voting_start_at: string | null;
  voting_end_at: string | null;
  voting_opened_at: string | null;
  voting_closed_at: string | null;
  results_revealed_at: string | null;
};

export type VotingLifecyclePhase = "before" | "open" | "closed";

export type VotingLifecycle = {
  phase: VotingLifecyclePhase;
  published: boolean;
  isLive: boolean;
  isClosed: boolean;
  canPublish: boolean;
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
  const startsAtMs = settings.voting_start_at ? new Date(settings.voting_start_at).getTime() : null;
  const endsAtMs = settings.voting_end_at ? new Date(settings.voting_end_at).getTime() : null;
  const openedAtMs = settings.voting_opened_at ? new Date(settings.voting_opened_at).getTime() : null;
  const closedAtMs = settings.voting_closed_at ? new Date(settings.voting_closed_at).getTime() : null;

  const beforeStart = openedAtMs === null && startsAtMs !== null && nowMs < startsAtMs;
  const afterEnd = endsAtMs !== null && nowMs > endsAtMs;
  const manuallyClosed = closedAtMs !== null;
  const published = Boolean(settings.results_revealed_at);

  const phase: VotingLifecyclePhase = manuallyClosed || afterEnd ? "closed" : beforeStart ? "before" : "open";

  return {
    phase,
    published,
    isLive: phase === "open",
    isClosed: phase === "closed",
    canPublish: phase === "closed" && !published
  };
}
