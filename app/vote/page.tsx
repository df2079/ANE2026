import Link from "next/link";
import { CategoryCard } from "@/components/category-card";
import { PublicPageShell } from "@/components/public-page-shell";
import { getVotingHomeData } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";
import { resetVotingSessionAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function VoteHomePage() {
  const { categories, settings, voter, votingState } = await getVotingHomeData();

  if (!voter) {
    return (
      <PublicPageShell>
        <div className="panel p-6">
          <h1 className="text-2xl font-semibold">Start from the main voting page</h1>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Your voting session was not found.
          </p>
          <Link href="/" className="btn-primary mt-6">
            Open landing page
          </Link>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <div className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow mb-2">Awards voting</p>
            <h1 className="text-3xl font-semibold">Vote for the awards</h1>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Signed in as <span className="font-medium text-[color:var(--foreground)]">{voter.email}</span>.
              You can vote in any category once.
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {votingState === "before" && settings.voting_start_at
                ? `Voting opens: ${formatDateTime(settings.voting_start_at)}`
                : votingState === "open"
                  ? `Voting in progress. Voting closes: ${formatDateTime(settings.voting_end_at)}`
                  : "Voting is now closed."}
            </p>
          </div>
          <form action={resetVotingSessionAction}>
            <button className="btn-secondary" type="submit">
              Use another email
            </button>
          </form>
        </div>

        {votingState === "open" ? (
          <div className="mt-6 grid gap-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} {...category} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-white/70 p-5 text-sm text-[color:var(--muted)]">
            {votingState === "before"
              ? "Voting has not opened yet. Come back when the voting window begins."
              : "Voting is closed. Results will appear after they are published."}
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}
