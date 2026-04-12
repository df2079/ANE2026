import { AdminShell } from "@/components/admin-shell";
import { requireAdminUser } from "@/lib/auth";
import { getResultsData } from "@/lib/data";
import { publishResultsAction } from "@/app/actions";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminUser();
  const results = await getResultsData();
  const { error } = await searchParams;

  return (
    <AdminShell
      currentPath="/admin/results"
      title="Results"
      description="Publish results after voting closes. Once published, the public results page becomes visible."
    >
      {!results.canView ? (
        <div className="panel p-5">
          <h2 className="text-xl font-semibold">Results are still locked</h2>
          {error === "too-early" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Results can only be published after voting has ended.
            </div>
          ) : null}
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            {results.ended
              ? "Voting has ended. An admin can now publish the final results."
              : "Rankings stay hidden until voting ends and an admin intentionally publishes them."}
          </p>
          <form action={publishResultsAction} className="mt-5">
            <button type="submit" className="btn-primary disabled:cursor-not-allowed disabled:opacity-60" disabled={!results.ended}>
              Publish results when eligible
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Published results</h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Published {results.revealedAt ? formatDateTime(results.revealedAt) : "after voting ended"}.
                </p>
              </div>
              <a href="/admin/results/consented-emails.csv" className="btn-primary">
                Export consented emails
              </a>
            </div>
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
