import Link from "next/link";

interface CoachAthleteDetailProps {
  athlete: {
    id: string;
    fullName: string;
    displayName: string | null;
    sex: string | null;
    age: number | null;
    division: string | null;
    competitiveGoal: string | null;
    goals: string | null;
    email: string | null;
    user: { email: string | null; displayName: string | null } | null;
    programs: Array<{
      id: string;
      title: string;
      weeks?: Array<{ id: string }>;
    }>;
  };
  lang: string;
}

export default function CoachAthleteDetail({ athlete, lang }: CoachAthleteDetailProps) {
  const athleteEmail = athlete.email || athlete.user?.email;
  const athleteDisplayName = athlete.displayName || athlete.user?.displayName;

  return (
    <div className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
      {/* Athlete Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-base">{athlete.fullName}</h3>
          {athleteEmail && (
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">{athleteEmail}</p>
          )}
        </div>
        {athlete.division && (
          <span className="text-xs text-[var(--ink-muted)] bg-[var(--surface-1)] px-2 py-1 rounded whitespace-nowrap">
            {athlete.division}
          </span>
        )}
      </div>

      {/* Athlete Info Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-4 pb-4 border-b border-[var(--border)]">
        {athlete.sex && (
          <div>
            <span className="text-[var(--ink-muted)]">Sex:</span>
            <div className="font-medium">{athlete.sex === "M" ? "Male" : athlete.sex === "F" ? "Female" : athlete.sex}</div>
          </div>
        )}
        {athlete.age && (
          <div>
            <span className="text-[var(--ink-muted)]">Age:</span>
            <div className="font-medium">{athlete.age}</div>
          </div>
        )}
        {athlete.competitiveGoal && (
          <div className="col-span-2">
            <span className="text-[var(--ink-muted)]">Competitive Goal:</span>
            <div className="font-medium text-xs">{athlete.competitiveGoal}</div>
          </div>
        )}
        {athlete.goals && (
          <div className="col-span-2">
            <span className="text-[var(--ink-muted)]">Standing Goals:</span>
            <div className="font-medium text-xs">{athlete.goals}</div>
          </div>
        )}
      </div>

      {/* Programs Section */}
      {athlete.programs.length === 0 ? (
        <p className="text-xs text-[var(--ink-muted)]">No programs yet</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--ink-muted)]">
            {athlete.programs.length} Program{athlete.programs.length !== 1 ? "s" : ""}
          </p>
          <ul className="space-y-1">
            {athlete.programs.map((prog) => (
              <li key={prog.id} className="text-sm">
                <Link
                  href={`/${lang}/coach/programs/${prog.id}`}
                  className="text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  → {prog.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
