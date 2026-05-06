"use client";

import { useState } from "react";

export default function DeleteAthleteButton({
  athleteId,
  athleteName,
  lang,
  deleteAction,
}: {
  athleteId: string;
  athleteName: string;
  lang: string;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== athleteName) return;

    setIsDeleting(true);
    const formData = new FormData();
    formData.append("athleteId", athleteId);

    try {
      await deleteAction(formData);
    } catch (error) {
      console.error("Error deleting athlete:", error);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-3 py-1 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
      >
        Delete
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-red-600">Delete Athlete?</h2>

            <div className="space-y-3 text-sm">
              <p className="font-semibold">
                This will permanently delete <span className="text-red-600">{athleteName}</span> and all their data:
              </p>
              <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1 ml-2">
                <li>All programs assigned to this athlete</li>
                <li>All workout history and session logs</li>
                <li>All feedback and notes</li>
                <li>Their login account (if created)</li>
              </ul>
              <p className="text-red-600 font-semibold">
                ⚠️ This action cannot be undone.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                To confirm, type the athlete&#x2019;s name:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={athleteName}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 text-sm"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText("");
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== athleteName || isDeleting}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
