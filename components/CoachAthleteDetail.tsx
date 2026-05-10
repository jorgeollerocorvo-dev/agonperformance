import Link from "next/link";

interface CoachAthleteDetailProps {
  athlete: {
    id: string;
    fullName: string;
    division: string | null;
    programs: Array<{
      id: string;
      title: string;
      weeks?: Array<{ id: string }>;
    }>;
  };
  lang: string;
}

export default function CoachAthleteDetail({ athlete, lang }: CoachAthleteDetailProps) {
  return (
    <div className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{athlete.fullName}</h3>
        {athlete.division && (
          <span className="text-xs text-[var(--ink-muted)] bg-[var(--surface-1)] px-2 py-1 rounded">
            {athlete.division}
          </span>
        )}
      </div>

      {athlete.programs.length === 0 ? (
        <p className="text-xs text-[var(--ink-muted)] mt-3">No programs yet</p>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-[var(--ink-muted)]">{athlete.programs.length} program(s)</p>
          <ul className="space-y-1">
            {athlete.programs.map((prog) => (
              <li key={prog.id} className="text-sm">
                <Link
                  href={`/${lang}/coach/programs/${prog.id}`}
                  className="text-[var(--primary)] hover:underline"
                >
                  • {prog.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
