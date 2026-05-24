"use client";

import { useState } from "react";
import LogoutConfirmation from "./LogoutConfirmation";

export default function AccountLogoutButton({
  lang,
  compact = false,
}: {
  lang: string;
  compact?: boolean;
}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const className = compact
    ? "px-3 py-1.5 bg-[#EF4444] text-white text-sm font-semibold rounded-md hover:bg-[#DC2626] transition-colors whitespace-nowrap"
    : "px-6 py-3 bg-[#EF4444] text-white font-bold rounded-lg hover:bg-[#DC2626] transition-colors";

  return (
    <>
      <button onClick={() => setShowLogoutModal(true)} className={className}>
        Log Out
      </button>
      <LogoutConfirmation
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </>
  );
}
