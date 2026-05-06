"use client";

import { useState } from "react";
import LogoutConfirmation from "./LogoutConfirmation";

export default function AccountLogoutButton({ lang }: { lang: string }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowLogoutModal(true)}
        className="px-6 py-3 bg-[#EF4444] text-white font-bold rounded-lg hover:bg-[#DC2626] transition-colors"
      >
        Log Out
      </button>
      <LogoutConfirmation
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </>
  );
}
