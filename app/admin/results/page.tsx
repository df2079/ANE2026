import { AdminShell } from "@/components/admin-shell";
import { requireAdminUser } from "@/lib/auth";
import { getResultsData } from "@/lib/data";
import { closeVotingNowAction, publishResultsAction, startVotingNowAction } from "@/app/actions";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdminUser();
  const results = await getResultsData();
  const { error, success } = await searchParams;

  return (
    <AdminShell
      currentPath="/admin/results"
      title="Results"
      description="Publish results after voting closes. Once published, the public results page becomes visible."
    >
      {success === "voting-opened" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Voting was opened manually and is now live.
        </div>
      ) : null}
      {success === "voting-closed" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Voting was closed manually. Results can now be published when you are ready.
        </div>
      ) : null}
      {!results.canView ? (
        <div className="panel p-5">
          <h2 className="text-xl font-semibold">Results are still locked</h2>
          {error === "too-early" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Results can only be published after voting is closed.
            </div>
          ) : null}
          {error === "not-live" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Voting can only be closed manually while it is currently live.
            </div>
          ) : null}
          {error === "not-before" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Voting can only be started manually before the scheduled window begins.
            </div>
          ) : null}
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            {results.phase === "before"
              ? "Voting has not started yet. You can wait for the scheduled start time or open voting early."
              : results.phase === "open"
                ? "Voting is currently live. You can close voting early if needed, then publish the final results."
                : "Voting is closed. An admin can now publish the final results."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {results.phase === "before" ? (
              <form action={startVotingNowAction}>
                <button type="submit" className="btn-secondary">
                  Start voting now
                </button>
              </form>
            ) : null}
            {results.isLive ? (
              <form action={closeVotingNowAction}>
                <button type="submit" className="btn-secondary">
                  Close voting now
                </button>
              </form>
            ) : null}
            {results.canPublish ? (
              <form action={publishResultsAction}>
                <button type="submit" className="btn-primary">
                  Publish results
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Published results</h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Published {results.revealedAt ? formatDateTime(results.revealedAt) : "after voting ended"}.
                </p>
              </div>
              <a href="/admin/results/consented-emails.csv" className="btn-primary">
                Export consented emails
              </a>
            </div>
          </div>

          {results.categories.map((category) => (
            <div key={category.id} className="panel p-5">
              <h2 className="text-xl font-semibold">{category.name}</h2>
              <div className="mt-4 space-y-2">
                {category.rows.length ? (
                  category.rows.map((row, index) => (
                    <div
                      key={`${category.id}-${row.label}`}
                      className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 py-3"
                    >
                      <div className="font-medium">
                        {index + 1}. {row.label}
                        {index > 0 && category.rows[index - 1]?.votes === row.votes ? (
                          <span className="ml-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                            Tied
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-[color:var(--muted)]">{row.votes} votes</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[color:var(--muted)]">No votes recorded yet.</p>
                )}
              </div>
            </div>
          ))}

        </div>
      )}
    </AdminShell>
  );
}
