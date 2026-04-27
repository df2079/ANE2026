import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicPageShell } from "@/components/public-page-shell";
import { getAppSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ThanksPage() {
  const settings = await getAppSettings();

  if (settings.results_revealed_at) {
    redirect("/results");
  }

  return (
    <PublicPageShell>
      <div className="panel p-6">
        <p className="eyebrow mb-2">Thank you</p>
        <h1 className="text-3xl font-semibold">Your vote has been recorded</h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          You can return to the category list and continue voting in any remaining categories.
        </p>
        <p className="mt-4 text-sm">
          Voting closes: <span className="font-medium">{formatDateTime(settings.voting_end_at)}</span>
        </p>
        <Link href="/vote" className="btn-primary mt-6">
          Back to categories
        </Link>
      </div>
    </PublicPageShell>
  );
}
