import { AdminShell } from "@/components/admin-shell";
import { requireAdminUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminUser();
  const dashboard = await getDashboardData();

  return (
    <AdminShell
      currentPath="/admin"
      title="Expo voting dashboard"
      description="A simple overview of the current voting data."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel p-5">
          <p className="eyebrow">Brands</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.brandCount}</p>
        </div>
        <div className="panel p-5">
          <p className="eyebrow">Perfumes</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.perfumeCount}</p>
        </div>
        <div className="panel p-5">
          <p className="eyebrow">Voters</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.voterCount}</p>
        </div>
        <div className="panel p-5">
          <p className="eyebrow">Votes</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.voteCount}</p>
        </div>
      </div>
    </AdminShell>
  );
}
