"use client";
import React, { useEffect, useRef, useState } from "react";
import CryptoJS from "crypto-js";
import withAuth from "./withAuth";
import { DEFAULT_BRANDING, ALLOWED_FONTS } from "@/lib/branding";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helper: decrypt session user
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getSessionUser = () => {
  try {
    const enc = sessionStorage.getItem("user");
    if (!enc) return null;
    const bytes = CryptoJS.AES.decrypt(enc, "");
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch {
    return null;
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ProfilePicture Sub-component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ProfilePicture = ({ userId, currentPic, loginId }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(currentPic || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Sync if parent data changes
  useEffect(() => {
    setPreview(currentPic || null);
  }, [currentPic]);

  const initials = loginId ? loginId.slice(0, 2).toUpperCase() : "U";

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    // Client-side validation
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      setError("Only JPG, PNG, WEBP, GIF allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File must be under 2MB.");
      return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload to server
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    try {
      setUploading(true);
      const res = await fetch("/api/uploadProfilePicture", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      // Server returns base64 data URL â†’ use directly as <img src>
      setPreview(data.picturePath);
      setSuccess(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile:picture-updated", {
            detail: { picturePath: data.picturePath },
          })
        );
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
      setPreview(currentPic || null); // revert on error
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="relative group" title="Click to change profile picture">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="relative inline-flex h-24 w-24 items-center justify-center rounded-full border border-border bg-background shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed"
          aria-label="Change profile picture"
        >
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="h-full w-full rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
        </button>

        {success && (
          <span className="absolute -bottom-1 -right-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            Updated
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Profile photo</p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WEBP or GIF. Max size 2MB.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Change photo"}
          </button>
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Main ProfileDisplay Component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ProfileDisplay = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);

  const [showAllRoles, setShowAllRoles] = useState(false);
  const [showAllOrgs, setShowAllOrgs] = useState(false);

  const [timezonesList, setTimezonesList] = useState([]);
  const [selectedTimezone, setSelectedTimezone] = useState("");
  const [themeMode, setThemeMode] = useState(DEFAULT_BRANDING.themeMode);
  const [themePreset, setThemePreset] = useState(DEFAULT_BRANDING.themePreset);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_BRANDING.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_BRANDING.secondaryColor);
  const [fontFamily, setFontFamily] = useState(DEFAULT_BRANDING.fontFamily);

  const THEME_PRESETS = [
    "default", "blue", "orange", "red", "yellow", "green",
    "teal", "cyan", "indigo", "violet", "pink",
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = getSessionUser();
        if (!user?.userId) throw new Error("No user session data found");

        setSessionUser(user); // âœ… Store for ProfilePicture component

        const res = await fetch("/api/profileDisplay", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify({ userId: user.userId }),
          cache: "no-store",
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to fetch profile");
        }

        const profileData = await res.json();
        setUserData(profileData.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchTimezones = async () => {
      try {
        const response = await fetch("/api/timezone", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });

        const result = await response.json();
        if (response.ok && result.success) {
          setTimezonesList(result.data);

          if (result.data.length > 0) {
            const encryptedTimezone = sessionStorage.getItem("selectedTimezone");
            let savedTimezone = null;

            if (encryptedTimezone) {
              try {
                const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
                savedTimezone = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
              } catch {
                console.error("Failed to decrypt timezone");
              }
            }

            const available = result.data.map((tz) => tz.TimeZone);
            if (savedTimezone && available.includes(savedTimezone)) {
              setSelectedTimezone(savedTimezone);
            } else {
              setSelectedTimezone(result.data[0].TimeZone);
              const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(result.data[0].TimeZone), ""
              ).toString();
              sessionStorage.setItem("selectedTimezone", encrypted);
            }
          }
        } else {
          console.error("Timezone API error:", result.message);
        }
      } catch (err) {
        console.error("Failed to load timezones:", err);
      }
    };

    fetchProfile();
    fetchTimezones();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("brandingOverrides");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.themeMode) setThemeMode(parsed.themeMode);
      if (parsed.themePreset) setThemePreset(parsed.themePreset);
      if (parsed.primaryColor) setPrimaryColor(parsed.primaryColor);
      if (parsed.secondaryColor) setSecondaryColor(parsed.secondaryColor);
      if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
    } catch {
      // ignore
    }
  }, []);

  const persistBranding = (next) => {
    const payload = { themeMode, themePreset, primaryColor, secondaryColor, fontFamily, ...next };
    localStorage.setItem("brandingOverrides", JSON.stringify(payload));
    window.dispatchEvent(new Event("branding:update"));
  };

  const renderListWithToggle = (items, showAll, setShowAll) => {
    if (!items || items.length === 0) return "Not provided";
    if (showAll || items.length <= 3) {
      return (
        <>
          {items.join(", ")}{" "}
          {items.length > 3 && (
            <button className="text-primary underline ml-1" onClick={() => setShowAll(false)}>
              Show less
            </button>
          )}
        </>
      );
    }
    const visible = items.slice(0, 3);
    return (
      <>
        {visible.join(", ")}{" "}
        <button className="text-primary underline ml-1" onClick={() => setShowAll(true)}>
          +{items.length - 3} more
        </button>
      </>
    );
  };

  const userRolesVal = userData?.roles || userData?.Roles;
  const roles = userRolesVal
    ? Array.isArray(userRolesVal) ? userRolesVal : userRolesVal.split(",").map((r) => r.trim())
    : [];

  const userOrgsVal = userData?.organizations || userData?.Organizations;
  const organizations = userOrgsVal
    ? Array.isArray(userOrgsVal) ? userOrgsVal : userOrgsVal.split(",").map((o) => o.trim())
    : [];

  if (loading) return <p>Loading profile...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!userData) return <p>No profile data available.</p>;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">

      {/* â”€â”€ Header: Avatar + Name â”€â”€ */}
      <div className="flex items-center gap-4">
        {/* âœ… Profile Picture Upload Component */}
        <ProfilePicture
          userId={sessionUser?.userId}
          currentPic={userData.profile_picture}
          loginId={userData.user_login_id}
        />

        <div className="min-w-0">
          <p className="text-base font-semibold truncate">{userData.user_login_id}</p>
          <p className="text-xs text-muted-foreground truncate">{userData.email}</p>
        </div>
      </div>

      {/* â”€â”€ Info Grid â”€â”€ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Full Name</p>
          <p className="text-sm font-medium">{userData.user_full_name || "Not provided"}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="text-sm font-medium">{userData.phone || "Not provided"}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Role Assigned</p>
          <p className="text-sm">{renderListWithToggle(roles, showAllRoles, setShowAllRoles)}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Organization Mapped</p>
          <p className="text-sm">{renderListWithToggle(organizations, showAllOrgs, setShowAllOrgs)}</p>
        </div>
      </div>

      {/* â”€â”€ Timezone â”€â”€ */}
      <div className="hidden rounded-lg border border-border/70 bg-muted/30 p-3">
        <p className="text-sm font-medium mb-2">Timezone</p>
        <select
          value={selectedTimezone}
          onChange={(e) => {
            const tz = e.target.value;
            setSelectedTimezone(tz);
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(tz), "").toString();
            sessionStorage.setItem("selectedTimezone", encrypted);
            window.location.reload();
          }}
          className="w-full border px-2 py-1 rounded text-sm text-foreground bg-background"
        >
          {[...new Map(timezonesList.map((tz) => [tz.TimeZone, tz])).values()].map((tz) => (
            <option key={tz.TimeZone} value={tz.TimeZone}>{tz.TimeZone}</option>
          ))}
        </select>
      </div>

      {/* â”€â”€ Theme Settings â”€â”€ */}
      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
        <p className="text-sm font-medium mb-3">Theme Settings</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Theme Mode</label>
            <select
              value={themeMode}
              onChange={(e) => { const v = e.target.value; setThemeMode(v); persistBranding({ themeMode: v }); }}
              className="border px-2 py-1 rounded text-sm text-foreground bg-background"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Theme Preset</label>
            <select
              value={themePreset}
              onChange={(e) => { const v = e.target.value; setThemePreset(v); persistBranding({ themePreset: v }); }}
              className="border px-2 py-1 rounded text-sm text-foreground bg-background"
            >
              {THEME_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Primary Color</label>
              <input
                type="color" value={primaryColor}
                onChange={(e) => { const v = e.target.value; setPrimaryColor(v); persistBranding({ primaryColor: v }); }}
                className="h-9 w-14 rounded border"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Secondary Color</label>
              <input
                type="color" value={secondaryColor}
                onChange={(e) => { const v = e.target.value; setSecondaryColor(v); persistBranding({ secondaryColor: v }); }}
                className="h-9 w-14 rounded border"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Font</label>
            <select
              value={fontFamily}
              onChange={(e) => { const v = e.target.value; setFontFamily(v); persistBranding({ fontFamily: v }); }}
              className="border px-2 py-1 rounded text-sm text-foreground bg-background"
              style={{ fontFamily: `${fontFamily}, sans-serif` }}
            >
              {ALLOWED_FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: `${f}, sans-serif` }}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-3">
          <button
            type="button"
            className="text-xs px-3 py-1 rounded border border-border text-foreground hover:bg-muted"
            onClick={() => {
              localStorage.removeItem("brandingOverrides");
              setThemeMode(DEFAULT_BRANDING.themeMode);
              setThemePreset(DEFAULT_BRANDING.themePreset);
              setPrimaryColor(DEFAULT_BRANDING.primaryColor);
              setSecondaryColor(DEFAULT_BRANDING.secondaryColor);
              setFontFamily(DEFAULT_BRANDING.fontFamily);
              window.dispatchEvent(new Event("branding:update"));
            }}
          >
            Reset Theme to Default
          </button>
        </div>
      </div>
    </div>
  );
};

export default withAuth(ProfileDisplay);
