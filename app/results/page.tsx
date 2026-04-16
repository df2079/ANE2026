import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";
import { getPublicResultsData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PublicResultsPage() {
  const results = await getPublicResultsData();
  const medalForIndex = ["🥇", "🥈", "🥉"];

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
                <div className="mt-3 space-y-2">
                  {category.finalists.map((finalist, index) => (
                    <div
                      key={`${category.id}-${finalist.label}`}
                      className={`rounded-2xl px-4 py-3 ${
                        index === 0
                          ? "border border-emerald-200 bg-emerald-50"
                          : "bg-[color:var(--card-strong)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">
                          <span className="mr-2" aria-hidden="true">
                            {medalForIndex[index]}
                          </span>
                          {finalist.label}
                        </div>
                        <div className="text-sm text-[color:var(--muted)]">
                          {index + 1}
                          {index === 0 ? "st" : index === 1 ? "nd" : "rd"}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--muted)]">{finalist.displayVotes} votes</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}
