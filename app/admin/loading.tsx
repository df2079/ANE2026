export default function AdminLoading() {
  return (
    <div className="page-shell max-w-6xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="h-4 w-14 animate-pulse rounded-full bg-stone-200" />
          <div className="h-10 w-56 animate-pulse rounded-2xl bg-stone-200" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-stone-200" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-10 w-32 animate-pulse rounded-full bg-stone-200" />
          <div className="h-10 w-24 animate-pulse rounded-full bg-stone-200" />
        </div>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-10 w-24 animate-pulse rounded-full bg-stone-200" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="panel p-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-stone-200" />
            <div className="mt-4 h-8 w-28 animate-pulse rounded-2xl bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
