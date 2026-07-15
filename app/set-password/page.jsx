// app/set-password/page.jsx
"use client";

import SetPasswordForm from "@/components/set-password-form";
import BrandLogo from "@/components/brand-logo";
import { useBranding } from "@/lib/use-branding";
import "../globals.css";

export default function SetPasswordPage() {
  const branding = useBranding();

  return (
    <div className="relative grid h-screen h-[100dvh] grid-rows-[1fr] overflow-hidden bg-[linear-gradient(135deg,#1A3A6E_0%,#0d2244_40%,#0e3a5c_100%)]">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(32,178,170,0.15)_1px,transparent_1px),radial-gradient(circle,rgba(32,178,170,0.08)_1px,transparent_1px)] [background-position:0_0,15px_15px] [background-size:60px_60px,30px_30px]" />

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center px-5">
        <div className="w-full max-w-[420px] rounded-2xl bg-[rgba(255,255,255,0.97)] px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)] sm:px-10">
          {/* Logo */}
          <div className="mb-6 text-center">
            <BrandLogo
              className="mx-auto h-16 w-auto max-w-[220px]"
              branding={branding}
            />
          </div>

          {/* Heading */}
          <div className="mb-6 text-center space-y-2">
            <h1 className="text-xl font-semibold text-[#1f2937]">
              Set New Password
            </h1>

            <p className="text-sm text-[#6b7a90]">
              Create a strong new password for your account.
            </p>
          </div>

          {/* Password Form */}
          <SetPasswordForm />
        </div>
      </main>
    </div>
  );
}
