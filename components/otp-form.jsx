// components/otp-form.jsx

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/lib/icons";
import { useRouter } from "next/navigation";

const FormSchema = z.object({
  otp: z.string().min(4, "OTP is required"),
});

export default function OTPForm({ email, className = "", ...rest }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(FormSchema),
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [isExpired, setIsExpired] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const router = useRouter();

  // Helper: check OTP status
  const checkOtpStatus = async () => {
    try {
      const res = await fetch(`/api/users/check-otp-status?email=${email}`);
      const data = await res.json();

      setIsExpired(data.isExpired);
    } catch (err) {
      console.error("[checkOtpStatus] Failed:", err);
    }
  };

  // Run on mount
  React.useEffect(() => {
    checkOtpStatus();
  }, [email]);

  // Submit handler
  const onSubmit = async (data) => {
    setIsLoading(true);
    clearErrors();

    try {
      const response = await fetch("/api/users/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({ otp: data.otp, email }),
      });

      const resultText = await response.text();

      let result;
      try {
        result = JSON.parse(resultText);
      } catch (jsonErr) {
        console.error(
          "[onSubmit] Failed to parse JSON. Raw text was:",
          resultText
        );
        throw new Error("Server response is not valid JSON");
      }

      if (response.ok && result.success) {
        sessionStorage.setItem("otpVerified", "true");
        sessionStorage.setItem("otpUserId", result.userId);
        alert("OTP verified! Please set your password.");
        router.push("/set-password");
      } else {
        console.warn("[onSubmit] OTP verification failed:", result);

        clearErrors();

        if (
          result.reason === "expired" ||
          (result.message && result.message.toLowerCase().includes("expired"))
        ) {
          setIsExpired(true);
          return;
        }

        setError("otp", {
          message: "Invalid OTP. Please try again.",
        });
      }
    } catch (error) {
      setError("generic", {
        message: "Unexpected error. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Resend handler
  const handleResend = async () => {
    setResending(true);

    try {
      const res = await fetch("/api/users/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({ email }),
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        console.error("[handleResend] Failed to parse JSON:", text);
        throw new Error("Invalid JSON response when resending OTP");
      }

      alert(data.message);

      if (res.ok) {
        await checkOtpStatus();
        clearErrors();
      }
    } catch (error) {
      console.error("[handleResend] Error:", error);
      alert("Something went wrong while resending OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={cn("grid gap-6", className)} {...rest}>
      {isExpired ? (
        <div className="text-center">
          <p className="text-red-500">Your OTP has expired.</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm underline text-primary disabled:opacity-50 mt-2"
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>
        </div>
      ) : (
        <form
          method="POST"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }}
        >
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="otp">
                OTP
              </Label>
              <Input
                id="otp"
                name="otp"
                placeholder="Enter OTP"
                type="text"
                autoComplete="off"
                disabled={isLoading || isSubmitting}
                {...register("otp")}
              />
              {errors.otp && (
                <p className="text-destructive text-xs">{errors.otp.message}</p>
              )}
            </div>

            <p className="text-center text-destructive text-xs">
              {errors.generic ? errors.generic.message : ""}
            </p>

            <Button disabled={isLoading || isSubmitting} type="submit">
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify OTP
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

