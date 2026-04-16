import { AdminShell } from "@/components/admin-shell";
import { requireAdminUser } from "@/lib/auth";
import { getResultsData } from "@/lib/data";
import {
  closeVotingNowAction,
  publishResultsAction,
  saveTieBreakResolutionAction,
  startVotingNowAction,
  unpublishResultsAction
} from "@/app/actions";
import { formatDateTime } from "@/lib/utils";

function ordinalLabel(rank: number) {
  if (rank % 100 >= 11 && rank % 100 <= 13) {
    return `${rank}th`;
  }

  const remainder = rank % 10;
  if (remainder === 1) return `${rank}st`;
  if (remainder === 2) return `${rank}nd`;
  if (remainder === 3) return `${rank}rd`;
  return `${rank}th`;
}

export const dynamic = "force-dynamic";

export default async function AdminResultsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdminUser();
  const results = await getResultsData();
  const { error, success } = await searchParams;
  const showReviewContent = results.adminState === "closed" || results.adminState === "published";

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
      {success === "results-published" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Results were published and are now visible on the public results page.
        </div>
      ) : null}
      {success === "tie-resolution-complete" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Tie decisions were saved. You can now review the final results before publishing.
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
        {error === "unresolved-ties" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Results cannot be published until every tie affecting the public top 3 has been resolved.
          </div>
        ) : null}
        {error === "tie-resolution-invalid" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            One of the selected nominees was not valid for the current tied slot. Please choose again.
          </div>
        ) : null}
        {error === "tie-resolution-missing" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Choose one nominee for every tied category before continuing.
          </div>
        ) : null}
        {error === "tie-resolution-stale" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            That tie group changed before it was saved. Refresh the page and resolve the current tied nominees instead.
          </div>
        ) : null}
        {error === "tie-resolution-save-failed" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Tie-break order could not be saved. Please try again.
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

        {results.adminState === "open" ? (
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            Results review will appear here after voting ends.
          </p>
        ) : null}
      </div>

      {!showReviewContent ? null : results.hasUnresolvedPodiumTies ? (
        <form action={saveTieBreakResolutionAction} className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-xl font-semibold">Resolve tied podium places</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Choose who receives each disputed place. Only the tied categories are shown here. After you continue, you will return to the final review before publishing.
            </p>
          </div>

          {results.categories
            .filter((category) => category.unresolvedTieResolution !== null)
            .map((category) => {
              const tieGroup = category.unresolvedTieResolution;
              if (!tieGroup) {
                return null;
              }

              return (
                <div key={category.id} className="panel p-5">
                  <input type="hidden" name="category_ids" value={category.id} />
                  <h2 className="text-xl font-semibold">{category.name}</h2>
                  <p className="mt-2 text-sm font-medium text-[color:var(--foreground)]">
                    Tie for {ordinalLabel(tieGroup.startRank)} place
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    These nominees are tied on {tieGroup.voteCount} votes. Choose who gets this place.
                  </p>
                  <div className="mt-4 space-y-3">
                    {tieGroup.nominees.map((nominee, index) => (
                      <label
                        key={nominee.nomineeKey}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3"
                      >
                        <input
                          type="radio"
                          name={`selection:${category.id}`}
                          value={nominee.nomineeKey}
                          required={index === 0}
                          className="mt-1"
                        />
                        <span className="block">
                          <span className="block font-medium text-[color:var(--foreground)]">{nominee.label}</span>
                          <span className="block text-sm text-[color:var(--muted)]">{nominee.votes} votes</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

          <div className="panel p-5">
            <button type="submit" className="btn-primary">
              Continue
            </button>
          </div>
        </form>
      ) : results.canView ? (
        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-xl font-semibold">{results.published ? "Published results" : "Full ranking preview"}</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {results.published
                ? `Published ${results.revealedAt ? formatDateTime(results.revealedAt) : "after voting ended"}.`
                : "Admin sees the full ranking here. The public page shows only the top 3 finalists in the same order."}
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
      ) : null}
    </AdminShell>
  );
}
