"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import CryptoJS from "crypto-js";
import withAuth from "./withAuth";

const schema = z
  .object({
    currentPassword: z.string().nonempty("Current password required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_+()]).{6,}$/,
        "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmPassword: z
      .string()
      .min(6, "Confirm password must match the new password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({
        path: ["newPassword"],
        message: "New password must be different from the current password",
      });
    }

    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        message: "Password do not match to the New password",
      });
    }
  });

const ResetPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const [message, setMessage] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const handleShowPassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const onSubmit = async (data) => {
    try {
      // const currentUserId = sessionStorage.getItem("user")
      //   ? JSON.parse(sessionStorage.getItem("user")).userId
      //   : null;
      const encryptedUserData = sessionStorage.getItem("user");

      let currentUserId = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          currentUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      if (!currentUserId) {
        throw new Error("User ID not found in session");
      }

      const response = await fetch(
        `/api/users/resetpassword/${currentUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify({
            oldPassword: data.currentPassword,
            newPassword: data.newPassword,
            currentUserId: currentUserId,
          }),
          cache: "no-store",
        }
      );

      const result = await response.json();
      if (response.ok) {
        setMessage("Password reset successfully");
        alert("Password reset successfully");
        reset(); // Clear the form fields
        router.push("/"); // Redirect to login after successful reset
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage("Password reset failed. Please try again.", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Current Password</label>
        <div className="relative">
          <Input
            type={showPassword.currentPassword ? "text" : "password"}
            {...register("currentPassword")}
            className="mt-1 w-full px-2 py-1 text-sm border border-border rounded-md"
          />
          <button
            type="button"
            onClick={() => handleShowPassword("currentPassword")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
          >
            {showPassword.currentPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="text-red-500 text-xs mt-1">
            {errors.currentPassword.message}
          </p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium">New Password</label>
        <div className="relative">
          <Input
            type={showPassword.newPassword ? "text" : "password"}
            {...register("newPassword")}
            className="mt-1 w-full px-2 py-1 text-sm border border-border rounded-md"
          />
          <button
            type="button"
            onClick={() => handleShowPassword("newPassword")}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-sm leading-5"
          >
            {showPassword.newPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-red-500 text-xs mt-1">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Confirm Password</label>
        <div className="relative">
          <Input
            type={showPassword.confirmPassword ? "text" : "password"}
            {...register("confirmPassword")}
            className="mt-1 w-full px-2 py-1 text-sm border border-border rounded-md"
          />
          <button
            type="button"
            onClick={() => handleShowPassword("confirmPassword")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
          >
            {showPassword.confirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-red-500 text-xs mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      <Button type="submit" className="mt-4">
        Reset Password
      </Button>
      {message && <p className="text-red-500 text-xs mt-4">{message}</p>}
    </form>
  );
};

export default withAuth(ResetPassword);

