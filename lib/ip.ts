import { headers } from "next/headers";
import crypto from "node:crypto";

export async function getIpHash() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex");
}
