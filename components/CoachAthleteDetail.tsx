"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Card";
import AthleteEditModal from "./AthleteEditModal";

interface CoachAthleteDetailProps {
  athlete: {
    id: string;
    fullName: string;
    displayName: string | null;
    sex: string | null;
    age: number | null;
    dob?: Date | null;
    email: string | null;
    phone: string | null;
    heightCm: number | null;
    weightKg: number | null;
    division: string | null;
    competitiveGoal: string | null;
    goals: string | null;
    notes: string | null;
    userId: string | null;
    user: { email?: string | null; displayName?: string | null; id?: string; passwordHash?: string | null } | null;
    programs: Array<{
      id: string;
      title: string;
      weeks?: Array<{ id: string }>;
    }>;
  };
  lang: string;
  coachId: string;
}

export default function CoachAthleteDetail({ athlete, lang, coachId }: CoachAthleteDetailProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const athleteEmail = athlete.email || athlete.user?.email;
  const athleteDisplayName = athlete.displayName || athlete.user?.displayName;

  return (
    <>
      <div className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
        {/* Athlete Header with Menu */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-base">{athlete.fullName}</h3>
            {athleteEmail && (
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">{athleteEmail}</p>
            )}
          </div>
          <div className="flex gap-2">
            {athlete.division && (
              <span className="text-xs text-[var(--ink-muted)] bg-[var(--surface-1)] px-2 py-1 rounded whitespace-nowrap">
                {athlete.division}
              </span>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="px-2 py-1 text-xs rounded bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition"
            >
              ⚙️ Manage
            </button>
          </div>
        </div>

        {/* Complete Athlete Profile */}
        <div className="space-y-4 text-xs">
          {/* Contact Information */}
          <div className="bg-[var(--surface-1)] p-3 rounded">
            <h4 className="font-semibold mb-2 text-[var(--ink-muted)]">Contact & Access</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[var(--ink-muted)]">Email:</span>
                <div className="font-medium break-all">{athleteEmail || "—"}</div>
              </div>
              <div>
                <span className="text-[var(--ink-muted)]">Phone:</span>
                <div className="font-medium">{athlete.phone || "—"}</div>
              </div>
              {athlete.userId && (
                <div>
                  <span className="text-[var(--ink-muted)]">Password Status:</span>
                  <div className="font-medium">
                    {athlete.user?.passwordHash ? (
                      <span className="text-green-600">✓ Set</span>
                    ) : (
                      <span className="text-orange-600">⚠ Not set</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Physical Information */}
          <div className="bg-[var(--surface-1)] p-3 rounded">
            <h4 className="font-semibold mb-2 text-[var(--ink-muted)]">Physical Info</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[var(--ink-muted)]">Sex:</span>
                <div className="font-medium">
                  {athlete.sex === "M" ? "Male" : athlete.sex === "F" ? "Female" : athlete.sex || "—"}
                </div>
              </div>
              <div>
                <span className="text-[var(--ink-muted)]">Age:</span>
                <div className="font-medium">{athlete.age || "—"}</div>
              </div>
              <div>
                <span className="text-[var(--ink-muted)]">Height:</span>
                <div className="font-medium">{athlete.heightCm ? `${athlete.heightCm}cm` : "—"}</div>
              </div>
              <div>
                <span className="text-[var(--ink-muted)]">Weight:</span>
                <div className="font-medium">{athlete.weightKg ? `${athlete.weightKg}kg` : "—"}</div>
              </div>
            </div>
          </div>

          {/* Goals & Training */}
          <div className="bg-[var(--surface-1)] p-3 rounded">
            <h4 className="font-semibold mb-2 text-[var(--ink-muted)]">Training & Goals</h4>
            <div className="space-y-2">
              {athlete.division && (
                <div>
                  <span className="text-[var(--ink-muted)]">Division:</span>
                  <div className="font-medium">{athlete.division}</div>
                </div>
              )}
              {athlete.competitiveGoal && (
                <div>
                  <span className="text-[var(--ink-muted)]">Competitive Goal:</span>
                  <div className="font-medium">{athlete.competitiveGoal}</div>
                </div>
              )}
              {athlete.goals && (
                <div>
                  <span className="text-[var(--ink-muted)]">Standing Goals:</span>
                  <div className="font-medium">{athlete.goals}</div>
                </div>
              )}
              {athlete.notes && (
                <div>
                  <span className="text-[var(--ink-muted)]">Notes:</span>
                  <div className="font-medium">{athlete.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Programs Section */}
          {athlete.programs.length > 0 && (
            <div className="bg-[var(--surface-1)] p-3 rounded">
              <h4 className="font-semibold mb-2 text-[var(--ink-muted)]">
                {athlete.programs.length} Program{athlete.programs.length !== 1 ? "s" : ""}
              </h4>
              <ul className="space-y-1">
                {athlete.programs.map((prog) => (
                  <li key={prog.id} className="text-xs">
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
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <AthleteEditModal
          athlete={athlete}
          lang={lang}
          coachId={coachId}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
