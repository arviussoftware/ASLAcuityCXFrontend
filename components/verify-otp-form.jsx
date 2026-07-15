//components/verify-otp-form.jsx

"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export default function VerifyOtpForm({ emailOrUsername, className = "" }) {
  return (
    <div className={cn("grid gap-6", className)}>
      <div className="rounded-[14px] border-[1.5px] border-[#b8e4ef] bg-[#f0f9ff] px-6 py-5 text-center text-sm text-[#2d6a8a]">
        <p className="mb-2 text-base font-bold text-[#0d2244]">
          Verification link sent
        </p>
        <p className="mb-2 leading-7">
          We&apos;ve sent a verification link to your email:{" "}
          <strong className="font-semibold text-[#0d2244]">
            {emailOrUsername}
          </strong>
        </p>
        <p>
          <a href="/" className="font-medium text-[#20b2aa] underline-offset-4 hover:underline">
            return to Login Page
          </a>
        </p>
      </div>
    </div>
  );
}

