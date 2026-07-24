// app/dashboard/users/add/AddUserPageContent.jsx

// app/dashboard/users/add/AddUserPageContent.jsx

"use client";
import CryptoJS from "crypto-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import RoleMultiSelect from "@/components/RoleMultiSelect";
import TreeDropdown from "@/components/organizationTreeDDL";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

const AddUserPageContent = ({
  onSuccess,
  onCancel,
  submitRef,
  discardRef,
  hideFooterButtons = false,
  onSubmittingChange, // ADD THIS
}) => {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false); // NEW
  const [roles, setRoles] = useState([]);
  const [agentRoles, setAgentRoles] = useState([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [resetKey, setResetKey] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminRoleId, setSuperAdminRoleId] = useState(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  const strictEmailRegex =
    /^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const ValidationSchema = z.object({
    email: z
      .string()
      .trim()
      .max(50, "Email length exceeded.")
      .optional()
      .refine((val) => !val || strictEmailRegex.test(val), {
        message: "Invalid email format.",
      }),
    firstName: z
      .string()
      .trim()
      .min(3, "First Name must be at least 3 characters")
      .max(100, "First Name length exceeded"),
    middleName: z
      .string()
      .trim()
      .max(100, "Middle Name length exceeded")
      .optional(),
    lastName: z
      .string()
      .trim()
      .min(3, "Last Name must be at least 3 characters")
      .max(100, "Last Name length exceeded"),
    userLoginId: z
      .string()
      .trim()
      .min(3, "User Name must be at least 3 characters")
      .max(50, "User Name length exceeded"),
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

  // Load agent roles from session
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

  // Check super admin
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
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

  // Fetch roles whenever selected organizations change
  useEffect(() => {
    if (!selectedOrganizations || selectedOrganizations.length === 0) {
      setRoles([]);
      setSelectedRoles([]);
      return;
    }

    const fetchRolesByOrgs = async () => {
      setIsLoadingRoles(true);
      setErrors((prev) => {
        const { global: _, ...rest } = prev;
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
          isSuperAdmin || !superAdminRoleId
            ? incoming
            : incoming.filter(
                (r) => Number(r.roleId) !== Number(superAdminRoleId),
              );

        setRoles(filtered);
        setSelectedRoles((prev) => syncRoleSelection(filtered, prev));
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
    };

    fetchRolesByOrgs();
  }, [isSuperAdmin, selectedOrganizations, syncRoleSelection]);

  const handleRoleChange = (selectedOptions) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      setSelectedRoles([]);
      return;
    }
    let filtered = selectedOptions;
    if (!isSuperAdmin) {
      filtered = superAdminRoleId
        ? selectedOptions.filter(
            (r) => Number(r.value) !== Number(superAdminRoleId),
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    const mappedOrgIds = selectedOrganizations.map((org) => ({
      orgId: org.value,
    }));

    const baseData = {
      ...Object.fromEntries(new FormData(event.target).entries()),
      email: event.target.email.value.toLowerCase(),
      userLoginId: event.target.userLoginId.value,
      firstName: event.target.firstName.value,
      middleName: event.target.middleName.value,
      lastName: event.target.lastName.value,
      orgIds: mappedOrgIds,
    };

    // Validate everything (including org selection) in a single pass so
    // all field errors surface together, instead of one at a time.
    const validationResult = ValidationSchema.safeParse(baseData);

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.errors.reduce((acc, err) => {
        acc[err.path[0]] = err.message;
        setTimeout(() => {
          setErrors((prev) => {
            const { [err.path[0]]: _, ...rest } = prev;
            return rest;
          });
        }, 3000);
        return acc;
      }, {});
      setErrors(fieldErrors);
      return;
    }

    // Only reached once every basic field (including org) is valid —
    // now it's safe to handle the role-default confirmation flow.
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

    setIsSubmitting(true);
    onSubmittingChange?.(true);

    const encryptedUserData = sessionStorage.getItem("user");
    let currentUserId = null;
    let currentUserName = null;
    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        currentUserId = user?.userId || null;
        currentUserName = user?.userFullName || null;
      } catch (error) {
        console.error("Error decrypting user data:", error);
      }
    }

    const mappedRoleIds = effectiveSelectedRoles.map((role) => ({
      roleId: role.value,
    }));

    const data = {
      ...baseData,
      rolesIds: mappedRoleIds,
      currentUserId,
    };

    try {
      const response = await fetch("/api/users/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({ ...data, currentUserId, currentUserName }),
        cache: "no-store",
      });

      const result = await response.json();
      if (response.ok && result.success) {
        alert(result.message || "User created successfully.");
        onSuccess?.();
      } else {
        alert(result.message || "An unexpected error occurred.");
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error.message);
      alert(
        error.message ||
          "An unexpected error occurred while creating the user.",
      );
    } finally {
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  };

  const handleDiscard = () => {
    const form = document.querySelector("#addUserModalForm");

    if (form) {
      form.reset();
    }

    // clear React-managed state
    setSelectedRoles([]);
    setSelectedOrganizations([]);
    setRoles([]);
    setErrors({});

    // force TreeDropdown / RoleMultiSelect remount
    setResetKey((prev) => prev + 1);
  };

  const errorStyle = { color: "red", fontSize: "0.675rem" };
  const isOrgSelected = selectedOrganizations.length > 0;

  /* ─── shared mini-styles ─────────────────────────────────────────────── */
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
      <form id="addUserModalForm" onSubmit={handleSubmit}>
        {/* hidden trigger buttons for external refs */}
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
          {/* ── Section 1: Account ─────────────────────────────────────── */}
          <div>
            <p style={sectionLabel}>Account</p>
            {/* Row: Username + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div style={fieldWrap}>
                <Label htmlFor="userLoginId" className="text-xs">
                  User Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userLoginId"
                  name="userLoginId"
                  type="text"
                  maxLength={50}
                  className="h-8 text-xs"
                />
                {errors.userLoginId && (
                  <p style={errorStyle}>{errors.userLoginId}</p>
                )}
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
                  className="h-8 text-xs"
                />
                {errors.email && <p style={errorStyle}>{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* ── Section 2: Personal Info ────────────────────────────────── */}
          <div>
            <p style={sectionLabel}>Personal Info</p>
            {/* Row: First + Middle + Last */}
            <div className="grid grid-cols-3 gap-3">
              <div style={fieldWrap}>
                <Label htmlFor="firstName" className="text-xs">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  maxLength={100}
                  className="h-8 text-xs"
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
                  maxLength={100}
                  className="h-8 text-xs"
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
                  maxLength={100}
                  className="h-8 text-xs"
                />
                {errors.lastName && <p style={errorStyle}>{errors.lastName}</p>}
              </div>
            </div>
          </div>

          {/* ── Section 3: Contact ──────────────────────────────────────── */}
          <div>
            <p style={sectionLabel}>Contact</p>
            {/* Row: Phone + Address */}
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
                  className="h-8 text-xs"
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, "");
                  }}
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
                  className="h-8 text-xs"
                />
                {errors.userAddress && (
                  <p style={errorStyle}>{errors.userAddress}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 4: Access & Permissions ────────────────────────── */}
          <div>
            <p style={sectionLabel}>Access &amp; Permissions</p>
            {/* Row: Organizations + Role */}
            <div className="grid grid-cols-2 gap-3 items-start">
              <div style={fieldWrap}>
                <Label className="text-xs">
                  Organizations <span className="text-red-500">*</span>
                </Label>
                <TreeDropdown
                  key={resetKey}
                  value={selectedOrganizations}
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

                {/* Agent notice */}
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
        </div>
      </form>
    </div>
  );
};

export default AddUserPageContent;
