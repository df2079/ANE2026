import { AdminShell } from "@/components/admin-shell";
import { SubmitButton } from "@/components/submit-button";
import { requireAdminUser } from "@/lib/auth";
import { getImportsWithWarnings } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";
import { clearImportHistoryAction, syncLatestWorkbookAction, uploadWorkbookAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AdminImportsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdminUser();
  const { imports, warnings, warningsByImportId } = await getImportsWithWarnings();
  const { error, success } = await searchParams;

  return (
    <AdminShell
      currentPath="/admin/imports"
      title="Imports and sync"
      description="Upload the latest XLSX file and sync the voting data."
    >
      <div className="grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="panel p-5">
          <h2 className="text-xl font-semibold">Upload XLSX</h2>
          {error === "voting-open" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Sync is blocked while voting is live. Upload is still allowed, but nominee changes cannot be applied until voting is over.
            </div>
          ) : error === "no-uploaded-workbook" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No uploaded XLSX file was found yet. Upload an XLSX file first, then run sync.
            </div>
          ) : error === "sync-failed" ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Sync failed. The latest import log is marked as failed so you can inspect the error and warnings below.
            </div>
          ) : error === "clear-failed" ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Import history could not be cleared. Please try again.
            </div>
          ) : success === "history-cleared" ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Import history was cleared.
            </div>
          ) : null}
          <form action={uploadWorkbookAction} className="mt-4 space-y-4">
            <input
              name="workbook"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="field"
            />
            <SubmitButton pendingLabel="Uploading XLSX...">Upload XLSX</SubmitButton>
          </form>

          <form action={syncLatestWorkbookAction} className="mt-4">
            <SubmitButton variant="secondary" pendingLabel="Syncing...">
              Sync latest uploaded file
            </SubmitButton>
          </form>

          <form action={clearImportHistoryAction} className="mt-4 flex justify-end border-t border-[color:var(--border)] pt-4">
            <SubmitButton
              pendingLabel="Clearing history..."
              className="w-auto bg-transparent px-0 py-0 text-sm font-medium text-[color:var(--muted)] shadow-none hover:bg-transparent hover:text-[color:var(--foreground)]"
            >
              Clear import history
            </SubmitButton>
          </form>
        </div>

        <div className="panel p-5">
          <h2 className="text-xl font-semibold">Recent import logs</h2>
          <div className="mt-4 space-y-4">
            {imports.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{item.filename}</div>
                  <div className="status-pill bg-stone-200 text-stone-700">{item.status}</div>
                </div>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Uploaded {formatDateTime(item.created_at)}
                </p>
                {item.status === "failed" && (item.summary as Record<string, unknown> | null)?.errorMessage ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {String((item.summary as Record<string, unknown>).errorMessage)}
                  </div>
                ) : null}
                {item.summary && item.status === "synced" ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl bg-stone-100 px-3 py-2 text-xs">
                      <div className="font-semibold">Brands</div>
                      <div>{String((item.summary as Record<string, unknown>).brandsFound ?? 0)}</div>
                    </div>
                    <div className="rounded-2xl bg-stone-100 px-3 py-2 text-xs">
                      <div className="font-semibold">Perfumes</div>
                      <div>{String((item.summary as Record<string, unknown>).perfumesFound ?? 0)}</div>
                    </div>
                    <div className="rounded-2xl bg-stone-100 px-3 py-2 text-xs">
                      <div className="font-semibold">Updated</div>
                      <div>{String((item.summary as Record<string, unknown>).updatedPerfumes ?? 0)}</div>
                    </div>
                  </div>
                ) : null}
                {item.summary && item.status === "synced" ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs">
                    <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                      New brands {String((item.summary as Record<string, unknown>).newBrands ?? 0)}
                    </div>
                    <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                      New perfumes {String((item.summary as Record<string, unknown>).newPerfumes ?? 0)}
                    </div>
                  </div>
                ) : null}
                {warningsByImportId[item.id] ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="status-pill bg-rose-100 text-rose-800">
                      Errors {warningsByImportId[item.id].error}
                    </span>
                    <span className="status-pill bg-amber-100 text-amber-900">
                      Warnings {warningsByImportId[item.id].warning}
                    </span>
                    <span className="status-pill bg-sky-100 text-sky-800">
                      Info {warningsByImportId[item.id].info}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {warnings.length ? (
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Latest warnings</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="status-pill bg-rose-100 text-rose-800">
              Errors {warnings.filter((warning) => warning.severity === "error").length}
            </span>
            <span className="status-pill bg-amber-100 text-amber-900">
              Warnings {warnings.filter((warning) => warning.severity === "warning").length}
            </span>
            <span className="status-pill bg-sky-100 text-sky-800">
              Info {warnings.filter((warning) => warning.severity === "info").length}
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {warnings.length ? (
            warnings.map((warning) => (
              <div
                key={warning.id}
                className={`rounded-2xl p-4 text-sm ${
                  warning.severity === "error"
                    ? "border border-rose-200 bg-rose-50"
                    : warning.severity === "warning"
                      ? "border border-amber-200 bg-amber-50"
                      : "border border-sky-200 bg-sky-50"
                }`}
              >
                <div className="font-medium">
                  {warning.brand_name} · {warning.code} · {warning.severity}
                  {warning.row_number ? ` · row ${warning.row_number}` : ""}
                </div>
                <p className="mt-1 text-[color:var(--muted)]">{warning.message}</p>
              </div>
            ))
          ) : null}
        </div>
      </div>
      ) : null}
    </AdminShell>
  );
}
