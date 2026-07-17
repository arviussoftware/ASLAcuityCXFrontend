// app/dashboard/users/[id]/UpdateUserPageContent.jsx
"use client";
import { useCallback, useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import RoleMultiSelect from "@/components/RoleMultiSelect";
import TreeDropdown from "@/components/organizationTreeDDL";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

const UpdateUserPageContent = ({
  userId,
  onSuccess,
  onCancel,
  submitRef,
  discardRef,
  hideFooterButtons = false,
}) => {
  const id = userId;

  const [user, setUser] = useState(null);
  const [agentRoles, setAgentRoles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);
  const [userNotFound, setUserNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminRoleId, setSuperAdminRoleId] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false); // ADD THIS
  const [hasAccess, setHasAccess] = useState(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [originalUser, setOriginalUser] = useState(null);
  const [originalRoles, setOriginalRoles] = useState([]);
  const [originalOrganizations, setOriginalOrganizations] = useState([]);

  useEffect(() => {
    const storedRoles = sessionStorage.getItem("agentRoles");
    if (storedRoles) {
      try {
        setAgentRoles(JSON.parse(storedRoles));
      } catch (err) {
        console.error("Failed to parse agentRoles", err);
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Not authenticated");
        const me = await res.json();
        if (!alive) return;
        setIsSuperAdmin(!!me?.isSuperAdmin);
        setSuperAdminRoleId(me?.superAdminRoleId ?? null);
      } catch {
        if (!alive) return;
        setIsSuperAdmin(false);
        setSuperAdminRoleId(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fetchPrivilege = useCallback(async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let loggedInUserId = null;
      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const currentUser = JSON.parse(decryptedData);
          loggedInUserId = currentUser?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      const response = await fetch("/api/moduleswithPrivileges", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId,
          moduleId: 2,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
        cache: "no-store",
      });

      const data = await response.json();
      if (response.ok) {
        const privileges = data.PrivilegeList || [];
        const hasEditPermission = privileges.some(
          (privilege) => privilege.PrivilegeId === 3,
        );
        setHasAccess(hasEditPermission);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.warn("Error fetching privileges:", error);
      setHasAccess(false);
    }
  }, []);

  useEffect(() => {
    fetchPrivilege();
  }, [fetchPrivilege]);

  const ValidationSchema = z.object({
    email: z
      .string()
      .trim()
      .max(50, "Email length exceeded.")
      .optional()
      .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: "Invalid email address",
      }),
    firstName: z
      .string()
      .trim()
      .nonempty("First name is required")
      .max(100, "First name length exceeded"),
    middleName: z
      .string()
      .trim()
      .max(100, "Middle name length exceeded")
      .optional(),
    lastName: z
      .string()
      .trim()
      .nonempty("Last name is required")
      .max(100, "Last name length exceeded"),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || /^\d{10}$/.test(val), {
        message: "Phone number must be exactly 10 digits",
      }),
    userAddress: z
      .string()
      .trim()
      .max(512, "Address length exceeded")
      .refine((val) => !/https?:\/\/[^\s]+/.test(val), {
        message: "Address must not contain a URL",
      }),
    rolesIds: z.array(z.object({ roleId: z.number().positive() })).optional(),
    orgIds: z
      .array(z.object({ orgId: z.number().positive() }))
      .min(1, "At least one organization must be selected."),
  });

  const findAgentRoleOption = useCallback(
    (availableRoles = []) => {
      const agentRole = availableRoles.find((role) =>
        agentRoles.includes(Number(role.roleId)),
      );

      return agentRole
        ? { value: agentRole.roleId, label: agentRole.roleName }
        : null;
    },
    [agentRoles],
  );

  const syncRoleSelection = useCallback(
    (availableRoles = [], previousRoles = []) => {
      const retainedRoles = previousRoles.filter((selectedRole) =>
        availableRoles.some(
          (role) => Number(role.roleId) === Number(selectedRole.value),
        ),
      );

      return retainedRoles;
    },
    [findAgentRoleOption],
  );

  const fetchRolesByOrgIds = useCallback(
    async (orgIds, superAdmin, keepRoles = null) => {
      if (!orgIds || orgIds.length === 0) {
        setRoles([]);
        if (!keepRoles) setSelectedRoles([]);
        return;
      }

      setIsLoadingRoles(true);
      setErrors((prev) => {
        const { global: _global, ...rest } = prev;
        return rest;
      });

      try {
        const response = await fetch("/api/userRoles", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Failed to fetch roles");

        const data = await response.json();
        const incoming = data.roles || [];
        const filtered =
          superAdmin || !superAdminRoleId
            ? incoming
            : incoming.filter(
                (role) => Number(role.roleId) !== Number(superAdminRoleId),
              );

        setRoles(filtered);

        if (keepRoles) {
          setSelectedRoles(syncRoleSelection(filtered, keepRoles));
        } else {
          setSelectedRoles((prev) => syncRoleSelection(filtered, prev));
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
        setErrors((prev) => ({
          ...prev,
          global: "Failed to load roles.",
        }));
        setRoles([]);
      } finally {
        setIsLoadingRoles(false);
      }
    },
    [syncRoleSelection],
  );

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoadError("");
      setUserNotFound(false);
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let currentUserId = null;
        if (encryptedUserData) {
          try {
            const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            const currentUser = JSON.parse(decryptedData);
            currentUserId = currentUser?.userId || null;
          } catch (error) {
            console.error("Error decrypting user data:", error);
          }
        }

        const res = await fetch(`/api/users/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: currentUserId,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
            orgIds: getSelectedOrgIdsHeader(),
          },
          cache: "no-store",
        });

        if (res.status === 404) {
          setUserNotFound(true);
          return;
        }

        if (!res.ok) {
          const errorBody = await res.text();
          throw new Error(
            `Error fetching user: ${res.status} ${res.statusText}${
              errorBody ? ` - ${errorBody}` : ""
            }`,
          );
        }

        const data = await res.json();
        if (!data?.user) {
          throw new Error("User details were not returned by the API.");
        }

        setUser(data.user);
        setOriginalUser(data.user);

        const preSelectedRoles = data.user.roles.map((role) => ({
          value: role.roleId,
          label: role.roleName,
        }));
        const targetIsSuperAdmin =
          !!superAdminRoleId &&
          preSelectedRoles.some(
            (role) => Number(role.value) === Number(superAdminRoleId),
          );

        if (targetIsSuperAdmin && !isSuperAdmin) {
          setUserNotFound(true);
          return;
        }

        setSelectedRoles(preSelectedRoles);
        setOriginalRoles(preSelectedRoles);

        const preSelectedOrgs = data.user.organizations.map((org) => ({
          value: org.orgId,
          label: org.orgName,
        }));
        setSelectedOrganizations(preSelectedOrgs);
        setOriginalOrganizations(preSelectedOrgs);

        if (preSelectedOrgs.length > 0) {
          const orgIds = preSelectedOrgs
            .map((org) => org.value)
            .filter(Boolean);
          await fetchRolesByOrgIds(orgIds, isSuperAdmin, preSelectedRoles);
        }

        setInitialLoadDone(true);
      } catch (error) {
        console.error("Error fetching user:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to fetch user details.",
        );
        setErrors((prev) => ({
          ...prev,
          global: "Failed to fetch user details.",
        }));
      } finally {
        setInitialLoadDone(true);
      }
    };

    fetchData();
  }, [fetchRolesByOrgIds, id, isSuperAdmin]);

  useEffect(() => {
    if (!initialLoadDone) return;

    if (!selectedOrganizations || selectedOrganizations.length === 0) {
      setRoles([]);
      setSelectedRoles([]);
      return;
    }

    const orgIds = selectedOrganizations
      .map((org) => org?.value)
      .filter(Boolean);

    if (orgIds.length === 0) return;

    fetchRolesByOrgIds(orgIds, isSuperAdmin);
  }, [
    fetchRolesByOrgIds,
    initialLoadDone,
    isSuperAdmin,
    selectedOrganizations,
  ]);

  const handleRoleChange = (selectedOptions) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      setSelectedRoles([]);
      return;
    }

    let filtered = selectedOptions;
    if (!isSuperAdmin) {
      filtered = superAdminRoleId
        ? selectedOptions.filter(
            (role) => Number(role.value) !== Number(superAdminRoleId),
          )
        : selectedOptions;
    }

    const agentRole = filtered.find((role) =>
      agentRoles.includes(Number(role.value)),
    );

    if (agentRole) {
      setSelectedRoles([agentRole]);
    } else {
      setSelectedRoles(filtered);
    }
  };

  const handleOrganizationChange = (selectedOptions) => {
    setSelectedOrganizations(selectedOptions || []);
    setErrors((prev) => {
      const { orgIds: _orgIds, ...rest } = prev;
      return rest;
    });
  };

  const handleDiscard = () => {
    if (originalUser) {
      setUser({ ...originalUser });
    }

    setSelectedRoles([...originalRoles]);
    setSelectedOrganizations([...originalOrganizations]);

    setErrors({});
    setResetKey((prev) => prev + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    if (!selectedOrganizations.length) {
      setErrors({ orgIds: "At least one organization must be selected." });
      return;
    }

    let effectiveSelectedRoles = selectedRoles;

    if (selectedRoles.length === 0) {
      const defaultAgentRole = findAgentRoleOption(roles);

      if (!defaultAgentRole) {
        alert("Please select any role before saving.");
        return;
      }

      if (selectedOrganizations.length > 1) {
        alert(
          "No role was selected, so Agent would be applied by default. Agent users can be mapped to only one organization. Please select a single organization or choose a different role.",
        );
        return;
      }

      const confirmDefault = window.confirm(
        "No role was selected, so Agent will be assigned by default. Click OK to save this user as Agent, or Cancel to go back and select a different role.",
      );

      if (!confirmDefault) {
        return;
      }

      effectiveSelectedRoles = [defaultAgentRole];
    }

    const isAgent = effectiveSelectedRoles.some((role) =>
      agentRoles.includes(Number(role.value)),
    );
    if (isAgent && selectedOrganizations.length > 1) {
      alert(
        "Agent users can be mapped to only one organization. Please select a single organization or choose a different role.",
      );
      return;
    }

    // ── Actual save work starts here ──
    setIsSubmitting(true);

    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let currentUserId = null;
      let currentUserName = null;
      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const currentUser = JSON.parse(decryptedData);
          currentUserId = currentUser?.userId || null;
          currentUserName = currentUser?.userFullName || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      const mappedRoles = effectiveSelectedRoles.map((role) => ({
        roleId: role.value,
      }));
      const mappedOrgIds = selectedOrganizations.map((org) => ({
        orgId: org.value,
      }));

      const formData = {
        loginId: user.userLoginId,
        userFullName: user.userFullName,
        email: event.target.email.value,
        firstName: event.target.firstName.value,
        middleName: event.target.middleName.value,
        lastName: event.target.lastName.value,
        phone: event.target.phone.value,
        userAddress: event.target.userAddress.value,
        isActive: event.target.isActive.value === "true",
        orgIds: mappedOrgIds,
        rolesIds: mappedRoles,
        currentUserId,
        currentUserName,
      };

      ValidationSchema.parse(formData);
      const response = await fetch(`/api/users/update/${user.userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify(formData),
        cache: "no-store",
      });

      const result = await response.json();
      const resultMessage = result?.message || "An unexpected error occurred.";
      const isSuccessfulUpdate =
        response.ok &&
        result?.success === true &&
        /updated successfully/i.test(resultMessage);

      if (isSuccessfulUpdate) {
        alert(resultMessage);
        onSuccess?.();
      } else {
        alert(resultMessage);
        return;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.reduce((acc, err) => {
          acc[err.path[0]] = err.message;
          setTimeout(() => {
            setErrors((prev) => {
              const { [err.path[0]]: _field, ...rest } = prev;
              return rest;
            });
          }, 3000);
          return acc;
        }, {});
        setErrors(fieldErrors);
      } else {
        console.error("Error in handleSubmit:", error.message);
        alert(
          error.message ||
            "An unexpected error occurred while updating the user.",
        );
      }
    } finally {
      setIsSubmitting(false); // ADD THIS
    }
  };

  const errorStyle = { color: "red", fontSize: "0.675rem" };
  const isOrgSelected = selectedOrganizations.length > 0;
  const sectionLabel = {
    fontSize: "0.65rem",
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: "8px",
    paddingBottom: "6px",
    borderBottom: "0.5px solid #e5e7eb",
  };
  const fieldWrap = { display: "flex", flexDirection: "column", gap: "3px" };
  const readOnlyInputClassName =
    "h-8 text-xs border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none opacity-100";
  const readOnlyHintClassName = "text-[11px] text-slate-500 mt-1";

  if (hasAccess === null) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (hasAccess === false) {
    return (
      <p className="text-xs text-red-500">
        You do not have permission to edit users.
      </p>
    );
  }

  if (userNotFound) {
    return (
      <p className="text-xs text-red-500">
        The user you are trying to edit does not exist.
      </p>
    );
  }

  if (loadError) {
    return <p className="text-xs text-red-500">{loadError}</p>;
  }

  if (!initialLoadDone || !user) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  return (
    <div style={{ position: "relative" }}>
      {isSubmitting && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.7)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              border: "3px solid #e5e7eb",
              borderTopColor: "var(--brand-primary)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        </div>
      )}
      <form id="updateUserPageForm" onSubmit={handleSubmit}>
        <button type="submit" ref={submitRef} className="hidden" />
        <button
          type="button"
          ref={discardRef}
          className="hidden"
          onClick={handleDiscard}
        />

        {errors.global && (
          <p
            style={{ ...errorStyle, textAlign: "center", marginBottom: "12px" }}
          >
            {errors.global}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <p style={sectionLabel}>Account</p>
            <div className="grid grid-cols-2 gap-3">
              <div style={fieldWrap}>
                <Label htmlFor="userFullName" className="text-xs">
                  User Name
                </Label>
                <Input
                  id="userFullName"
                  name="userFullName"
                  type="text"
                  value={user.userFullName || ""}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                  onKeyDown={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  className={readOnlyInputClassName}
                />
                {/*<p className={readOnlyHintClassName}>This field is read-only.</p>*/}
              </div>
              <div style={fieldWrap}>
                <Label htmlFor="email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  maxLength={50}
                  value={user.email || ""}
                  className="h-8 text-xs"
                  onChange={(e) =>
                    setUser((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
                {errors.email && <p style={errorStyle}>{errors.email}</p>}
              </div>
            </div>
          </div>

          <div>
            <p style={sectionLabel}>Personal Info</p>
            <div className="grid grid-cols-3 gap-3">
              <div style={fieldWrap}>
                <Label htmlFor="firstName" className="text-xs">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={user.firstName || ""}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                  className={readOnlyInputClassName}
                  onKeyDown={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                />
                {errors.firstName && (
                  <p style={errorStyle}>{errors.firstName}</p>
                )}
              </div>
              <div style={fieldWrap}>
                <Label htmlFor="middleName" className="text-xs">
                  Middle Name
                </Label>
                <Input
                  id="middleName"
                  name="middleName"
                  type="text"
                  value={user.middleName || ""}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                  className={readOnlyInputClassName}
                  onKeyDown={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                />
                {errors.middleName && (
                  <p style={errorStyle}>{errors.middleName}</p>
                )}
              </div>
              <div style={fieldWrap}>
                <Label htmlFor="lastName" className="text-xs">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={user.lastName || ""}
                  // readOnly
                  // tabIndex={-1}
                  // aria-readonly="true"
                  className="h-8 text-xs"
                  // onKeyDown={(e) => e.preventDefault()}
                  // onPaste={(e) => e.preventDefault()}
                  onChange={(e) =>
                    setUser((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                />
                {errors.lastName && <p style={errorStyle}>{errors.lastName}</p>}
              </div>
            </div>
            {/*<p className={readOnlyHintClassName}>
            User name and personal name fields are read-only and cannot be edited here.
          </p>*/}
          </div>

          <div>
            <p style={sectionLabel}>Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div style={fieldWrap}>
                <Label htmlFor="phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  maxLength={10}
                  pattern="\d*"
                  value={user.phone || ""}
                  className="h-8 text-xs"
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, "");
                  }}
                  onChange={(e) =>
                    setUser((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
                {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
              </div>
              <div style={fieldWrap}>
                <Label htmlFor="userAddress" className="text-xs">
                  Address
                </Label>
                <Input
                  id="userAddress"
                  name="userAddress"
                  type="text"
                  maxLength={512}
                  value={user.userAddress || ""}
                  className="h-8 text-xs"
                  onChange={(e) =>
                    setUser((prev) => ({
                      ...prev,
                      userAddress: e.target.value,
                    }))
                  }
                />
                {errors.userAddress && (
                  <p style={errorStyle}>{errors.userAddress}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p style={sectionLabel}>Access &amp; Permissions</p>
            <div className="grid grid-cols-2 gap-3 items-start">
              <div style={fieldWrap}>
                <Label className="text-xs">
                  Organizations <span className="text-red-500">*</span>
                </Label>
                <TreeDropdown
                  key={resetKey}
                  value={selectedOrganizations}
                  selected={selectedOrganizations}
                  onChange={handleOrganizationChange}
                  className="text-xs"
                  isMulti={true}
                  menuPlacement="bottom"
                />
                {errors.orgIds && <p style={errorStyle}>{errors.orgIds}</p>}
              </div>

              <div style={fieldWrap}>
                <Label
                  className={`text-xs ${!isOrgSelected ? "text-muted-foreground" : ""}`}
                >
                  Role
                </Label>

                <div
                  className={`relative ${!isOrgSelected ? "opacity-50 pointer-events-none" : ""}`}
                  title={
                    !isOrgSelected ? "Please select an organization first" : ""
                  }
                >
                  <RoleMultiSelect
                    key={resetKey}
                    roles={roles}
                    selectedRoles={selectedRoles}
                    onChange={handleRoleChange}
                    isDisabled={!isOrgSelected || isLoadingRoles}
                    placeholder={
                      !isOrgSelected
                        ? "Select an organization first"
                        : isLoadingRoles
                          ? "Loading roles..."
                          : "Select"
                    }
                  />
                </div>

                {/* Shown only when Role is actually empty */}
                {selectedRoles.length === 0 &&
                  isOrgSelected &&
                  !isLoadingRoles && (
                    <p className="text-xs text-muted-foreground mt-1">
                      If you leave Role empty, Agent will be selected by
                      default.
                    </p>
                  )}

                {/* Shown only when user explicitly picked an Agent role */}
                {selectedRoles.some((role) =>
                  agentRoles.includes(Number(role.value)),
                ) && (
                  <p className="text-xs text-primary mt-1">
                    {selectedOrganizations.length > 1 &&
                      "Agent is selected. Please keep only one organization for Agent users."}
                  </p>
                )}

                {/*{selectedRoles.length > 0 &&
                !selectedRoles.some((role) =>
                  agentRoles.includes(Number(role.value)),
                ) && (
                  <p className="text-xs text-primary mt-1">
                    Agent role cannot be combined with other roles.
                  </p>
                )}*/}

                {!isOrgSelected && (
                  <p style={{ color: "#9ca3af", fontSize: "0.675rem" }}>
                    Select an organization to load available roles.
                  </p>
                )}

                {errors.rolesIds && <p style={errorStyle}>{errors.rolesIds}</p>}
              </div>
            </div>
          </div>

          <div>
            <p style={sectionLabel}>Status</p>
            <div className="grid gap-2">
              <Label className="text-xs font-medium">User Status</Label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="isActive"
                    value="true"
                    className="form-radio"
                    checked={user.isActive === true}
                    onChange={() =>
                      setUser((prev) => ({ ...prev, isActive: true }))
                    }
                  />
                  <span className="text-xs">Active</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="isActive"
                    value="false"
                    className="form-radio"
                    checked={user.isActive === false}
                    onChange={() =>
                      setUser((prev) => ({ ...prev, isActive: false }))
                    }
                  />
                  <span className="text-xs">Inactive</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {!hideFooterButtons && (
          <div className="flex justify-end gap-2 mt-5">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isSubmitting}
              onClick={handleDiscard}
              style={{ backgroundColor: "#F04E23" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--brand-secondary)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#F04E23")
              }
            >
              Discard
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              style={{ backgroundColor: "var(--brand-primary)" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--brand-secondary)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
              }
            >
              {isSubmitting ? "Saving..." : "Save User"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default UpdateUserPageContent;
