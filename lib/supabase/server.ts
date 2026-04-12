import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getValidatedEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

function trySetCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  name: string,
  value: string,
  options: Record<string, unknown>
) {
  try {
    cookieStore.set(name, value, options);
  } catch {
    // Server Component renders may refresh auth state, but Next.js only allows
    // cookie writes inside Server Actions and Route Handlers.
  }
}

export async function createSupabaseServerClient() {
  const env = getValidatedEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          trySetCookie(cookieStore, name, value, options);
        },
        remove(name: string, options: Record<string, unknown>) {
          trySetCookie(cookieStore, name, "", { ...options, maxAge: 0 });
        }
      }
    }
  );
}
