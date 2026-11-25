import { NextResponse } from "next/server";
import { requireHqOwner } from "@/lib/agon-hq-owner";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await requireHqOwner();
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const token = process.env.AGON_HQ_INSTAGRAM_TOKEN?.trim();
  if (!token) return reply({ connected: false, message: "Authorize the AGON professional account in Meta and configure its token in Railway." });
  const version = process.env.AGON_HQ_INSTAGRAM_API_VERSION ?? "v25.0";
  if (!/^v\d{2}\.\d$/.test(version)) return reply({ connected: false, message: "Invalid Instagram API version." }, 503);
  // Both possible Meta login paths are read-only. Only accept the intended account.
  const accountId = process.env.AGON_HQ_INSTAGRAM_ACCOUNT_ID ?? "17841458256775193";
  if (!/^\d{8,25}$/.test(accountId)) return reply({ connected: false, message: "Invalid Instagram account ID." }, 503);
  const checks = [
    { host: "graph.instagram.com", node: "me", fields: "user_id,username", login: "Instagram Login" },
    { host: "graph.facebook.com", node: accountId, fields: "id,username", login: "Facebook Graph" },
  ];
  for (const check of checks) {
    try {
      const res = await fetch("https://" + check.host + "/" + version + "/" + check.node + "?fields=" + check.fields, {
        headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { username?: string; user_id?: string; id?: string };
      if (data.username?.toLowerCase() !== "agonperformanceqa" || !(data.user_id || data.id)) continue;
      let publishingPermission: "granted" | "not_listed" | "unverified" = "unverified";
      let insightsPermission: "granted" | "not_listed" | "unverified" = "unverified";
      let publishingQuotaReadable = false;
      if (check.login === "Facebook Graph") {
        try {
          const permissions = await fetch("https://graph.facebook.com/" + version + "/me/permissions?limit=100", {
            headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(10000),
          });
          if (permissions.ok) {
            const result = await permissions.json() as { data?: Array<{permission: string; status: string}>; paging?: {next?: string} };
            if (Array.isArray(result.data)) {
              const granted = (name: string) => result.data!.some(p => p.permission === name && p.status === "granted");
              publishingPermission = granted("instagram_content_publish") ? "granted" : result.paging?.next ? "unverified" : "not_listed";
              insightsPermission = granted("instagram_manage_insights") ? "granted" : result.paging?.next ? "unverified" : "not_listed";
            }
          }
        } catch { /* Some token types do not support user permission lookup. */ }
      }
      const verifiedId = data.user_id || data.id || "";
      if (/^\d{8,25}$/.test(verifiedId)) {
        try {
          const quota = await fetch("https://" + check.host + "/" + version + "/" + verifiedId + "/content_publishing_limit?fields=quota_usage", {
            headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(10000),
          });
          if (quota.ok) {
            const result = await quota.json() as {data?: Array<{quota_usage?: number}>};
            publishingQuotaReadable = Array.isArray(result.data) && result.data.some(row => typeof row.quota_usage === "number");
          }
        } catch { /* Read-only diagnostics must never expose upstream errors or secrets. */ }
      }
      return reply({ connected: true, username: data.username, login: check.login, publishingPermission, insightsPermission, publishingQuotaReadable, message: "Profile verified. Read-only publishing diagnostics completed; no content was created or published. Media delivery remains untested." });
    } catch { /* Never expose token or upstream response. */ }
  }
  return reply({ connected: false, message: "Neither login path verified the expected AGON profile. Check token type, permissions and Graph API version." }, 503);
}
