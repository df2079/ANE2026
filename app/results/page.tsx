import { Trophy } from "lucide-react";
import { PublicPageShell } from "@/components/public-page-shell";
import { ResultsAutoRefresh } from "@/components/results-auto-refresh";
import { getPublicResultsData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PublicResultsPage() {
  const results = await getPublicResultsData();

  return (
    <PublicPageShell>
      <ResultsAutoRefresh enabled={!results.allWinnersRevealed} />
      <div className="panel p-6">
        <p className="eyebrow mb-2">Results</p>
        <h1 className="text-3xl font-semibold">Art Niche Expo Awards 2026</h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          {results.allWinnersRevealed
            ? "All winners have been announced."
            : results.hasAnyRevealedWinners
              ? "Winners are being announced live."
              : "Winners will appear here as they are announced."}
        </p>

        <div className="mt-5 space-y-3">
          {results.categories.map((category) => (
            <div key={category.id} className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-4">
              <h2 className="text-base font-semibold leading-snug">{category.name}</h2>
              {category.isRevealed && category.winner ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900">Winner</p>
                  <div className="mt-2 flex items-start gap-2.5">
                    <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    <div>
                      <div className="font-semibold leading-snug text-[color:var(--foreground)]">{category.winner.label}</div>
                      <div className="mt-0.5 text-sm text-[color:var(--muted)]">{category.winner.displayVotes} votes</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-[color:var(--border)] bg-white/65 px-3.5 py-3">
                  <p className="text-sm font-semibold text-[color:var(--muted)]">Waiting for announcement</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PublicPageShell>
  );
}
