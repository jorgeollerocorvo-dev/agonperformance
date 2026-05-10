import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isJorge } from "@/lib/jorge";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card } from "@/components/ui/Card";

export default async function CoachesAreaPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const session = await auth();

  // Only Jorge can access the Coaches Area
  if (!isJorge(session)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="text-center py-8">
          <h2 className="text-lg font-semibold">👋 Welcome to the Coaches Area</h2>
          <p className="text-sm text-[var(--ink-muted)] mt-2">
            Select a coach from the sidebar to view their athletes, programs, and custom movements.
          </p>
        </div>
      </Card>
    </div>
  );
}
