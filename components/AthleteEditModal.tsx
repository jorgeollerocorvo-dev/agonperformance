"use client";

import { useState } from "react";
import { updateAthleteProfile, updateAthletePassword, generateTemporaryPassword } from "@/app/[lang]/admin/coaches/[coachId]/actions";

interface AthleteEditModalProps {
  athlete: {
    id: string;
    fullName: string;
    displayName: string | null;
    sex: string | null;
    age: number | null;
    email: string | null;
    phone: string | null;
    heightCm: number | null;
    weightKg: number | null;
    division: string | null;
    competitiveGoal: string | null;
    goals: string | null;
    notes: string | null;
    userId: string | null;
    user: { email?: string | null; passwordHash?: string | null } | null;
  };
  lang: string;
  coachId: string;
  onClose: () => void;
}

export default function AthleteEditModal({
  athlete,
  lang,
  coachId,
  onClose,
}: AthleteEditModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayedPassword, setDisplayedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const athleteEmail = athlete.email || athlete.user?.email;
  const hasPassword = athlete.user?.passwordHash;

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateAthleteProfile(formData, athlete.id, lang);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!passwordInput || !passwordConfirm) {
      setError("Both password fields are required");
      return;
    }

    if (passwordInput !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }

    if (passwordInput.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await updateAthletePassword(athlete.id, passwordInput, lang);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess("Password updated successfully!");
      setDisplayedPassword(result.password || passwordInput);
      setPasswordInput("");
      setPasswordConfirm("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--border)] p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Manage {athlete.fullName}</h2>
          <button
            onClick={onClose}
            className="text-2xl text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => {
              setActiveTab("profile");
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 px-4 py-3 font-medium border-b-2 transition ${
              activeTab === "profile"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            Profile Details
          </button>
          {athlete.userId && (
            <button
              onClick={() => {
                setActiveTab("password");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 px-4 py-3 font-medium border-b-2 transition ${
                activeTab === "password"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              Password
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {success}
            </div>
          )}

          {activeTab === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Personal Info */}
              <div>
                <label className="block text-sm font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  defaultValue={athlete.fullName}
                  required
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Display Name</label>
                  <input
                    type="text"
                    name="displayName"
                    defaultValue={athlete.displayName || ""}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={athleteEmail || ""}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={athlete.phone || ""}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Sex</label>
                  <select
                    name="sex"
                    defaultValue={athlete.sex || ""}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>

              {/* Physical Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    defaultValue={athlete.age || ""}
                    min="0"
                    max="150"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Height (cm)</label>
                  <input
                    type="number"
                    name="heightCm"
                    defaultValue={athlete.heightCm || ""}
                    min="0"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    name="weightKg"
                    defaultValue={athlete.weightKg || ""}
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Training Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Division</label>
                  <input
                    type="text"
                    name="division"
                    defaultValue={athlete.division || ""}
                    placeholder="e.g., Middleweight"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Competitive Goal</label>
                  <input
                    type="text"
                    name="competitiveGoal"
                    defaultValue={athlete.competitiveGoal || ""}
                    placeholder="e.g., Peak by June"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Standing Goals</label>
                <textarea
                  name="goals"
                  defaultValue={athlete.goals || ""}
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={athlete.notes || ""}
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary)]/90 disabled:opacity-50 transition"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--surface-2)] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {activeTab === "password" && athlete.userId && (
            <div className="space-y-6">
              {/* Password Status */}
              <div className={`p-4 rounded-lg border-2 ${
                hasPassword
                  ? "bg-green-50 border-green-200"
                  : "bg-orange-50 border-orange-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold ${hasPassword ? "text-green-700" : "text-orange-700"}`}>
                      {hasPassword ? "✓ Password Set" : "⚠️ No Password Set"}
                    </p>
                    <p className={`text-sm mt-1 ${hasPassword ? "text-green-600" : "text-orange-600"}`}>
                      {hasPassword
                        ? `${athlete.fullName} can log in with their email and password`
                        : `${athlete.fullName} cannot log in until a password is set`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Generate Password */}
              {!displayedPassword && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-3">
                    Quickly generate a temporary password for {athlete.fullName}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      const tempPass = await generateTemporaryPassword();
                      setPasswordInput(tempPass);
                      setPasswordConfirm(tempPass);
                      setLoading(false);
                    }}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    🔐 Generate Temporary Password
                  </button>
                </div>
              )}

              {/* Manual Password Entry Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-sm">Or Enter Password Manually</h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1">New Password *</label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Confirm Password *</label>
                      <input
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>
                </div>

                {passwordInput && passwordConfirm && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm font-semibold text-purple-700 mb-2">Password Preview:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded text-sm font-mono">
                        {showPassword ? passwordInput : "•".repeat(passwordInput.length)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="px-3 py-2 text-sm bg-white border border-purple-200 rounded hover:bg-purple-50"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(passwordInput);
                          setCopiedToClipboard(true);
                          setTimeout(() => setCopiedToClipboard(false), 2000);
                        }}
                        className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                      >
                        {copiedToClipboard ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !passwordInput || !passwordConfirm}
                    className="flex-1 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary)]/90 disabled:opacity-50 transition"
                  >
                    {loading ? "Setting Password..." : "Set Password"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--surface-2)] transition"
                  >
                    Done
                  </button>
                </div>
              </form>

              {displayedPassword && (
                <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                  <p className="font-semibold text-green-700 mb-2">✓ Password Set Successfully!</p>
                  <p className="text-sm text-green-600">
                    Share this password with {athlete.fullName} so they can log in.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-white border border-green-300 rounded font-mono text-sm">
                      {displayedPassword}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(displayedPassword);
                        setCopiedToClipboard(true);
                        setTimeout(() => setCopiedToClipboard(false), 2000);
                      }}
                      className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      {copiedToClipboard ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
