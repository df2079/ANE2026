import Link from "next/link";
import { LockKeyhole, Vote } from "lucide-react";

export function CategoryCard({
  id,
  name,
  nomineeCount,
  hasVoted,
  votedLabel
}: {
  id: string;
  name: string;
  nomineeCount: number;
  hasVoted: boolean;
  votedLabel: string | null;
}) {
  return (
    <Link href={`/vote/${id}`} className="panel block p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Category</p>
          <h2 className="text-lg font-semibold">{name}</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{nomineeCount} nominees</p>
          {hasVoted && votedLabel ? (
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              You voted for <span className="font-medium text-[color:var(--foreground)]">{votedLabel}</span>
            </p>
          ) : null}
        </div>
        <span
          className={`status-pill ${hasVoted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
        >
          {hasVoted ? (
            <>
              <LockKeyhole className="mr-1 h-3.5 w-3.5" />
              Voted
            </>
          ) : (
            <>
              <Vote className="mr-1 h-3.5 w-3.5" />
              Open
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
