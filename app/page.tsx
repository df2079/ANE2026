import Link from "next/link";
import { startVotingAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { PublicPageShell } from "@/components/public-page-shell";
import { formatDateTime } from "@/lib/utils";
import { getVotingHomeData } from "@/lib/data";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "email-required": "Email is required before entering the voting flow.",
  "device-locked": "This device already started voting with another email address.",
  "not-started": "Voting has not opened yet.",
  ended: "Voting has already ended."
};

export default async function LandingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { settings, voter, votingState, published } = await getVotingHomeData();
  const { error } = await searchParams;

  if (published) {
    return (
      <PublicPageShell>
        <div className="panel p-6">
          <p className="eyebrow mb-2">Results</p>
          <h1 className="text-3xl font-semibold">Art Niche Expo Awards 2026</h1>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            The final results are now published and ready to view.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/results" className="btn-primary">
              View results
            </Link>
            <Link href="/admin/login" className="btn-secondary">
              Admin
            </Link>
          </div>
        </div>
      </PublicPageShell>
    );
  }

  if (voter) {
    return (
      <PublicPageShell>
        <div className="panel p-6">
          <p className="eyebrow mb-2">Welcome back</p>
          <h1 className="text-3xl font-semibold">Art Niche Expo Awards 2026</h1>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Your session is already active, so you can continue voting where you left off.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/vote" className="btn-primary">
              Continue voting
            </Link>
            <Link href="/admin/login" className="btn-secondary">
              Admin
            </Link>
          </div>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <div className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-6 py-5">
          <p className="eyebrow mb-2">Art Niche Expo Awards 2026</p>
          <h1 className="text-3xl font-semibold">Vote for the fragrances that stayed with you</h1>
        </div>

        <div className="space-y-6 px-6 py-6">
          {votingState === "before" ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-5">
              <h2 className="text-lg font-semibold">Voting opens soon</h2>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                Voting opens: <span className="font-medium text-[color:var(--foreground)]">{formatDateTime(settings.voting_start_at)}</span>
              </p>
            </div>
          ) : votingState === "open" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-lg font-semibold">Voting in progress</h2>
              <p className="mt-3 text-sm text-emerald-900">
                Voting closes: <span className="font-medium">{formatDateTime(settings.voting_end_at)}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-5">
              <h2 className="text-lg font-semibold">{published ? "Results are available" : "Voting has closed"}</h2>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                {published
                  ? "Results are now published."
                  : "Results will appear here once they are published."}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-strong)] p-5">
            <h2 className="text-lg font-semibold">How it works</h2>
            <ol className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
              <li>1. Enter your email.</li>
              <li>2. Open any category and choose one nominee.</li>
              <li>3. Each category locks after submission.</li>
              <li>4. Finish all four, or only the ones you want.</li>
            </ol>
          </div>

          {votingState === "open" ? (
            <form action={startVotingAction} className="space-y-4">
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessages[error] ?? "Something went wrong. Please try again."}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="field"
                  placeholder="you@example.com"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 py-3 text-sm">
                <input name="newsletter_opt_in" type="checkbox" />
                <span>I want to receive future updates from Art Niche Expo</span>
              </label>

              <SubmitButton pendingLabel="Entering voting...">Enter voting</SubmitButton>
            </form>
          ) : null}

          {published ? (
            <Link href="/results" className="btn-secondary w-full text-center">
              View published results
            </Link>
          ) : null}
        </div>
      </div>
    </PublicPageShell>
  );
}
