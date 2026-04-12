import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  console.error(".env.local was not found.");
  process.exit(1);
}

const contents = fs.readFileSync(envPath, "utf8");
const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "ADMIN_EMAILS"
];

const missing = requiredKeys.filter((key) => {
  const match = contents.match(new RegExp(`^${key}=(.*)$`, "m"));
  return !match || !match[1]?.trim();
});

if (missing.length) {
  console.error(`Missing required env vars in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(".env.local contains the required Supabase app variables.");
