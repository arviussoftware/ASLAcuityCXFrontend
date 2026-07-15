"use client";
import UserAuthForm from "@/components/user-auth-form";
import ForgotPasswordForm from "@/components/forgot-password-form";
import VerifyOtpForm from "@/components/verify-otp-form";
import BrandLogo from "@/components/brand-logo";
import LoginFooter from "@/components/login/login-footer";
import LegalModal from "@/components/login/legal-modal";
import "./globals.css";
import { useEffect, useState } from "react";

const LoginPage = () => {
  const [mode, setMode] = useState("signIn");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("samlEmail")) {
      sessionStorage.clear();
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
  }, []);

  const modeDescription =
    mode === "forgotPassword"
      ? "Enter your details to reset your password."
      : "Verify OTP and reset password";

  return (
    <div
      className="relative grid h-screen h-[100dvh] grid-rows-[1fr_auto] overflow-hidden text-[#2d3748]"
      style={{
        background: "linear-gradient(135deg, var(--brand-body-from) 0%, var(--brand-body-mid) 40%, var(--brand-body-to) 100%)"
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 [background-position:0_0,15px_15px] [background-size:60px_60px,30px_30px]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--brand-dot-teal-1) 1px, transparent 1px), radial-gradient(circle, var(--brand-dot-teal-2) 1px, transparent 1px)"
        }}
      />

      <main className="relative z-10 flex min-h-0 items-center justify-center overflow-hidden px-5 py-3">
        <div className="w-full max-w-[420px] rounded-2xl bg-[rgba(255,255,255,0.97)] px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)] sm:px-10 sm:py-6">
          <div className="mb-6 text-center">
            <BrandLogo className="mx-auto h-16 w-auto max-w-[220px]" />
          </div>

          {mode === "signIn" && (
            <UserAuthForm
              showLogo={false}
              onForgotPassword={() => setMode("forgotPassword")}
            />
          )}

          {mode !== "signIn" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <p className="text-sm text-[#6b7a90]">{modeDescription}</p>
              </div>

              {mode === "forgotPassword" && (
                <ForgotPasswordForm
                  onSuccess={(email) => {
                    setEmailOrUsername(email);
                    setMode("verifyOtp");
                  }}
                />
              )}

              {mode === "verifyOtp" && (
                <VerifyOtpForm
                  emailOrUsername={emailOrUsername}
                  onSuccess={() => setMode("signIn")}
                />
              )}
            </div>
          )}
        </div>
      </main>

      <LoginFooter onOpen={setActiveModal} />
      <LegalModal
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};

export default LoginPage;
