import { resetEventDataAction, saveSettingsAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { SubmitButton } from "@/components/submit-button";
import { requireAdminUser } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { formatDateTimeInputValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireAdminUser();
  const settings = await getAppSettings();
  const { success, error } = await searchParams;

  return (
    <AdminShell
      currentPath="/admin/settings"
      title="Voting settings"
      description="Runtime control only. Workbook data drives nominees and brand metadata."
    >
      <div className="space-y-4">
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            {success === "reset-all" ? "All event data was reset for testing." : "Settings updated."}
          </div>
        ) : null}
        {error === "reset-failed" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
            Event data could not be reset. Please try again.
          </div>
        ) : null}

        <form action={saveSettingsAction} className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-xl font-semibold">Voting window</h2>
            <p className="mt-1.5 text-sm font-medium text-[color:var(--muted)]">
              Update the live voting window used by the public pages.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">Voting start datetime</label>
                <input
                  type="datetime-local"
                  name="voting_start_at"
                  defaultValue={formatDateTimeInputValue(settings.voting_start_at)}
                  className="field"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Voting end datetime</label>
                <input
                  type="datetime-local"
                  name="voting_end_at"
                  defaultValue={formatDateTimeInputValue(settings.voting_end_at)}
                  className="field"
                />
              </div>
            </div>
          </div>

          <div className="sm:max-w-xs">
            <SubmitButton pendingLabel="Saving settings...">Save settings</SubmitButton>
          </div>
        </form>

        <div className="panel p-5">
          <h2 className="text-xl font-semibold">Voter export</h2>
          <p className="mt-1.5 text-sm font-medium text-[color:var(--muted)]">
            Export all voter emails together with their newsletter consent status.
          </p>
          <div className="mt-3.5 sm:max-w-xs">
            <a href="/admin/settings/voters.csv" className="btn-secondary block text-center">
              Export voter emails
            </a>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-xl font-semibold">Temporary destructive reset</h2>
          <p className="mt-1.5 text-sm font-medium text-[color:var(--muted)]">
            This clears imported event data and voting data so you can test from a clean state.
          </p>
          <form action={resetEventDataAction} className="mt-3.5 sm:max-w-xs">
            <SubmitButton variant="danger" pendingLabel="Resetting data...">
              Reset all event data
            </SubmitButton>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
