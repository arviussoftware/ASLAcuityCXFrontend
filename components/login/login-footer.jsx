"use client";

import { footerLinks } from "@/components/login/legal-content";

export default function LoginFooter({ onOpen }) {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[rgba(5,12,28,0.88)] px-6 py-3 text-center">
      <div className="mb-1.5 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
        {footerLinks.map(([key, label], index) => (
          <div key={key} className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => onOpen(key)}
              className="text-[11px] font-medium text-[#8a9ab8] transition hover:text-[#20b2aa]"
            >
              {label}
            </button>
            {index < footerLinks.length - 1 && (
              <span className="text-[11px] text-[#3a4a65]">|</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#5a6b88]">
        &copy; 2025 AcuityCx. All rights reserved. Unauthorised access is
        prohibited.
      </p>
    </footer>
  );
}
