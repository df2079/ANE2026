import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVoterExportRows } from "@/lib/data";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

function toCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  const allowedEmails = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
  if (!user?.email || !allowedEmails.includes(normalizeEmail(user.email))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rows = await getVoterExportRows();
  const csv = [
    ["email", "newsletter_consent"],
    ...rows.map((row) => [row.email, row.newsletter_opt_in ? "yes" : "no"])
  ]
    .map((line) => line.map((value) => toCsvValue(String(value))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="art-niche-expo-voters.csv"'
    }
  });
}
