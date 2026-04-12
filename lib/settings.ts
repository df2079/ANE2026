import { DEFAULT_SETTINGS } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AppSettings = {
  voting_start_at: string | null;
  voting_end_at: string | null;
  results_revealed_at: string | null;
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
