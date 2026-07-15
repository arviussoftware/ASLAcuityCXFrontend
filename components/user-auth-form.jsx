// components/user-auth-form.jsx
"use client";
import * as React from "react";
import CryptoJS from "crypto-js";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/lib/icons";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, UserRound } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/brand-logo";
import { buildLoginRedirectPath } from "@/lib/auth/redirect";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../lib/msalConfig";



const FormSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or LoginId is required"),
  password: z.string().min(1, "Password is required"),
});

export function UserAuthForm(props = {}, className = "") {
  const { onForgotPassword, showLogo = true, ...containerProps } = props;
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
  const [authTab, setAuthTab] = React.useState("domain");
  const router = useRouter();
  const { instance } = useMsal();

  const onSubmit = async (data) => {
    setIsLoading(true);
    clearErrors(); // Clear previous errors before making a new request

    let response; // Declare response variable outside the try block
    try {
      response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.emailOrUsername,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const encryptedUser = CryptoJS.AES.encrypt(
          JSON.stringify(result.user),
          "",
        ).toString();
        const encryptedtoken = CryptoJS.AES.encrypt(
          JSON.stringify(result.token),
          "",
        ).toString();
        //sessionStorage.setItem("tempDashboardData", encryptedText);
        sessionStorage.setItem("token", encryptedtoken);
        sessionStorage.setItem("user", encryptedUser);
        const user = result.user || null;
        if (user) {
          try {
            const encryptedUser = CryptoJS.AES.encrypt(
              JSON.stringify({
                userId: user.userId,
                loginId: user.loginId,
                userFullName: user.userFullName,
                userRoles: user.userRoles,
                email: user.email,
                organization: user.organization || [],
                licensedModules: user.licensedModules || [],
                // DO NOT store email/password or other sensitive fields
              }),
              "",
            ).toString();
            sessionStorage.setItem("user", encryptedUser);

            // const primaryOrgId = user?.organization?.[0]?.orgId;
            // const primaryOrgName =
            //   user?.organization?.[0]?.org_name ||
            //   user?.organization?.[0]?.orgName ||
            //   user?.organization?.[0]?.name ||
            //   user?.organization?.[0]?.organizationName ||
            //   "";
            // if (primaryOrgId) {
            //   sessionStorage.setItem("selectedOrgId", String(primaryOrgId));
            // }
            // if (primaryOrgName) {
            //   sessionStorage.setItem("selectedOrgName", String(primaryOrgName));
            // }
            const organizations = user?.organization || [];

            const orgIds = organizations.map((org) => org.orgId);

            const orgNames = organizations.map(
              (org) =>
                org.org_name ||
                org.orgName ||
                org.name ||
                org.organizationName ||
                "",
            );

            // store all orgs
            sessionStorage.setItem("selectedOrgIds", JSON.stringify(orgIds));
            sessionStorage.setItem(
              "selectedOrgNames",
              JSON.stringify(orgNames),
            );

            // store currently active org (default = first org)
            if (orgIds.length > 0) {
              sessionStorage.setItem("selectedOrgId", String(orgIds[0]));
            }

            if (orgNames.length > 0) {
              sessionStorage.setItem("selectedOrgName", String(orgNames[0]));
            }
          } catch (e) {
            console.warn("Could not store user info locally", e);
          }
        }

        // After login, call protected APIs — browser will include cookie automatically.
        // Modules/permissions calls should not send Authorization header or loggedInUserId.
        const [modules, permissions] = await Promise.all([
          fetchModules(),
          fetchPermissions(),
          loadRoles(),
        ]);

        const redirectPath = buildLoginRedirectPath(
          modules,
          permissions,
          result.user?.licensedModules || [],
        );
        // after getting redirectPath from getFirstPermittedPath...
        // if (redirectPath) {
        //   // store for later (so mobile-not-supported can read it)
        //   try {
        //     sessionStorage.setItem("redirectPath", redirectPath);
        //   } catch (e) {
        //     console.warn("Could not persist redirectPath", e);
        //   }
        //   router.push(redirectPath);
        // } else {
        //   alert("You don't have access to any modules.");
        // }
        if (redirectPath) {
          router.push("/dashboard/users");
        } else {
          alert("You don't have access to any modules.");
        }
      } else {
        const errorMessage =
          result?.message ||
          "An unexpected error occurred. Please try again later.";
        setError("generic", { message: errorMessage });
        return;
      }
    } catch (error) {
      // Handle errors based on the response status if response is defined
      if (response) {
        if (response.status === 400) {
          setError("generic", {
            message: "Invalid username or password format.",
          });
        } else if (response.status === 404) {
          setError("generic", {
            message: "Username or email does not exist.",
          });
        } else if (response.status === 401) {
          setError("generic", {
            message: "Incorrect username or password.",
          });
        } else if (response.status === 403) {
          setError("generic", {
            message: "Your account does not exists.",
          });
        } else {
          // Handle any other unexpected errors
          setError("generic", {
            message: "An unexpected error occurred. Please try again later.",
          });
        }
      } else {
        // Handle network or unexpected errors
        setError("generic", {
          message: "An unexpected error occurred. Please try again later.",
        });
      }

      console.error("Login error:", error); // Log the error for debugging
    } finally {
      setIsLoading(false);
    }
  };

  const handleAzureAdLogin = async () => {
    setIsLoading(true);
    clearErrors();
    let response;
    try {
      const azureLoginResult = await instance.loginPopup(loginRequest);
      const azureAccount =
        azureLoginResult?.account || instance.getActiveAccount();
      const azureEmail =
        azureAccount?.username ||
        azureAccount?.idTokenClaims?.preferred_username ||
        azureAccount?.idTokenClaims?.email;

      if (!azureEmail) {
        setError("generic", {
          message: "Unable to read email from Azure AD login.",
        });
        return;
      }
      sessionStorage.setItem("authType", "azureAD");

      response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: azureEmail,
          password: "azuread",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const encryptedUser = CryptoJS.AES.encrypt(
          JSON.stringify(result.user),
          "",
        ).toString();
        const encryptedtoken = CryptoJS.AES.encrypt(
          JSON.stringify(result.token),
          "",
        ).toString();

        sessionStorage.setItem("token", encryptedtoken);
        sessionStorage.setItem("user", encryptedUser);

        const user = result.user || null;
        if (user) {
          try {
            const localEncryptedUser = CryptoJS.AES.encrypt(
              JSON.stringify({
                userId: user.userId,
                loginId: user.loginId,
                userFullName: user.userFullName,
                userRoles: user.userRoles,
                email: user.email,
                organization: user.organization || [],
                licensedModules: user.licensedModules || [],
              }),
              "",
            ).toString();
            sessionStorage.setItem("user", localEncryptedUser);

            // const primaryOrgId = user?.organization?.[0]?.orgId;
            // const primaryOrgName =
            //   user?.organization?.[0]?.org_name ||
            //   user?.organization?.[0]?.orgName ||
            //   user?.organization?.[0]?.name ||
            //   user?.organization?.[0]?.organizationName ||
            //   "";

            // if (primaryOrgId) {
            //   sessionStorage.setItem("selectedOrgId", String(primaryOrgId));
            // }
            // if (primaryOrgName) {
            //   sessionStorage.setItem("selectedOrgName", String(primaryOrgName));
            // }
            const organizations = user?.organization || [];

            const orgIds = organizations.map((org) => org.orgId);

            const orgNames = organizations.map(
              (org) =>
                org.org_name ||
                org.orgName ||
                org.name ||
                org.organizationName ||
                "",
            );

            // store all orgs
            sessionStorage.setItem("selectedOrgIds", JSON.stringify(orgIds));
            sessionStorage.setItem(
              "selectedOrgNames",
              JSON.stringify(orgNames),
            );

            // store currently active org (default = first org)
            if (orgIds.length > 0) {
              sessionStorage.setItem("selectedOrgId", String(orgIds[0]));
            }

            if (orgNames.length > 0) {
              sessionStorage.setItem("selectedOrgName", String(orgNames[0]));
            }
          } catch (e) {
            console.warn("Could not store user info locally", e);
          }
        }

        const [modules, permissions] = await Promise.all([
          fetchModules(),
          fetchPermissions(),
          loadRoles(),
        ]);

        const redirectPath = buildLoginRedirectPath(
          modules,
          permissions,
          result.user?.licensedModules || [],
        );
        if (redirectPath) {
          router.push(redirectPath);
        } else {
          alert("You don't have access to any modules.");
        }
      } else {
        setError("generic", {
          message:
            result?.message ||
            "Azure AD login failed. Please try again later.",
        });
      }
    } catch (error) {
      if (response?.status === 404) {
        setError("generic", {
          message: "Azure AD email does not exist in the system.",
        });
      } else if (response?.status === 403) {
        setError("generic", {
          message: "Your account does not exists.",
        });
      } else {
        setError("generic", {
          message: "An unexpected error occurred. Please try again later.",
        });
      }

      console.error("Azure AD login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlesamlLogin = async (azureEmail) => {
    sessionStorage.setItem("authType", "saml");
    debugger;
    setIsLoading(true);
    clearErrors();
    let response;
    try {
      if (!azureEmail) {
        setError("generic", {
          message: "Unable to read email from Azure AD login.",
        });
        return;
      }
      sessionStorage.setItem("authType", "saml");

      response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: azureEmail,
          password: "azuread",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const encryptedUser = CryptoJS.AES.encrypt(
          JSON.stringify(result.user),
          "",
        ).toString();
        const encryptedtoken = CryptoJS.AES.encrypt(
          JSON.stringify(result.token),
          "",
        ).toString();

        sessionStorage.setItem("token", encryptedtoken);
        sessionStorage.setItem("user", encryptedUser);

        const user = result.user || null;
        if (user) {
          try {
            const localEncryptedUser = CryptoJS.AES.encrypt(
              JSON.stringify({
                userId: user.userId,
                loginId: user.loginId,
                userFullName: user.userFullName,
                userRoles: user.userRoles,
                email: user.email,
                organization: user.organization || [],
                licensedModules: user.licensedModules || [],
              }),
              "",
            ).toString();
            sessionStorage.setItem("user", localEncryptedUser);
            const organizations = user?.organization || [];

            const orgIds = organizations.map((org) => org.orgId);

            const orgNames = organizations.map(
              (org) =>
                org.org_name ||
                org.orgName ||
                org.name ||
                org.organizationName ||
                "",
            );

            // store all orgs
            sessionStorage.setItem("selectedOrgIds", JSON.stringify(orgIds));
            sessionStorage.setItem("authType", "saml");
            sessionStorage.setItem(
              "selectedOrgNames",
              JSON.stringify(orgNames),
            );

            // store currently active org (default = first org)
            if (orgIds.length > 0) {
              sessionStorage.setItem("selectedOrgId", String(orgIds[0]));
            }

            if (orgNames.length > 0) {
              sessionStorage.setItem("selectedOrgName", String(orgNames[0]));
            }
          } catch (e) {
            console.warn("Could not store user info locally", e);
          }
        }

        const [modules, permissions] = await Promise.all([
          fetchModules(),
          fetchPermissions(),
          loadRoles(),
        ]);

        const redirectPath = buildLoginRedirectPath(
          modules,
          permissions,
          result.user?.licensedModules || [],
        );
        if (redirectPath) {
          router.push(redirectPath);
        } else {
          alert("You don't have access to any modules.");
        }
      } else {
        setError("generic", {
          message:
            result?.message ||
            "Azure AD login failed. Please try again later.",
        });
      }
    } catch (error) {
      if (response?.status === 404) {
        setError("generic", {
          message: "Azure AD email does not exist in the system.",
        });
      } else if (response?.status === 403) {
        setError("generic", {
          message: "Your account does not exists.",
        });
      } else {
        setError("generic", {
          message: "An unexpected error occurred. Please try again later.",
        });
      }

      console.error("Azure AD login error:", error);
    } finally {
      setIsLoading(false);
    }
  };



  React.useEffect(() => {
    debugger;
    if (typeof window !== "undefined") {
      let user = null;
      const cookiesList = document.cookie.split(";");
      const userCookieMatch = cookiesList.find(row => row.trim().startsWith("user="));
      if (userCookieMatch) {
        const userCookieValue = userCookieMatch.split("=")[1];
        if (userCookieValue) {
          try {
            user = JSON.parse(decodeURIComponent(userCookieValue));
          } catch (e) {
            console.error("Failed to parse user cookie", e);
          }
        }
      }

      const params = new URLSearchParams(window.location.search);
      const samlEmail = user?.nameID || params.get("samlEmail");

      if (samlEmail) {
        // Clean URL to prevent re-triggering on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete("samlEmail");
        window.history.replaceState({}, document.title, url.pathname);

        // Delete the cookie as we are logging in now and will set sessionStorage
        document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        sessionStorage.setItem("authType", "saml");
        handlesamlLogin(samlEmail);
      }
    }
  }, []);

  const fetchModules = async () => {
    const orgId = sessionStorage.getItem("selectedOrgId");
    const response = await fetch("/api/modules", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(orgId ? { orgId } : {}),
      },
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch modules: ${response.status}`);
    }
    const data = await response.json();
    return data.navbarModules || [];
  };

  const fetchPermissions = async () => {
    // const orgIds = sessionStorage.getItem("selectedOrgIds");
    const storedOrgIds = sessionStorage.getItem("selectedOrgIds");

    const orgIds = storedOrgIds ? JSON.parse(storedOrgIds).join(",") : null;

    const response = await fetch("/api/permission", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(orgIds ? { orgIds } : {}),
      },
      credentials: "include",
    });
    if (!response.ok) {
      console.error(`Failed to fetch permissions: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.permissionModel || [];
  };

  const loadRoles = async () => {
    try {
      const response = await fetch("/api/dashboard/agentroleids", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to fetch roles");

      const result = await response.json();
      sessionStorage.setItem(
        "agentRoles",
        JSON.stringify(result.roleids || []),
      );
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  return (
    <div className={cn("grid gap-5", className)} {...containerProps}>
      {showLogo && (
        <div className="text-center">
          <BrandLogo className="mx-auto h-20 w-auto max-w-[250px]" />
        </div>
      )}

      <div
        className="grid grid-cols-2 gap-1 rounded-xl bg-[#eff4f8] p-1"
        role="tablist"
        aria-label="Authentication method"
      >
        <button
          type="button"
          className={cn(
            "rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-all",
            authTab === "domain"
              ? "bg-white text-[#0d2244] shadow-[0_2px_10px_rgba(13,34,68,0.14)]"
              : "text-[#6b7a90] hover:text-[#0d2244]",
          )}
          onClick={() => setAuthTab("domain")}
          aria-selected={authTab === "domain"}
          role="tab"
        >
          Domain Login
        </button>
        <button
          type="button"
          className={cn(
            "rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-all",
            authTab === "azure"
              ? "bg-white text-[#0d2244] shadow-[0_2px_10px_rgba(13,34,68,0.14)]"
              : "text-[#6b7a90] hover:text-[#0d2244]",
          )}
          onClick={() => setAuthTab("azure")}
          aria-selected={authTab === "azure"}
          role="tab"
        >
          Azure AD Login
        </button>
      </div>

      {authTab === "domain" && (
        <form
          method="POST"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }}
          className="grid gap-3.5"
        >
          <input type="hidden" name="csrf_token" value="dummy_csrf_token" />
          <div className="grid gap-1.5">
            <Label
              className="text-sm font-semibold text-[#374151]"
              htmlFor="emailOrUsername"
            >
              Username
            </Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0aec0]" />
              <Input
                id="emailOrUsername"
                name="emailOrUsername"
                placeholder="Enter your username"
                type="text"
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect="off"
                disabled={isLoading}
                className="h-11 rounded-[10px] border-[#d1d9e6] bg-[#fafbfc] pl-10 text-sm text-[#1a2744] placeholder:text-[#a0aec0] focus-visible:ring-[#20b2aa]/20"
                {...register("emailOrUsername")}
              />
            </div>
            {errors.emailOrUsername && (
              <p className="text-destructive text-xs">
                {errors.emailOrUsername.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label
              className="text-sm font-semibold text-[#374151]"
              htmlFor="password"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                disabled={isLoading}
                className="h-11 rounded-[10px] border-[#d1d9e6] bg-[#fafbfc] pr-10 text-sm text-[#1a2744] placeholder:text-[#a0aec0] focus-visible:ring-[#20b2aa]/20"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm leading-5 text-[#a0aec0] transition hover:text-[#20b2aa]"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-xs">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-medium text-[#20b2aa] transition hover:underline"
              onClick={() => onForgotPassword?.()}
            >
              Forgot password?
            </button>
          </div>

          <p className="text-center text-destructive text-xs">
            {errors.generic ? errors.generic.message : ""}
          </p>

          <Button
            disabled={isLoading || isSubmitting}
            type="submit"
            className="h-11 rounded-[10px] bg-[linear-gradient(135deg,#0d2244_0%,#1a3a6e_100%)] text-sm font-bold text-white shadow-none hover:opacity-95"
          >
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign In
          </Button>

          <div className="flex items-center gap-3 text-xs font-medium text-[#c0cad8]">
            <span className="h-px flex-1 bg-[#e5eaf0]" />
            <span>or continue with</span>
            <span className="h-px flex-1 bg-[#e5eaf0]" />
          </div>

          <button
            type="button"
            className="flex h-11 items-center justify-center gap-3 rounded-[10px] border border-[#d1d9e6] bg-white px-4 text-sm font-semibold text-[#0d2244] transition hover:border-[#20b2aa] hover:text-[#20b2aa]"
            onClick={() => setAuthTab("azure")}
          >
            <Icons.microsoft className="h-4 w-4" />
            Sign in with Azure AD
          </button>
        </form>
      )}

      {authTab === "azure" && (
        <div className="grid gap-4">
          <div className="rounded-[14px] border border-[#b8e4ef] bg-[#f0f9ff] px-5 py-4 text-[#2d6a8a]">
            <p className="mb-2 text-base font-bold text-[#0d2244]">
              Azure AD
            </p>
            <p className="text-sm leading-7">
              Use your Microsoft identity to securely access AcuityCx without a
              separate password.
            </p>
          </div>
{/* 
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-3 rounded-[10px] bg-[linear-gradient(135deg,#830734_0%,#1a3a6e_100%)] px-4 text-sm font-bold text-white transition hover:opacity-95"
            onClick={handleAzureAdLogin}
            disabled={isLoading}
          >
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Icons.microsoft className="h-4 w-4" />
            Login with ADFS / Microsoft Entra
          </button> */}
          <a
            className="flex h-11 items-center justify-center gap-3 rounded-[10px] bg-[linear-gradient(135deg,#830734_0%,#1a3a6e_100%)] px-4 text-sm font-bold text-white transition hover:opacity-95"
            href="/api/auth/login"

          >
            <Icons.microsoft className="h-4 w-4" />
            Login with ADFS / Microsoft Entra
          </a>

          <p className="text-center text-destructive text-xs">
            {errors.generic ? errors.generic.message : ""}
          </p>

          <div className="flex items-center gap-3 text-xs font-medium text-[#c0cad8]">
            <span className="h-px flex-1 bg-[#e5eaf0]" />
            <span>or use domain credentials</span>
            <span className="h-px flex-1 bg-[#e5eaf0]" />
          </div>

          <button
            type="button"
            className="flex h-11 items-center justify-center gap-3 rounded-[10px] border border-[#d1d9e6] bg-white px-4 text-sm font-semibold text-[#0d2244] transition hover:border-[#20b2aa] hover:text-[#20b2aa]"
            onClick={() => setAuthTab("domain")}
          >
            <UserRound className="h-4 w-4" />
            Sign in with Username &amp; Password
          </button>
        </div>
      )}
    </div>
  );
}

export default UserAuthForm;
