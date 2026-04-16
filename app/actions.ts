"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAllowedAdminEmails, isAllowedAdminEmail, requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { Json } from "@/lib/types";
import { normalizeEmail, normalizeWhitespace, slugify, toStoredDateTime } from "@/lib/utils";
import { getIpHash } from "@/lib/ip";
import { syncWorkbookImport } from "@/lib/importer";
import { getAppSettings, getVotingLifecycle, upsertSettings } from "@/lib/settings";
import { getResultsData } from "@/lib/data";
import {
  clearCurrentVoterCookie,
  createDeviceToken,
  getCurrentVoter,
  getDeviceCookie,
  setCurrentVoterCookie,
  setDeviceCookie
} from "@/lib/data";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

async function logVoteAttempt(params: {
  action: string;
  voterId?: string | null;
  categoryId?: string | null;
  ipHash?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("vote_attempt_logs").insert({
    action: params.action,
    voter_id: params.voterId ?? null,
    category_id: params.categoryId ?? null,
    ip_hash: params.ipHash ?? null,
    metadata: (params.metadata ?? null) as Json
  });
}

async function logAdminAudit(action: string, actorEmail: string | null, metadata?: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("admin_audit_logs").insert({
    action,
    actor_email: actorEmail,
    metadata: (metadata ?? null) as Json
  });
}

function redirectVoteError(categoryId: string, error: string): never {
  redirect(`/vote/${categoryId}?error=${encodeURIComponent(error)}`);
}

async function getLatestUploadedImportLog(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await supabase
    .from("import_logs")
    .select("id, filename, storage_path, created_at, status")
    .not("storage_path", "is", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function adminLoginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect("/admin/login?error=invalid-form");
  }

  const normalizedRequestedEmail = normalizeEmail(parsed.data.email);
  const allowedEmails = getAllowedAdminEmails();

  if (!allowedEmails.includes(normalizedRequestedEmail)) {
    redirect("/admin/login?error=not-allowed");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedRequestedEmail,
    password: parsed.data.password
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("invalid login credentials")) {
      redirect("/admin/login?error=invalid-credentials");
    }

    if (message.includes("email not confirmed")) {
      redirect("/admin/login?error=email-not-confirmed");
    }

    if (message.includes("email logins are disabled") || message.includes("password sign")) {
      redirect("/admin/login?error=password-provider-disabled");
    }

    redirect("/admin/login?error=auth-failed");
  }

  if (!data.user || !isAllowedAdminEmail(data.user.email)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not-allowed");
  }

  redirect("/admin");
}

export async function adminLogoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function uploadWorkbookAction(formData: FormData) {
  const user = await requireAdminUser();
  const file = formData.get("workbook");

  if (!(file instanceof File)) {
    throw new Error("Workbook file is required.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `imports/${Date.now()}-${slugify(file.name) || "workbook"}.xlsx`;
  const supabase = createSupabaseAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: importLogError } = await supabase.from("import_logs").insert({
    filename: file.name,
    storage_path: storagePath,
    status: "uploaded",
    created_by: user.id
  });

  if (importLogError) {
    throw importLogError;
  }

  await logAdminAudit("workbook_uploaded", user.email ?? null, {
    filename: file.name,
    storagePath
  });

  revalidatePath("/admin");
  revalidatePath("/admin/imports");
}

export async function syncLatestWorkbookAction() {
  const user = await requireAdminUser();
  const supabase = createSupabaseAdminClient();
  const settings = await getAppSettings();

  if (getVotingLifecycle(settings).isLive) {
    redirect("/admin/imports?error=voting-open");
  }

  const latestImport = await getLatestUploadedImportLog(supabase);
  if (!latestImport?.storage_path) {
    redirect("/admin/imports?error=no-uploaded-workbook");
  }

  const { data: fileBuffer, error: downloadError } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .download(latestImport.storage_path);

  if (downloadError) {
    throw downloadError;
  }

  const buffer = Buffer.from(await fileBuffer.arrayBuffer());
  try {
    const summary = await syncWorkbookImport(latestImport.id, buffer);

    await logAdminAudit("workbook_synced", user.email ?? null, {
      importLogId: latestImport.id,
      filename: latestImport.filename,
      summary
    });

    revalidatePath("/admin");
    revalidatePath("/admin/imports");
    revalidatePath("/admin/results");
    revalidatePath("/");
  } catch (error) {
    await logAdminAudit("workbook_sync_failed", user.email ?? null, {
      importLogId: latestImport.id,
      filename: latestImport.filename,
      message: error instanceof Error ? error.message : "Unknown sync error"
    });
    revalidatePath("/admin");
    revalidatePath("/admin/imports");
    redirect("/admin/imports?error=sync-failed");
  }
}

export async function clearImportHistoryAction() {
  const user = await requireAdminUser();
  const supabase = createSupabaseAdminClient();

  try {
    const { error } = await supabase
      .from("import_logs")
      .delete()
      .not("id", "is", null);

    if (error) {
      throw error;
    }
  } catch (error) {
    try {
      await logAdminAudit("import_history_clear_failed", user.email ?? null, {
        message: error instanceof Error ? error.message : "Unknown clear-history error"
      });
    } catch {}
    redirect("/admin/imports?error=clear-failed");
  }

  try {
    await logAdminAudit("import_history_cleared", user.email ?? null);
  } catch {}

  revalidatePath("/admin");
  revalidatePath("/admin/imports");
  redirect("/admin/imports?success=history-cleared");
}

const settingsSchema = z.object({
  voting_start_at: z.string().nullable(),
  voting_end_at: z.string().nullable()
});

const testingVotingStateSchema = z.object({
  state: z.enum(["before", "live", "ended"])
});

export async function saveSettingsAction(formData: FormData) {
  const user = await requireAdminUser();

  const parsed = settingsSchema.parse({
    voting_start_at: normalizeWhitespace(String(formData.get("voting_start_at") ?? "")) || null,
    voting_end_at: normalizeWhitespace(String(formData.get("voting_end_at") ?? "")) || null
  });

  await upsertSettings({
    voting_start_at: toStoredDateTime(parsed.voting_start_at),
    voting_end_at: toStoredDateTime(parsed.voting_end_at)
  });
  await logAdminAudit("settings_updated", user.email ?? null, parsed);

  revalidatePath("/admin/settings");
  revalidatePath("/admin/imports");
  revalidatePath("/admin/results");
  revalidatePath("/");
  revalidatePath("/vote");
}

export async function simulateVotingStateAction(formData: FormData) {
  const user = await requireAdminUser();
  const parsed = testingVotingStateSchema.parse({
    state: formData.get("state")
  });

  const now = new Date();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  let values: {
    voting_start_at: string | null;
    voting_end_at: string | null;
    voting_opened_at: string | null;
    voting_closed_at: string | null;
  };

  if (parsed.state === "before") {
    values = {
      voting_start_at: new Date(now.getTime() + hour).toISOString(),
      voting_end_at: new Date(now.getTime() + 2 * day).toISOString(),
      voting_opened_at: null,
      voting_closed_at: null
    };
  } else if (parsed.state === "live") {
    values = {
      voting_start_at: new Date(now.getTime() - hour).toISOString(),
      voting_end_at: new Date(now.getTime() + hour).toISOString(),
      voting_opened_at: new Date().toISOString(),
      voting_closed_at: null
    };
  } else {
    values = {
      voting_start_at: new Date(now.getTime() - 2 * day).toISOString(),
      voting_end_at: new Date(now.getTime() - hour).toISOString(),
      voting_opened_at: null,
      voting_closed_at: null
    };
  }

  await upsertSettings(values);
  await logAdminAudit("testing_voting_state_applied", user.email ?? null, {
    state: parsed.state,
    ...values
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/imports");
  revalidatePath("/admin/results");
  revalidatePath("/");
  revalidatePath("/vote");
  redirect(`/admin/settings?success=testing-${parsed.state}`);
}

export async function resetEventDataAction() {
  const user = await requireAdminUser();
  const supabase = createSupabaseAdminClient();

  try {
    const { data: importFiles, error: importFilesError } = await supabase
      .from("import_logs")
      .select("storage_path")
      .not("storage_path", "is", null);

    if (importFilesError) {
      throw importFilesError;
    }

    const storagePaths = (importFiles ?? [])
      .map((row) => row.storage_path)
      .filter((value): value is string => Boolean(value));

    if (storagePaths.length) {
      const { error: storageError } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove(storagePaths);
      if (storageError) {
        throw storageError;
      }
    }

    const deleteAll = async (table: string) => {
      const { error } = await supabase.from(table).delete().not("id", "is", null);
      if (error) {
        throw error;
      }
    };

    await deleteAll("vote_attempt_logs");
    await deleteAll("votes");
    await deleteAll("voters");
    await deleteAll("category_nominees");
    await deleteAll("perfumes");
    await deleteAll("brands");
    await deleteAll("import_logs");
    await upsertSettings({
      voting_start_at: null,
      voting_end_at: null,
      voting_opened_at: null,
      voting_closed_at: null,
      results_revealed_at: null
    });
  } catch (error) {
    try {
      await logAdminAudit("event_data_reset_failed", user.email ?? null, {
        message: error instanceof Error ? error.message : "Unknown reset error"
      });
    } catch {}
    redirect("/admin/settings?error=reset-failed");
  }

  try {
    await logAdminAudit("event_data_reset", user.email ?? null, {
      clearedStorageBucket: env.SUPABASE_STORAGE_BUCKET
    });
  } catch {}

  revalidatePath("/admin");
  revalidatePath("/admin/imports");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/results");
  revalidatePath("/");
  revalidatePath("/results");
  revalidatePath("/vote");
  redirect("/admin/settings?success=reset-all");
}

export async function closeVotingNowAction() {
  const user = await requireAdminUser();
  const settings = await getAppSettings();
  const lifecycle = getVotingLifecycle(settings);

  if (!lifecycle.isLive) {
    redirect("/admin/results?error=not-live");
  }

  const votingClosedAt = new Date().toISOString();
  await upsertSettings({ voting_closed_at: votingClosedAt });
  await logAdminAudit("voting_closed_manually", user.email ?? null, {
    votingClosedAt
  });

  revalidatePath("/");
  revalidatePath("/vote");
  revalidatePath("/admin/imports");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/results");
  redirect("/admin/results?success=voting-closed");
}

export async function startVotingNowAction() {
  const user = await requireAdminUser();
  const settings = await getAppSettings();
  const lifecycle = getVotingLifecycle(settings);

  if (!lifecycle.canStart) {
    redirect(`/admin/results?error=${lifecycle.published ? "published" : "not-startable"}`);
  }

  const votingOpenedAt = new Date().toISOString();
  await upsertSettings({
    voting_opened_at: votingOpenedAt,
    voting_closed_at: null
  });
  await logAdminAudit("voting_opened_manually", user.email ?? null, {
    votingOpenedAt
  });

  revalidatePath("/");
  revalidatePath("/vote");
  revalidatePath("/admin/imports");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/results");
  redirect("/admin/results?success=voting-opened");
}

export async function publishResultsAction() {
  const user = await requireAdminUser();
  const settings = await getAppSettings();
  const lifecycle = getVotingLifecycle(settings);

  if (!lifecycle.isClosed) {
    redirect("/admin/results?error=too-early");
  }

  const results = await getResultsData();
  if (results.hasUnresolvedPodiumTies) {
    redirect("/admin/results?error=unresolved-ties");
  }

  await upsertSettings({ results_revealed_at: new Date().toISOString() });
  await logAdminAudit("results_published", user.email ?? null, {
    votingEndAt: settings.voting_end_at
  });
  revalidatePath("/");
  revalidatePath("/results");
  revalidatePath("/vote");
  revalidatePath("/admin/results");
  redirect("/admin/results?success=results-published");
}

export async function unpublishResultsAction() {
  const user = await requireAdminUser();
  const settings = await getAppSettings();
  const lifecycle = getVotingLifecycle(settings);

  if (!lifecycle.canUnpublish) {
    redirect("/admin/results?error=not-published");
  }

  await upsertSettings({ results_revealed_at: null });
  await logAdminAudit("results_unpublished", user.email ?? null, {
    previouslyRevealedAt: settings.results_revealed_at
  });

  revalidatePath("/");
  revalidatePath("/results");
  revalidatePath("/vote");
  revalidatePath("/admin/results");
  redirect("/admin/results?success=results-unpublished");
}

const tieResolutionSchema = z.object({
  slot_keys: z.array(z.string().min(1)).min(1),
  allowed_nominees: z.record(z.string().min(1), z.array(z.string().min(1)).min(2)),
  selections: z.record(z.string().min(1), z.string().min(1))
});

function parseNomineeKey(nomineeKey: string) {
  if (nomineeKey.startsWith("perfume:")) {
    return {
      nominee_key: nomineeKey,
      nominee_brand_id: null,
      nominee_perfume_id: nomineeKey.replace("perfume:", "")
    };
  }

  if (nomineeKey.startsWith("brand:")) {
    return {
      nominee_key: nomineeKey,
      nominee_brand_id: nomineeKey.replace("brand:", ""),
      nominee_perfume_id: null
    };
  }

  throw new Error("Invalid nominee key");
}

export async function saveTieBreakResolutionAction(formData: FormData) {
  const parsed = tieResolutionSchema.safeParse({
    slot_keys: formData.getAll("slot_keys"),
    allowed_nominees: Object.fromEntries(
      Array.from(formData.entries())
        .filter(([key]) => key.startsWith("allowed:"))
        .reduce((accumulator, [key, value]) => {
          const slotKey = key.replace("allowed:", "");
          const current = accumulator.get(slotKey) ?? [];
          current.push(String(value));
          accumulator.set(slotKey, current);
          return accumulator;
        }, new Map<string, string[]>())
        .entries()
    ),
    selections: Object.fromEntries(
      Array.from(formData.entries())
        .filter(([key]) => key.startsWith("selection:"))
        .map(([key, value]) => [key.replace("selection:", ""), String(value)])
    )
  });

  if (!parsed.success) {
    redirect("/admin/results?error=tie-resolution-missing");
  }

  const { slot_keys, allowed_nominees, selections } = parsed.data;

  const slotPayloads = slot_keys.map((slotKey) => {
    const [categoryId, startRankText] = slotKey.split(":");
    const startRank = Number(startRankText);
    const chosenNomineeKey = selections[slotKey];

    if (!categoryId || !Number.isInteger(startRank) || startRank < 1 || startRank > 3) {
      redirect("/admin/results?error=tie-resolution-stale");
    }

    if (!chosenNomineeKey) {
      redirect("/admin/results?error=tie-resolution-missing");
    }

    const allowedNominees = allowed_nominees[slotKey];
    if (!allowedNominees || !allowedNominees.includes(chosenNomineeKey)) {
      redirect("/admin/results?error=tie-resolution-invalid");
    }

    let nomineeValues: ReturnType<typeof parseNomineeKey>;
    try {
      nomineeValues = parseNomineeKey(chosenNomineeKey);
    } catch {
      redirect("/admin/results?error=tie-resolution-invalid");
    }

    return {
      category_id: categoryId,
      priority: startRank,
      ...nomineeValues
    };
  });

  const categoryIds = Array.from(new Set(slotPayloads.map((row) => row.category_id)));

  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase.from("category_tie_breaks").delete().in("category_id", categoryIds);
  if (deleteError) {
    redirect("/admin/results?error=tie-resolution-save-failed");
  }

  const { error } = await supabase.from("category_tie_breaks").insert(slotPayloads);
  if (error) {
    redirect("/admin/results?error=tie-resolution-save-failed");
  }

  revalidatePath("/admin/results");
  redirect("/admin/results?success=tie-resolution-complete");
}

export async function startVotingAction(formData: FormData) {
  const settings = await getAppSettings();
  const rawEmailValue = normalizeEmail(String(formData.get("email") ?? ""));
  const newsletterOptIn = formData.get("newsletter_opt_in") === "on";
  const emailValue = rawEmailValue;
  const deviceCookie = await getDeviceCookie();
  const ipHash = await getIpHash();

  if (!rawEmailValue) {
    redirect("/?error=email-required");
  }

  const supabase = createSupabaseAdminClient();
  if (deviceCookie) {
    const { data: deviceMatch, error: deviceMatchError } = await supabase
      .from("voters")
      .select("id, normalized_email")
      .eq("device_token", deviceCookie)
      .maybeSingle();

    if (deviceMatchError) {
      throw deviceMatchError;
    }

    if (deviceMatch && rawEmailValue && deviceMatch.normalized_email !== emailValue) {
      await logVoteAttempt({
        action: "voter_start_blocked_device_mismatch",
        voterId: deviceMatch.id,
        ipHash,
        metadata: {
          attemptedEmail: emailValue
        }
      });
      redirect("/?error=device-locked");
    }
  }

  const lifecycle = getVotingLifecycle(settings);
  if (lifecycle.phase === "before") {
    await logVoteAttempt({
      action: "voter_start_blocked_not_started",
      ipHash,
      metadata: { attemptedEmail: emailValue }
    });
    redirect("/?error=not-started");
  }
  if (lifecycle.phase === "closed") {
      await logVoteAttempt({
        action: "voter_start_blocked_ended",
        ipHash,
        metadata: { attemptedEmail: emailValue }
      });
    redirect("/?error=ended");
  }

  const existingVoter = rawEmailValue
    ? await supabase.from("voters").select("*").eq("normalized_email", emailValue).maybeSingle()
    : { data: null, error: null };

  if (existingVoter.error) {
    throw existingVoter.error;
  }

  const deviceToken = deviceCookie ?? createDeviceToken();
  const voter =
    existingVoter.data ??
    (
      await supabase
        .from("voters")
        .insert({
          email: emailValue,
          normalized_email: emailValue,
          device_token: deviceToken,
          newsletter_opt_in: newsletterOptIn
        })
        .select("*")
        .single()
    ).data;

  if (!voter) {
    throw new Error("Unable to create voter.");
  }

  if (existingVoter.data && !existingVoter.data.device_token) {
    const { error: voterUpdateError } = await supabase
      .from("voters")
      .update({
        device_token: deviceToken,
        newsletter_opt_in: existingVoter.data.newsletter_opt_in || newsletterOptIn
      })
      .eq("id", existingVoter.data.id);

    if (voterUpdateError) {
      throw voterUpdateError;
    }
  }

  if (existingVoter.data?.device_token && newsletterOptIn && !existingVoter.data.newsletter_opt_in) {
    await supabase
      .from("voters")
      .update({ newsletter_opt_in: true })
      .eq("id", existingVoter.data.id);
  }

  await setCurrentVoterCookie(voter.id);
  await setDeviceCookie(deviceToken);
  await logVoteAttempt({
    action: "voter_session_started",
    voterId: voter.id,
    ipHash,
    metadata: {
      newsletterOptIn
    }
  });
  redirect("/vote");
}

export async function submitVoteAction(formData: FormData) {
  const voter = await getCurrentVoter();
  if (!voter) {
    redirect("/");
  }

  const categoryId = String(formData.get("category_id") ?? "");
  const selection = String(formData.get("selection") ?? "");
  const [nomineeType, nomineeId] = selection.split(":");
  const settings = await getAppSettings();
  const supabase = createSupabaseAdminClient();
  const ipHash = await getIpHash();

  const lifecycle = getVotingLifecycle(settings);
  if (lifecycle.phase === "before") {
    await logVoteAttempt({
      action: "vote_blocked_not_started",
      voterId: voter.id,
      categoryId,
      ipHash
    });
    redirectVoteError(categoryId, "not-started");
  }
  if (lifecycle.phase === "closed") {
    await logVoteAttempt({
      action: "vote_blocked_ended",
      voterId: voter.id,
      categoryId,
      ipHash
    });
    redirectVoteError(categoryId, "ended");
  }

  if (!nomineeId || (nomineeType !== "brand" && nomineeType !== "perfume")) {
    await logVoteAttempt({
      action: "vote_blocked_invalid_selection",
      voterId: voter.id,
      categoryId,
      ipHash
    });
    redirectVoteError(categoryId, "no-selection");
  }

  const { count: recentAttempts, error: attemptsError } = await supabase
    .from("vote_attempt_logs")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if (attemptsError) {
    throw attemptsError;
  }

  if ((recentAttempts ?? 0) > 100) {
    await logVoteAttempt({
      action: "vote_blocked_ip_rate_limit",
      voterId: voter.id,
      categoryId,
      ipHash
    });
    redirectVoteError(categoryId, "rate-limited");
  }

  const { data: existingVote } = await supabase
    .from("votes")
    .select("id")
    .eq("voter_id", voter.id)
    .eq("category_id", categoryId)
    .maybeSingle();

  if (existingVote) {
    await logVoteAttempt({
      action: "vote_blocked_duplicate_category",
      voterId: voter.id,
      categoryId,
      ipHash,
      metadata: { selection }
    });
    redirectVoteError(categoryId, "already-voted");
  }

  const { data: nominee, error: nomineeError } = await supabase
    .from("category_nominees")
    .select("id, brand_id, perfume_id")
    .eq("category_id", categoryId)
    .eq(nomineeType === "brand" ? "brand_id" : "perfume_id", nomineeId)
    .maybeSingle();

  if (nomineeError || !nominee) {
    await logVoteAttempt({
      action: "vote_blocked_invalid_nominee",
      voterId: voter.id,
      categoryId,
      ipHash,
      metadata: { selection }
    });
    redirectVoteError(categoryId, "invalid-nominee");
  }

  const insertPayload = {
    voter_id: voter.id,
    category_id: categoryId,
    nominee_brand_id: nominee.brand_id,
    nominee_perfume_id: nominee.perfume_id,
    ip_hash: ipHash
  };

  const { error: insertError } = await supabase.from("votes").insert(insertPayload);
  if (insertError) {
    await logVoteAttempt({
      action: "vote_insert_failed",
      voterId: voter.id,
      categoryId,
      ipHash,
      metadata: {
        selection,
        code: "code" in insertError ? insertError.code : null,
        message: insertError.message
      }
    });
    if ("code" in insertError && insertError.code === "23505") {
      redirectVoteError(categoryId, "already-voted");
    }
    throw insertError;
  }

  await logVoteAttempt({
    action: "vote_submitted",
    voterId: voter.id,
    categoryId,
    ipHash,
    metadata: { nomineeId, nomineeType }
  });

  revalidatePath("/vote");
  redirect("/vote/thanks");
}

export async function resetVotingSessionAction() {
  await clearCurrentVoterCookie();
  redirect("/");
}
