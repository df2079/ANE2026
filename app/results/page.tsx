import Link from "next/link";
import { Trophy } from "lucide-react";
import { PublicPageShell } from "@/components/public-page-shell";
import { getPublicResultsData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PublicResultsPage() {
  const results = await getPublicResultsData();

  return (
    <PublicPageShell>
      <div className="panel p-6">
        <p className="eyebrow mb-2">Results</p>
        <h1 className="text-3xl font-semibold">Art Niche Expo Awards 2026</h1>
        {!results.published ? (
          <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-white/75 p-5">
            <p className="text-sm text-[color:var(--muted)]">Results are not published yet.</p>
            <Link href="/" className="btn-secondary mt-4">
              Back to voting
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {results.categories.map((category) => (
              <div key={category.id} className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-4">
                <h2 className="text-base font-semibold leading-snug">{category.name}</h2>
                {category.winner ? (
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
                  <p className="mt-3 text-sm text-[color:var(--muted)]">No votes recorded.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}
