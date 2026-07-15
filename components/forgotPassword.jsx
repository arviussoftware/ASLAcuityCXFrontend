// components\forgot-password-form.jsx
"use client";
import { z } from "zod";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Icons } from "@/lib/icons";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";

import withAuth from "@/components/withAuth";

const FormSchema = z
  .object({
    emailOrUsername: z.string().min(1, "Email or LoginId is required"),
    newPassword: z.string().min(1, "New Password is required"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export function ForgotPasswordForm({ onSuccess, ...props }, className = "") {
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
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const onSubmit = async (data) => {
    setIsLoading(true);
    clearErrors();

    try {
      const response = await fetch("/api/forgotPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          username: data.emailOrUsername,
          newPassword: data.newPassword,
        }),
        cache: "no-store",
      });
      const result = await response.json();
      if (response.ok) {
        alert("Password reset successfully.");
        if (onSuccess) onSuccess();
      } else {
        setError("generic", {
          message: result.message || "Failed to reset password.",
        });
      }
    } catch (error) {
      setError("generic", {
        message: "An unexpected error occurred. Please try again later.",
      });
      console.error("Forgot password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form
        method="POST"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit)();
        }}
      >
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="emailOrUsername">
              Email or LoginId
            </Label>
            <Input
              id="emailOrUsername"
              placeholder="Email or LoginId"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={isLoading}
              {...register("emailOrUsername")}
            />
            {errors.emailOrUsername && (
              <p className="text-destructive text-xs">
                {errors.emailOrUsername.message}
              </p>
            )}

            <Label className="sr-only" htmlFor="newPassword">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                placeholder="New Password"
                type={showPassword ? "text" : "password"}
                disabled={isLoading}
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-destructive text-xs">
                {errors.newPassword.message}
              </p>
            )}

            <Label className="sr-only" htmlFor="confirmPassword">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                placeholder="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                disabled={isLoading}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-destructive text-xs">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <p className="text-center text-destructive text-xs">
            {errors.generic ? errors.generic.message : ""}
          </p>
          <Button disabled={isLoading || isSubmitting} type="submit">
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Reset Password
          </Button>
        </div>
      </form>
    </div>
  );
}

export default withAuth(ForgotPasswordForm);
