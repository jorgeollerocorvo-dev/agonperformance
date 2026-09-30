import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Web Push helper — VAPID keys read from env. Missing keys turn every call
 * into a no-op so nothing breaks in preview/dev environments.
 *
 * Setup (one-time on Railway):
 *   npx web-push generate-vapid-keys
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_SUBJECT=mailto:you@example.com
 *
 * The public key must also be exposed to the client as
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY so the browser can subscribe.
 */

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT ?? "mailto:noreply@agonperformance.app";
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(subj, pub, priv);
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Fire-and-forget push to every subscription owned by a user. Failed
 * subscriptions (410 Gone, 404) are deleted so we don't keep retrying dead
 * endpoints on every send.
 */
export async function pushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!configure()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }),
  );
}
