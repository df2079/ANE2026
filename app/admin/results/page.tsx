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
      {success === "tie-resolved" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Tie-break order was saved. Publish becomes available once every podium-affecting tie is resolved.
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
            Please choose one nominee from the tied group you want to advance.
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
            <h2 className="text-xl font-semibold">{results.published ? "Published results" : "Full ranking preview"}</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {results.published
                ? `Published ${results.revealedAt ? formatDateTime(results.revealedAt) : "after voting ended"}.`
                : "Admin sees the full ranking here. The public page shows only the top 3 finalists in the same order."}
            </p>
          </div>

          {results.hasUnresolvedPodiumTies ? (
            <div className="panel p-5">
              <h2 className="text-xl font-semibold">Resolve podium ties before publishing</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Choose one nominee at a time. Each choice adds one admin tie-break vote inside that tied group only. Higher regular vote totals always stay ahead.
              </p>
            </div>
          ) : null}

          {results.categories.map((category) => (
            <div key={category.id} className="panel p-5">
              <h2 className="text-xl font-semibold">{category.name}</h2>
              {category.unresolvedPodiumTieGroups.length ? (
                <div className="mt-4 space-y-4">
                  {category.unresolvedPodiumTieGroups.map((group) => (
                    <div
                      key={`${category.id}-${group.voteCount}-${group.tieBreakVotes}-${group.startRank}`}
                      className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4"
                    >
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-900">
                        Resolve tie for {ordinalLabel(group.startRank)} place
                      </h3>
                      <p className="mt-2 text-sm text-amber-900">
                        These nominees currently share this podium position with {group.voteCount} votes each.
                      </p>
                      <div className="mt-4 space-y-3">
                        {group.nominees.map((nominee) => (
                          <div
                            key={nominee.nomineeKey}
                            className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="font-medium text-[color:var(--foreground)]">{nominee.label}</div>
                              <div className="text-sm text-[color:var(--muted)]">
                                {nominee.votes} votes
                                {nominee.tieBreakVotes > 0 ? ` · ${nominee.tieBreakVotes} admin tie-break vote${nominee.tieBreakVotes === 1 ? "" : "s"}` : ""}
                              </div>
                            </div>
                            <form action={saveTieBreakResolutionAction}>
                              <input type="hidden" name="category_id" value={category.id} />
                              <input type="hidden" name="vote_count" value={String(group.voteCount)} />
                              <input type="hidden" name="tie_break_votes" value={String(group.tieBreakVotes)} />
                              <input type="hidden" name="chosen_nominee_key" value={nominee.nomineeKey} />
                              {group.nominees.map((groupNominee) => (
                                <input
                                  key={groupNominee.nomineeKey}
                                  type="hidden"
                                  name="nominee_keys"
                                  value={groupNominee.nomineeKey}
                                />
                              ))}
                              <button type="submit" className="btn-secondary">
                                Select winner of this tie
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 space-y-2">
                {category.rows.length ? (
                  category.rows.map((row, index) => (
                    <div
                        key={`${category.id}-${row.label}`}
                      className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 py-3"
                    >
                      <div className="font-medium">
                        {index + 1}. {row.label}
                        {index > 0 &&
                        category.rows[index - 1]?.votes === row.votes &&
                        category.rows[index - 1]?.tieBreakVotes === row.tieBreakVotes ? (
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
