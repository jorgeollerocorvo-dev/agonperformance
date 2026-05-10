import Link from "next/link";

interface CoachSidebarItemProps {
  coach: {
    id: string;
    user: { id: string; email: string | null; displayName: string | null };
    athletes: Array<{ id: string; fullName: string; division: string | null; programs: Array<{ id: string }> }>;
  };
  lang: string;
}

export default function CoachSidebarItem({ coach, lang }: CoachSidebarItemProps) {
  const displayName = coach.user.displayName || coach.user.email?.split("@")[0] || "Coach";
  const athleteCount = coach.athletes.length;
  const programCount = coach.athletes.reduce((sum, athlete) => sum + athlete.programs.length, 0);

  return (
    <Link href={`/${lang}/admin/coaches/${coach.id}`}>
      <div className="p-3 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-2)] transition cursor-pointer">
        <div className="font-semibold text-sm">{displayName}</div>
        {coach.user.email && (
          <div className="text-xs text-[var(--ink-muted)] mt-0.5">{coach.user.email}</div>
        )}
        <div className="text-xs text-[var(--ink-subtle)] mt-2 flex gap-3">
          <span>👥 {athleteCount}</span>
          <span>📋 {programCount}</span>
        </div>
      </div>
    </Link>
  );
}
