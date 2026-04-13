import Link from "next/link";
import { adminLoginAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="page-shell">
      <div className="panel p-6">
        <p className="eyebrow mb-2">Admin login</p>
        <h1 className="text-3xl font-semibold">Access the organizer console</h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Sign in with your approved admin email address and password.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error === "not-allowed"
              ? "This email is not allowlisted for admin access."
              : error === "invalid-credentials"
                ? "The email or password is incorrect."
                : error === "email-not-confirmed"
                  ? "This admin account has not confirmed its email address yet."
                  : error === "password-provider-disabled"
                    ? "Supabase email and password login is not enabled for this project."
                    : error === "callback-failed" || error === "missing-code"
                      ? "Magic-link admin sign-in is no longer the intended flow. Please sign in with email and password."
                      : error === "invalid-form"
                        ? "Please enter both email and password."
                        : error === "auth-failed"
                          ? "Admin sign-in could not be completed. Please try again."
                          : "Admin login could not be started."}
          </div>
        ) : null}

        <form action={adminLoginAction} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Admin email</label>
            <input name="email" type="email" required className="field" placeholder="admin@example.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <input name="password" type="password" required className="field" placeholder="Password" />
          </div>
          <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
        </form>

        <Link href="/" className="btn-secondary mt-4">
          Back to public flow
        </Link>
      </div>
    </div>
  );
}
