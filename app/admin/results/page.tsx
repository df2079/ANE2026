import { AdminShell } from "@/components/admin-shell";
import { requireAdminUser } from "@/lib/auth";
import { getResultsData } from "@/lib/data";
import {
  closeVotingNowAction,
  publishResultsAction,
  startVotingNowAction,
  unpublishResultsAction
} from "@/app/actions";
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
      {success === "results-unpublished" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Results were unpublished. The app is now back in a closed-but-unpublished state.
        </div>
      ) : null}

      <div className="panel p-5">
        <h2 className="text-xl font-semibold">Current state</h2>
        <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-white/70 p-4">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            {results.adminState === "before"
              ? "Voting not started"
              : results.adminState === "open"
                ? "Voting live"
                : results.adminState === "closed"
                  ? "Voting closed"
                  : "Results published"}
          </div>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {results.adminState === "before"
              ? "Voting is scheduled but has not opened yet."
              : results.adminState === "open"
                ? "Voting is currently live."
                : results.adminState === "closed"
                  ? "Voting is closed. Results are not published yet."
                  : "Results are published and voting must remain closed."}
          </p>
        </div>

        {error === "too-early" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Results can only be published after voting is closed.
          </div>
        ) : null}
        {error === "not-live" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Voting can only be ended while it is currently live.
          </div>
        ) : null}
        {error === "not-before" || error === "not-startable" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Voting cannot be started from the current state.
          </div>
        ) : null}
        {error === "published" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Voting cannot be started while results are published. Unpublish results first.
          </div>
        ) : null}
        {error === "not-published" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Results are not currently published.
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {results.canStart ? (
            <form action={startVotingNowAction}>
              <button type="submit" className="btn-secondary">
                Start voting
              </button>
            </form>
          ) : null}
          {results.canEnd ? (
            <form action={closeVotingNowAction}>
              <button type="submit" className="btn-secondary">
                End voting
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
          {results.canUnpublish ? (
            <form action={unpublishResultsAction}>
              <button type="submit" className="btn-secondary">
                Unpublish results
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {!results.canView ? (
        <div className="panel p-5">
          <h2 className="text-xl font-semibold">Results are still locked</h2>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Final rankings stay hidden until an admin publishes them.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-xl font-semibold">Published results</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Published {results.revealedAt ? formatDateTime(results.revealedAt) : "after voting ended"}.
            </p>
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
