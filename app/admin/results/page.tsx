import { AdminShell } from "@/components/admin-shell";
import { SubmitButton } from "@/components/submit-button";
import { requireAdminUser } from "@/lib/auth";
import { getResultsData } from "@/lib/data";
import {
  closeVotingNowAction,
  hideCategoryWinnerAction,
  revealCategoryWinnerAction,
  saveTieBreakResolutionAction,
  startVotingNowAction
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdminUser();
  const results = await getResultsData();
  const { error, success } = await searchParams;
  const showReviewContent = results.canView;

  return (
    <AdminShell
      currentPath="/admin/results"
      title="Results"
      description="Review winners after voting closes, then reveal them category by category during the ceremony."
    >
      {success === "voting-opened" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Voting was opened manually and is now live.
        </div>
      ) : null}
      {success === "voting-closed" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Voting was closed manually. Winners can now be reviewed and revealed.
        </div>
      ) : null}
      {success === "category-revealed" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Category winner is now visible on the public results page.
        </div>
      ) : null}
      {success === "category-hidden" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Category winner is hidden again.
        </div>
      ) : null}
      {success === "tie-resolution-complete" ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Tie decisions were saved. You can now review and reveal category winners.
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
                : "Voting closed"}
          </div>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {results.adminState === "before"
              ? "Voting is scheduled but has not opened yet."
              : results.adminState === "open"
                ? "Voting is currently live."
                : results.allWinnersRevealed
                  ? "Voting is closed. All category winners have been announced."
                  : results.hasAnyRevealedWinners
                    ? "Voting is closed. Winners are being revealed category by category."
                    : "Voting is closed. Winners can now be revealed category by category."}
          </p>
        </div>

        {error === "too-early" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Winners can only be revealed after voting is closed.
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
        {error === "unresolved-ties" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Winners cannot be revealed until every tie for winner has been resolved.
          </div>
        ) : null}
        {error === "unresolved-category-tie" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            That category winner cannot be revealed until its winner tie is resolved.
          </div>
        ) : null}
        {error === "category-reveal-failed" || error === "category-hide-failed" ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            The category reveal state could not be updated. Please try again.
          </div>
        ) : null}
        {error === "tie-resolution-invalid" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            One of the selected nominees was not valid for the current winner tie. Please refresh and choose again.
          </div>
        ) : null}
        {error === "tie-resolution-missing" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Choose one winner for every tied category before continuing.
          </div>
        ) : null}
        {error === "tie-resolution-stale" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            That tie group changed before it was saved. Refresh the page and resolve the current tied nominees instead.
          </div>
        ) : null}
        {error === "tie-resolution-save-failed" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Tie decision could not be saved. Please try again.
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
        </div>

        {results.adminState === "open" ? (
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            Results review will appear here after voting ends.
          </p>
        ) : null}
      </div>

      {showReviewContent && results.hasUnresolvedPodiumTies ? (
        <form action={saveTieBreakResolutionAction} className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-xl font-semibold">Resolve tied winners</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Choose the official winner for each tied category. After you continue, you will return to the final review before revealing winners.
            </p>
          </div>

          {results.categories
            .filter((category) => category.unresolvedWinnerTie !== null)
            .map((category) => {
              const tieGroup = category.unresolvedWinnerTie;
              if (!tieGroup) {
                return null;
              }
              const slotKey = `${category.id}:1`;

              return (
                <div key={category.id} className="panel p-5">
                  <input type="hidden" name="slot_keys" value={slotKey} />
                  <h2 className="text-xl font-semibold">{category.name}</h2>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    These nominees are tied for winner on {tieGroup.voteCount} votes. Choose the official category winner.
                  </p>
                  <div className="mt-4 space-y-3">
                    {tieGroup.nominees.map((nominee, index) => (
                      <label
                        key={`${slotKey}-${nominee.nomineeKey}`}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3"
                      >
                        <input type="hidden" name={`allowed:${slotKey}`} value={nominee.nomineeKey} />
                        <input
                          type="radio"
                          name={`selection:${slotKey}`}
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
            <SubmitButton pendingLabel="Preparing final review..." className="sm:w-auto">
              Continue
            </SubmitButton>
          </div>
        </form>
      ) : null}

      {showReviewContent ? (
        <div className="space-y-4">
          {results.categories.map((category) => (
            <div key={category.id} className="panel p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{category.name}</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {category.revealedAt
                      ? "Winner is visible on the public results page."
                      : category.unresolvedWinnerTie
                        ? "Resolve the winner tie before revealing this category."
                        : "Winner is ready but not revealed yet."}
                  </p>
                </div>
                {category.revealedAt ? (
                  <form action={hideCategoryWinnerAction}>
                    <input type="hidden" name="category_id" value={category.id} />
                    <button type="submit" className="btn-secondary whitespace-nowrap">
                      Hide winner
                    </button>
                  </form>
                ) : category.winner && !category.unresolvedWinnerTie ? (
                  <form action={revealCategoryWinnerAction}>
                    <input type="hidden" name="category_id" value={category.id} />
                    <button type="submit" className="btn-primary whitespace-nowrap">
                      Reveal winner
                    </button>
                  </form>
                ) : null}
              </div>
              <div className="mt-4">
                {category.unresolvedWinnerTie ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <p className="text-sm font-medium text-amber-900">Winner tie must be resolved first.</p>
                  </div>
                ) : category.winner ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">Winner</p>
                    <div className="mt-2 font-medium text-[color:var(--foreground)]">{category.winner.label}</div>
                    <div className="mt-2 text-sm text-[color:var(--muted)]">
                      {category.winner.displayVotes} votes
                      {category.winner.resolvedByAdmin ? " · Tie resolved by admin decision" : ""}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[color:var(--muted)]">No votes recorded yet.</p>
                )}
              </div>

              {category.reviewRows.length > 1 ? (
                <details className="mt-4 rounded-2xl border border-[color:var(--border)] bg-white/65 p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[color:var(--foreground)]">
                    Show full ranking
                  </summary>
                  <div className="mt-4 space-y-2">
                    {category.reviewRows.map((row) => (
                      <div
                        key={`${category.id}-full-${row.nomineeKey}`}
                        className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 py-3"
                      >
                        <div className="font-medium">
                          {row.rank}. {row.label}
                          {row.resolvedByAdmin ? (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                              Resolved
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm text-[color:var(--muted)]">{row.displayVotes} votes</div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </AdminShell>
  );
}
