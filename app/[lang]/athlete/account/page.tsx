import { redirect } from "next/navigation";

/**
 * Redirect to the canonical /account page — the athlete hub now lives there
 * so a single "Account" nav link shows everything (hub + settings).
 */
export default async function AthleteAccountRedirect({ params }: PageProps<"/[lang]/athlete/account">) {
  const { lang } = await params;
  redirect(`/${lang}/account`);
}
