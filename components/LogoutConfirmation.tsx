"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutConfirmation({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });
      if (response.ok) {
        setIsSuccess(true);
        // Show success message for 1.5 seconds before redirecting
        setTimeout(() => {
          router.push("/en");
          router.refresh();
        }, 1500);
      }
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={!isSuccess && !isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`bg-white rounded-lg shadow-lg max-w-sm w-full p-8 transition-all ${
          isSuccess ? 'scale-95 opacity-90' : 'scale-100 opacity-100'
        }`}>
          <div className="text-center">
            {isSuccess ? (
              <>
                <div className="text-5xl mb-4 animate-bounce">✓</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  Logged Out Successfully
                </h2>
                <p className="text-[#666666] mb-4">
                  See you next time! Redirecting...
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">👋</div>
                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
                  Logging Out
                </h2>
                <p className="text-[#666666] mb-8">
                  Are you sure you want to log out? You can log back in anytime.
                </p>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-6 py-3 border-2 border-[#E5E5E5] text-[#1A1A1A] font-bold rounded-lg hover:border-[#1A1A1A] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="px-6 py-3 bg-[#EF4444] text-white font-bold rounded-lg hover:bg-[#DC2626] transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Logging Out..." : "Log Out"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
