import Link from "next/link";
import { adminLoginAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <div className="page-shell">
      <div className="panel p-6">
        <p className="eyebrow mb-2">Admin login</p>
        <h1 className="text-3xl font-semibold">Access the organizer console</h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Use a pre-approved admin email address. A magic link will be sent through Supabase auth.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error === "not-allowed"
              ? "This email is not allowlisted for admin access."
              : error === "rate-limited"
                ? "Supabase rejected the login email with: over_email_send_rate_limit (email rate limit exceeded). Please wait a bit before trying again."
              : error === "redirect-misconfigured"
                ? "Supabase rejected the auth redirect URL. Check APP_BASE_URL and the allowed redirect URLs in Supabase Auth."
                : error === "email-provider-disabled"
                  ? "Supabase email login is not enabled for this project."
                : error === "send-failed"
                  ? "Supabase could not send the magic link email. Please check the project auth/email configuration and try again."
              : error === "callback-failed"
                ? "This magic link could not be completed. Please request a new one."
                : error === "missing-code"
                  ? "This magic link is incomplete. Please request a new one."
                  : "Admin login could not be started."}
          </div>
        ) : null}
        {sent ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Magic link sent. Open your email on this device and come back after signing in.
          </div>
        ) : null}

        <form action={adminLoginAction} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Admin email</label>
            <input name="email" type="email" required className="field" placeholder="admin@example.com" />
          </div>
          <SubmitButton pendingLabel="Sending magic link...">Send magic link</SubmitButton>
        </form>

        <Link href="/" className="btn-secondary mt-4">
          Back to public flow
        </Link>
      </div>
    </div>
  );
}
