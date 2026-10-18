import { redirect } from "next/navigation";

/**
 * Individual message threads retired alongside the /messages inbox.
 * Any deep link lands on the general /messages redirector, which routes
 * to WhatsApp based on the viewer's role.
 */
export default async function MessagesThreadRedirect({ params }: PageProps<"/[lang]/messages/[id]">) {
  const { lang } = await params;
  redirect(`/${lang}/messages`);
}
