import Link from "next/link";
import { adminLogoutAction } from "@/app/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/imports", label: "Imports" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/results", label: "Results" }
];

export function AdminShell({
  title,
  description,
  currentPath,
  children
}: {
  title: string;
  description: string;
  currentPath: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn-secondary">
            Open public flow
          </Link>
          <form action={adminLogoutAction}>
            <button type="submit" className="btn-secondary">
              Log out
            </button>
          </form>
        </div>
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap",
              currentPath === item.href
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                : "bg-white/70"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
