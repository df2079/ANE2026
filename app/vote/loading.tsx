import { PublicPageShell } from "@/components/public-page-shell";

export default function VoteLoading() {
  return (
    <PublicPageShell>
      <div className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="h-4 w-28 animate-pulse rounded-full bg-stone-200" />
            <div className="h-10 w-64 animate-pulse rounded-2xl bg-stone-200" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-stone-200" />
            <div className="h-4 w-56 animate-pulse rounded-full bg-stone-200" />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-full bg-stone-200" />
        </div>
        <div className="mt-6 grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="h-4 w-20 animate-pulse rounded-full bg-stone-200" />
                  <div className="h-6 w-72 max-w-full animate-pulse rounded-2xl bg-stone-200" />
                  <div className="h-4 w-24 animate-pulse rounded-full bg-stone-200" />
                </div>
                <div className="h-8 w-20 animate-pulse rounded-full bg-stone-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicPageShell>
  );
}
