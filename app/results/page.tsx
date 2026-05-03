import Link from "next/link";
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
          <div className="mt-6 space-y-4">
            {results.categories.map((category) => (
              <div key={category.id} className="rounded-2xl border border-[color:var(--border)] bg-white/75 p-5">
                <h2 className="text-lg font-semibold">{category.name}</h2>
                {category.winner ? (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">Winner</p>
                    <div className="mt-2 font-medium text-[color:var(--foreground)]">{category.winner.label}</div>
                    <div className="mt-1 text-sm text-[color:var(--muted)]">{category.winner.displayVotes} votes</div>
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
