import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getValidatedEnv } from "@/lib/env";
import { isAllowedAdminEmail } from "@/lib/auth";
import type { Database } from "@/lib/supabase/types";

export async function GET(request: Request) {
  const env = getValidatedEnv();
  const response = NextResponse.redirect(new URL("/admin", request.url));
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get("cookie") ?? "";
          return cookieHeader
            .split(/;\s*/)
            .filter(Boolean)
            .map((item) => {
              const [name, ...value] = item.split("=");
              return { name, value: value.join("=") };
            });
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  if (!code && !(tokenHash && type)) {
    return NextResponse.redirect(new URL("/admin/login?error=missing-code", request.url));
  }

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        type: type as EmailOtpType,
        token_hash: tokenHash!
      });

  if (error) {
    return NextResponse.redirect(new URL("/admin/login?error=callback-failed", request.url));
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL("/admin/login?error=callback-failed", request.url));
  }

  if (!isAllowedAdminEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=not-allowed", request.url));
  }

  return response;
}
