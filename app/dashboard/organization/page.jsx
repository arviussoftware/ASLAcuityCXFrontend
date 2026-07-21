//app/dashboard/organization/page.jsx
"use client";
import React, { useEffect, useState, useRef } from "react";
import CryptoJS from "crypto-js";
import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import { notFound } from "next/navigation";
import "@/app/organization.css";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

// ─── helpers ────────────────────────────────────────────────────────────────
const smartCapitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((w) => {
      if (w === w.toUpperCase()) return w;
      return w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "";
    })
    .join(" ");
};

const avatarColor = (id, l = 85) => `hsl(${(id * 47) % 360},60%,${l}%)`;

const buildMap = (nodes) => {
  const map = {};
  const walk = (n) => {
    map[n.id] = n;
    (n.children || []).forEach(walk);
  };
  nodes.forEach(walk);
  return map;
};

const transformDataForTree = (nodes) => {
  if (!nodes) return null;
  const transformNode = (node, parentActive = true) => {
    const active = Number(node.isActive);
    return {
      name: node.name || node.Name || "Unnamed",
      id: node.id,
      isActive: active,
      isDisabled: !parentActive,
      children: (node.children || []).map((c) =>
        transformNode(c, active && parentActive),
      ),
    };
  };
  const root = nodes.find((n) => n.id === 1);
  return root ? transformNode(root) : null;
};

const findNodePath = (node, targetId, trail = []) => {
  if (!node) return null;
  const nextTrail = [...trail, node];
  if (node.id === targetId) return nextTrail;
  for (const child of node.children || []) {
    const childPath = findNodePath(child, targetId, nextTrail);
    if (childPath) return childPath;
  }
  return null;
};

const buildColumnsFromPath = (tree, path = []) => {
  if (!tree) return [];
  const columns = [[tree, ...(tree.children || [])]];
  let currentColumn = columns[0];

  for (const nodeId of path) {
    const node = currentColumn.find((item) => item.id === nodeId);
    if (!node || !node.children || node.children.length === 0) break;
    columns.push(node.children);
    currentColumn = node.children;
  }

  return columns;
};

const normalizeRoleText = (roleValue) => String(roleValue || "").toLowerCase();

const normalizeTextValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (
    typeof value === "object" &&
    value?.type === "Buffer" &&
    Array.isArray(value?.data)
  ) {
    return String.fromCharCode(...value.data);
  }
  return String(value);
};

const getUserDisplayName = (user) =>
  normalizeTextValue(
    user?.user_full_name ||
      user?.full_name ||
      user?.username ||
      user?.user_name ||
      user?.name ||
      user?.user_login_id ||
      "",
  ).trim();

const getUserRoleLabel = (user) =>
  normalizeTextValue(user?.Roles || user?.Role || "").trim();

const getUserPrimaryId = (user) => Number(user?.userId || user?.ciUserId || 0);

// ─── RIGHT PANEL ─────────────────────────────────────────────────────────────
const RightPanel = ({ content, onClose }) => {
  if (!content) return null;
  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        alignSelf: "stretch",
        background: "hsl(var(--card))",
        borderLeft: "1px solid hsl(var(--border))",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        animation: "slideIn 0.22s ease",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {content}
      </div>
    </div>
  );
};

// ─── ACTION PANEL content ─────────────────────────────────────────────────────
const ActionPanelContent = ({
  node,
  mode,
  setMode,
  newChildName,
  setNewChildName,
  newChildDesc,
  setNewChildDesc,
  onSave,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onCancel,
  privilegeId,
}) => (
  <>
    <div
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid hsl(var(--muted))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: node.isActive === 1 ? "#22C55E" : "#EF4444",
            display: "inline-block",
          }}
        />
        <h2
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            maxWidth: 190,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            margin: 0,
          }}
        >
          {mode === "edit"
            ? `Edit: ${smartCapitalize(node.name)}`
            : mode === "create"
              ? "Create Child Node"
              : smartCapitalize(node.name)}
        </h2>
      </div>
      <button
        onClick={onCancel}
        style={iconBtnStyle(22)}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "hsl(var(--muted))")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <XIcon />
      </button>
    </div>

    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px 16px 250px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <Field label="Organization Name">
        <input
          type="text"
          placeholder="Enter Organization Name"
          value={newChildName}
          maxLength={20}
          onChange={(e) => {
            const v = e.target.value;
            if (/^[a-zA-Z0-9 ]*$/.test(v)) setNewChildName(v);
          }}
          disabled={mode === "view"}
          style={inputStyle(mode === "view")}
          onFocus={(e) => {
            if (mode !== "view") e.target.style.borderColor = "#3B82F6";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "hsl(var(--border))";
          }}
        />
      </Field>
      <Field label="Description">
        <input
          type="text"
          placeholder="Enter Description"
          value={newChildDesc}
          onChange={(e) => setNewChildDesc(e.target.value)}
          disabled={mode === "view"}
          style={inputStyle(mode === "view")}
          onFocus={(e) => {
            if (mode !== "view") e.target.style.borderColor = "#3B82F6";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "hsl(var(--border))";
          }}
        />
      </Field>
      {mode === "view" && (
        <Field label="Status">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 600,
              background: node.isActive === 1 ? "#F0FDF4" : "#FEF2F2",
              color: node.isActive === 1 ? "#16A34A" : "#DC2626",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: node.isActive === 1 ? "#22C55E" : "#EF4444",
                display: "inline-block",
              }}
            />
            {node.isActive === 1 ? "Active" : "Inactive"}
          </span>
        </Field>
      )}
    </div>

    <div
      style={{
        padding: "10px 16px",
        borderTop: "1px solid hsl(var(--muted))",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        top: "-240px",
        marginBottom: "-240px",
      }}
    >
      {mode === "view" && node.isActive === 1 && (
        <>
          {privilegeId?.includes(2) && (
            <button
              onClick={() => {
                setMode("create");
                setNewChildName("");
                setNewChildDesc("");
              }}
              style={btnPrimary()}
            >
              <PlusIcon /> Create Child Node
            </button>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            {privilegeId?.includes(3) && (
              <button
                onClick={() => setMode("edit")}
                style={btnSm("var(--brand-primary)", "hsl(var(--accent))")}
              >
                Edit
              </button>
            )}
            {privilegeId?.includes(5) && (
              <button
                onClick={onDelete}
                style={btnSm("#DC2626", "#FEF2F2")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#FEE2E2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#FEF2F2")
                }
              >
                Delete
              </button>
            )}
            {privilegeId?.includes(25) && (
              <button
                onClick={onDeactivate}
                style={btnSm("#D97706", "#FFFBEB")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#FEF3C7")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#FFFBEB")
                }
              >
                Deactivate
              </button>
            )}
          </div>
        </>
      )}
      {mode === "view" && node.isActive !== 1 && privilegeId?.includes(25) && (
        <button
          onClick={onActivate}
          style={{
            ...btnPrimary(),
            background: "#16A34A",
            borderColor: "#16A34A",
          }}
        >
          Activate
        </button>
      )}
      {mode === "edit" && (
        <button onClick={onEdit} style={btnPrimary()}>
          Save Changes
        </button>
      )}
      {mode === "create" && (
        <button onClick={onSave} style={btnPrimary()}>
          Save
        </button>
      )}
      <button
        onClick={onCancel}
        style={{
          width: "100%",
          padding: "6px 14px",
          fontSize: 11,
          fontWeight: 600,
          color: "hsl(var(--muted-foreground))",
          background: "hsl(var(--muted))",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "hsl(var(--border))")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "hsl(var(--muted))")
        }
      >
        Cancel
      </button>
    </div>
  </>
);

// ─── USERS PANEL content ──────────────────────────────────────────────────────
const UsersPanelContent = ({
  users,
  onClose,
  onSelectUser,
  userSearch,
  setUserSearch,
  orgPath,
  node,
  onDeassociateSuccess,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState({});
  // De-associate state
  const [deassociateMode, setDeassociateMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [deassociating, setDeassociating] = useState(false);

  const filtered = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    const displayName = getUserDisplayName(u).toLowerCase();
    const loginId = String(u.user_login_id || "").toLowerCase();
    const roleLabel = getUserRoleLabel(u).toLowerCase();
    if (!q) return true;
    return (
      displayName.includes(q) || loginId.includes(q) || roleLabel.includes(q)
    );
  });

  const roleOrder = Array.from(
    new Set(filtered.map((user) => getUserRoleLabel(user)).filter(Boolean)),
  );

  const groupConfig = roleOrder
    .map((role) => ({
      key: role,
      label: role,
      isAgent: normalizeRoleText(role).includes("agent"),
    }))
    .sort((a, b) => {
      if (a.isAgent && !b.isAgent) return 1;
      if (!a.isAgent && b.isAgent) return -1;
      return a.label.localeCompare(b.label);
    });

  const groupedUsers = filtered.reduce((acc, user) => {
    const groupKey = getUserRoleLabel(user);
    if (!groupKey) return acc;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(user);
    return acc;
  }, {});

  const toggleGroup = (groupKey) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const toggleAllGroups = () => {
    const shouldCollapseAll = groupConfig.some(
      (group) => !collapsedGroups[group.key],
    );
    const nextState = {};
    groupConfig.forEach((group) => {
      nextState[group.key] = shouldCollapseAll;
    });
    setCollapsedGroups(nextState);
  };

  const toggleUserSelect = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filtered
      .map((u) => getUserPrimaryId(u))
      .filter((id) => id > 0);
    const allFilteredSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedUserIds.includes(id));

    if (allFilteredSelected) {
      setSelectedUserIds((prev) =>
        prev.filter((id) => !filteredIds.includes(id)),
      );
    } else {
      setSelectedUserIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleDeassociate = async () => {
    if (selectedUserIds.length === 0) {
      alert("Please select at least one user to de-associate.");
      return;
    }
    if (
      !window.confirm(
        `De-associate ${selectedUserIds.length} user(s) from this organization?`,
      )
    )
      return;
    setDeassociating(true);
    try {
      const res = await fetch("/api/organization/UserDeassociate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          organizationId: node.id,
          userIds: selectedUserIds,
          createdBy: getUserId(),
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "Users de-associated successfully!");
        setDeassociateMode(false);
        setSelectedUserIds([]);
        onDeassociateSuccess(); // refresh users list
      } else {
        alert(`Failed: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeassociating(false);
    }
  };

  const cancelDeassociate = () => {
    setDeassociateMode(false);
    setSelectedUserIds([]);
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid hsl(var(--muted))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "hsl(var(--accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UsersIcon />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              Users
            </h3>
            {orgPath && (
              <p
                title={orgPath}
                style={{
                  fontSize: 10,
                  color: "var(--brand-primary)",
                  margin: "1px 0 0",
                  fontWeight: 600,
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                }}
              >
                {orgPath}
              </p>
            )}
            <p
              style={{
                fontSize: 10,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              {userSearch
                ? `${filtered.length} of ${users.length}`
                : `${users.length} member${users.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={iconBtnStyle(22)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--muted))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <XIcon />
        </button>
      </div>

      {/* Toolbar row: Collapse All + De-associate button */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid hsl(var(--muted))",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <button
          onClick={toggleAllGroups}
          style={{
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: "hsl(var(--foreground))",
            background: "hsl(var(--muted))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 5,
            cursor: "pointer",
          }}
        >
          {groupConfig.length > 0 &&
          groupConfig.every((g) => collapsedGroups[g.key])
            ? "Expand All"
            : "Collapse All"}
        </button>

        {/* De-associate toggle button — only shown when there are users */}
        {users.length > 0 && !deassociateMode && (
          <button
            onClick={() => setDeassociateMode(true)}
            style={{
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 600,
              color: "#DC2626",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 5,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FEE2E2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FEF2F2")}
          >
            De-associate
          </button>
        )}

        {/* When in de-associate mode: Select All + action buttons */}
        {deassociateMode && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 600,
                color: "hsl(var(--foreground))",
              }}
            >
              <input
                type="checkbox"
                checked={
                  selectedUserIds.length === filtered.length &&
                  filtered.length > 0
                }
                onChange={toggleSelectAll}
                style={{
                  width: 11,
                  height: 11,
                  cursor: "pointer",
                  accentColor: "#DC2626",
                }}
              />
              All
            </label>
            <span
              style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}
            >
              {selectedUserIds.length} sel.
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid hsl(var(--muted))",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            padding: "5px 10px",
          }}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by name or role..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 11,
              color: "hsl(var(--foreground))",
            }}
          />
          {userSearch && (
            <button
              onClick={() => setUserSearch("")}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "hsl(var(--muted-foreground))",
                padding: 0,
                display: "flex",
              }}
            >
              <XIcon size={11} />
            </button>
          )}
        </div>
      </div>

      {/* User list */}
      <div
        style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "4px 0" }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: "30px 16px", textAlign: "center" }}>
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              {userSearch ? "No users match your search" : "No users found"}
            </p>
          </div>
        ) : groupConfig.length === 0 ? (
          <div style={{ padding: "30px 16px", textAlign: "center" }}>
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              There is no user in role groups
            </p>
          </div>
        ) : (
          groupConfig.map((group, groupIndex) => {
            const sectionUsers = groupedUsers[group.key];
            const isCollapsed = collapsedGroups[group.key];

            return (
              <div key={group.key}>
                {groupIndex > 0 && (
                  <div
                    style={{
                      margin: "6px 16px",
                      borderTop: "1px solid hsl(var(--border))",
                    }}
                  />
                )}
                <button
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    width: "100%",
                    padding: "8px 16px",
                    border: "none",
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "hsl(var(--foreground))",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {group.label} ({sectionUsers.length})
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    {isCollapsed ? "+" : "-"}
                  </span>
                </button>

                {!isCollapsed && (
                  <>
                    {sectionUsers.map((user, idx) => {
                      const uid = getUserPrimaryId(user);
                      const isChecked = selectedUserIds.includes(uid);
                      return (
                        <div
                          key={`${group.key}-${uid}-${idx}`}
                          onClick={() => {
                            if (deassociateMode) {
                              toggleUserSelect(uid);
                            } else {
                              onSelectUser(user);
                            }
                          }}
                          style={{
                            padding: "5px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            borderBottom:
                              idx < sectionUsers.length - 1
                                ? "1px solid hsl(var(--background))"
                                : "none",
                            background:
                              isChecked && deassociateMode
                                ? "#FEF2F2"
                                : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!(isChecked && deassociateMode))
                              e.currentTarget.style.background =
                                "hsl(var(--background))";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              isChecked && deassociateMode
                                ? "#FEF2F2"
                                : "transparent";
                          }}
                        >
                          {/* Checkbox in de-associate mode */}
                          {deassociateMode && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleUserSelect(uid)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 12,
                                height: 12,
                                cursor: "pointer",
                                accentColor: "#DC2626",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: avatarColor(uid),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 700,
                              color: avatarColor(uid, 30),
                              flexShrink: 0,
                            }}
                          >
                            {String(getUserDisplayName(user) || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              title={getUserDisplayName(user)}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "hsl(var(--foreground))",
                                margin: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {getUserDisplayName(user)}
                            </p>
                          </div>
                          {!deassociateMode && <ChevronRightIcon size={12} />}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* De-associate action bar — shown at bottom when in de-associate mode */}
      {deassociateMode && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid hsl(var(--muted))",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flexShrink: 0,
            background: "#FFF9F9",
            position: "sticky",
            bottom: 0,
            zIndex: 2,
            marginTop: "auto",
          }}
        >
          <button
            onClick={handleDeassociate}
            disabled={deassociating || selectedUserIds.length === 0}
            style={{
              width: "100%",
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              background: selectedUserIds.length === 0 ? "#FDA4A4" : "#DC2626",
              border: "none",
              borderRadius: 6,
              cursor: selectedUserIds.length === 0 ? "not-allowed" : "pointer",
              opacity: deassociating ? 0.7 : 1,
            }}
          >
            {deassociating
              ? "De-associating..."
              : `De-associate${selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ""}`}
          </button>
          <button
            onClick={cancelDeassociate}
            style={{
              width: "100%",
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 600,
              color: "hsl(var(--muted-foreground))",
              background: "hsl(var(--muted))",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "hsl(var(--border))")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "hsl(var(--muted))")
            }
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

// ─── USER PROFILE PANEL content ───────────────────────────────────────────────
const UserProfileContent = ({ user, onBack, onClose }) => (
  <>
    <div
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid hsl(var(--border))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        background: "hsl(var(--card))",
      }}
    >
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 600,
          color: "hsl(var(--muted-foreground))",
          background: "hsl(var(--muted))",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "hsl(var(--border))")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "hsl(var(--muted))")
        }
      >
        <svg
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </button>
      <button
        onClick={onClose}
        style={iconBtnStyle(26)}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "hsl(var(--muted))")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <XIcon size={13} />
      </button>
    </div>

    <div
      style={{
        padding: "18px 20px 14px",
        background:
          "linear-gradient(135deg,hsl(var(--accent)) 0%,#F5F3FF 100%)",
        borderBottom: "1px solid hsl(var(--border))",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: avatarColor(user.userId),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          fontWeight: 700,
          color: avatarColor(user.userId, 30),
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
        }}
      >
        {String(user.user_full_name || "?")
          .charAt(0)
          .toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "hsl(var(--muted-foreground))",
            margin: "0 0 7px",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
          }}
        >
          User Profile
        </p>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            margin: "0 0 5px",
            wordBreak: "break-word",
          }}
        >
          {user.user_full_name}
        </h3>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 600,
            background: user.is_active == 1 ? "#DCFCE7" : "#FEE2E2",
            color: user.is_active == 1 ? "#16A34A" : "#DC2626",
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: user.is_active == 1 ? "#22C55E" : "#EF4444",
              display: "inline-block",
            }}
          />
          {user.is_active == 1 ? "Active" : "Inactive"}
        </span>
      </div>
    </div>

    <div
      style={{
        padding: "12px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        flex: 1,
        overflowY: "auto",
      }}
    >
      {[
        { label: "Email", value: user.email },
        { label: "Contact No.", value: user.phone },
        { label: "Organization", value: user.Organizations },
        { label: "Role", value: user.Roles },
      ].map(({ label, value }) => (
        <div key={label}>
          <p
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "hsl(var(--muted-foreground))",
              margin: "0 0 2px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "hsl(var(--foreground))",
              margin: 0,
              wordBreak: "break-all",
            }}
          >
            {value || "—"}
          </p>
        </div>
      ))}
    </div>
  </>
);

// ─── MAP USERS PANEL content ───────────────────────────────────────────────
const MapUsersPanelContent = ({ node, onClose, onSaveMapping }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [search, setSearch] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setSelectedUserIds([]);
        const res = await fetch("/api/organization/UserListGet", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAllUsers(data.users || []);
        } else {
          setAllUsers([]);
        }
      } catch (err) {
        console.error("Error fetching users:", err.message);
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [node.id]);

  const filtered = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      String(u.username || "")
        .toLowerCase()
        .includes(q) ||
      String(u.ciUserId || "")
        .toLowerCase()
        .includes(q)
    );
  });

  const toggleUser = (userId) => {
    setValidationError("");
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleSelectAll = () => {
    setValidationError("");
    if (selectedUserIds.length === filtered.length && filtered.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filtered.map((u) => u.ciUserId));
    }
  };

  const handleSave = async () => {
    if (selectedUserIds.length === 0) {
      setValidationError("Please select at least one user to map.");
      return;
    }
    setSaving(true);
    try {
      const selectedUsers = allUsers.filter((u) =>
        selectedUserIds.includes(u.ciUserId),
      );
      await onSaveMapping(node.id, selectedUsers);
    } finally {
      setSaving(false);
    }
  };

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((u) => selectedUserIds.includes(u.ciUserId));

  return (
    <>
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid hsl(var(--muted))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "hsl(var(--accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LinkIcon />
          </div>
          <div>
            <h2
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              Map Users
            </h2>
            <p
              style={{
                fontSize: 10,
                color: "var(--brand-primary)",
                margin: "1px 0 0",
                fontWeight: 600,
              }}
            >
              {smartCapitalize(node.name)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={iconBtnStyle(22)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--muted))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <XIcon />
        </button>
      </div>

      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid hsl(var(--muted))",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            padding: "5px 10px",
          }}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 11,
              color: "hsl(var(--foreground))",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "hsl(var(--muted-foreground))",
                padding: 0,
                display: "flex",
              }}
            >
              <XIcon size={11} />
            </button>
          )}
        </div>
      </div>

      {!loading && filtered.length > 0 && (
        <div
          style={{
            padding: "6px 16px",
            borderBottom: "1px solid hsl(var(--muted))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: "hsl(var(--foreground))",
            }}
          >
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              style={{
                width: 12,
                height: 12,
                cursor: "pointer",
                accentColor: "var(--brand-primary)",
              }}
            />
            Select All
          </label>
          <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>
            {selectedUserIds.length} selected
          </span>
        </div>
      )}

      {validationError && (
        <div
          style={{
            padding: "6px 16px",
            background: "#FEF2F2",
            borderBottom: "1px solid #FECACA",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: "#DC2626",
              margin: 0,
              fontWeight: 500,
            }}
          >
            ⚠ {validationError}
          </p>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {loading ? (
          <div style={{ padding: "30px 16px", textAlign: "center" }}>
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              Loading users...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "30px 16px", textAlign: "center" }}>
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              {search ? "No users match your search" : "No users available"}
            </p>
          </div>
        ) : (
          filtered.map((user, idx) => {
            const uid = user.ciUserId;
            const isChecked = selectedUserIds.includes(uid);
            const displayName = user.username || "Unknown";
            const loginId = user.agentLoginId || "";
            return (
              <div
                key={uid}
                onClick={() => toggleUser(uid)}
                style={{
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  borderBottom:
                    idx < filtered.length - 1
                      ? "1px solid hsl(var(--background))"
                      : "none",
                  background: isChecked ? "hsl(var(--accent))" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isChecked)
                    e.currentTarget.style.background = "hsl(var(--background))";
                }}
                onMouseLeave={(e) => {
                  if (!isChecked)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleUser(uid)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 12,
                    height: 12,
                    cursor: "pointer",
                    accentColor: "var(--brand-primary)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "hsl(var(--foreground))",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayName}
                  </p>
                  {loginId && (
                    <p
                      title={loginId}
                      style={{
                        fontSize: 10,
                        color: "hsl(var(--muted-foreground))",
                        margin: "1px 0 0",
                        wordBreak: "break-all",
                        whiteSpace: "normal",
                        lineHeight: 1.4,
                      }}
                    >
                      ({loginId})
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid hsl(var(--muted))",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...btnPrimary(),
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving
            ? "Saving..."
            : `Save Mapping${selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ""}`}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 600,
            color: "hsl(var(--muted-foreground))",
            background: "hsl(var(--muted))",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--border))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "hsl(var(--muted))")
          }
        >
          Cancel
        </button>
      </div>
    </>
  );
};

// ─── ADD USERS PANEL content (unmapped users → associate to org) ──────────────
const AddUsersPanelContent = ({ node, onClose, onAssociateUsers }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [search, setSearch] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const fetchUnmappedUsers = async () => {
      try {
        setLoading(true);
        setSelectedUserIds([]);
        const res = await fetch("/api/organization/UnmappedUsersGet", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });
        const data = await res.json();
        setAllUsers(data.users || []);
      } catch (err) {
        console.error("Error fetching unmapped users:", err.message);
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUnmappedUsers();
  }, [node.id]);

  const filtered = allUsers.filter((u) => {
    const q = search.toLowerCase();
    const name = normalizeTextValue(
      u.user_full_name || u.user_login_id || "",
    ).toLowerCase();
    const email = normalizeTextValue(u.email || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const toggleUser = (userId) => {
    setValidationError("");
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleSelectAll = () => {
    setValidationError("");
    const allIds = filtered.map((u) => u.userId);
    if (selectedUserIds.length === allIds.length && allIds.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(allIds);
    }
  };

  const handleSave = async () => {
    if (selectedUserIds.length === 0) {
      setValidationError("Please select at least one user to associate.");
      return;
    }
    setSaving(true);
    try {
      await onAssociateUsers(node.id, selectedUserIds);
    } finally {
      setSaving(false);
    }
  };

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((u) => selectedUserIds.includes(u.userId));

  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid hsl(var(--muted))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "#DCFCE7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserPlusIcon />
          </div>
          <div>
            <h2
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              Assign the unmapped users{/* to {smartCapitalize(node.name)}*/}
            </h2>
            <p
              style={{
                fontSize: 10,
                color: "var(--brand-primary)",
                margin: "1px 0 0",
                fontWeight: 600,
              }}
            >
              {smartCapitalize(node.name)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={iconBtnStyle(22)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--muted))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <XIcon />
        </button>
      </div>

      {/* Info banner */}
      <div
        style={{
          padding: "7px 16px",
          background: "#F0FDF4",
          borderBottom: "1px solid #BBF7D0",
          flexShrink: 0,
        }}
      >
        <p
          style={{ fontSize: 10, color: "#15803D", margin: 0, fontWeight: 500 }}
        >
          Showing users not yet assigned to any organization
        </p>
      </div>

      {/* Search */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid hsl(var(--muted))",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            padding: "5px 10px",
          }}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 11,
              color: "hsl(var(--foreground))",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "hsl(var(--muted-foreground))",
                padding: 0,
                display: "flex",
              }}
            >
              <XIcon size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Select All row */}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            padding: "6px 16px",
            borderBottom: "1px solid hsl(var(--muted))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: "hsl(var(--foreground))",
            }}
          >
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              style={{
                width: 12,
                height: 12,
                cursor: "pointer",
                accentColor: "#16A34A",
              }}
            />
            Select All
          </label>
          <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>
            {selectedUserIds.length} selected
          </span>
        </div>
      )}

      {validationError && (
        <div
          style={{
            padding: "6px 16px",
            background: "#FEF2F2",
            borderBottom: "1px solid #FECACA",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: "#DC2626",
              margin: 0,
              fontWeight: 500,
            }}
          >
            ⚠ {validationError}
          </p>
        </div>
      )}

      {/* User list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {loading ? (
          <div style={{ padding: "30px 16px", textAlign: "center" }}>
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              Loading unmapped users...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "30px 16px", textAlign: "center" }}>
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              {search
                ? "No users match your search"
                : "All users are already mapped to an organization"}
            </p>
          </div>
        ) : (
          filtered.map((user, idx) => {
            const uid = user.userId;
            const isChecked = selectedUserIds.includes(uid);
            const displayName = normalizeTextValue(
              user.user_full_name || user.user_login_id || "Unknown",
            );
            const email = normalizeTextValue(user.email);
            return (
              <div
                key={uid}
                onClick={() => toggleUser(uid)}
                style={{
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  borderBottom:
                    idx < filtered.length - 1
                      ? "1px solid hsl(var(--background))"
                      : "none",
                  background: isChecked ? "#F0FDF4" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isChecked)
                    e.currentTarget.style.background = "hsl(var(--background))";
                }}
                onMouseLeave={(e) => {
                  if (!isChecked)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleUser(uid)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 12,
                    height: 12,
                    cursor: "pointer",
                    accentColor: "#16A34A",
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: avatarColor(uid),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: avatarColor(uid, 30),
                    flexShrink: 0,
                  }}
                >
                  {String(displayName).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    title={displayName}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "hsl(var(--foreground))",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayName}
                  </p>
                  {email && (
                    <p
                      style={{
                        fontSize: 10,
                        color: "hsl(var(--muted-foreground))",
                        margin: "1px 0 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {email}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer actions */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid hsl(var(--muted))",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...btnPrimary(),
            background: "#16A34A",
            borderColor: "#16A34A",
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving
            ? "Associating..."
            : `Associate${selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ""}`}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 600,
            color: "hsl(var(--muted-foreground))",
            background: "hsl(var(--muted))",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--border))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "hsl(var(--muted))")
          }
        >
          Cancel
        </button>
      </div>
    </>
  );
};

// ─── COLUMN NODE CARD ─────────────────────────────────────────────────────────
const NodeCard = ({
  node,
  isSelected,
  onActionClick,
  onUsersClick,
  onArrowClick,
  onMapUsersClick,
  onAddUsersClick, // ← NEW
  showAddUsersAction = true,
  privilegeId,
  isRoot = false,
}) => {
  const isActive = node.isActive === 1;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div
      title={smartCapitalize(node.name)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 8px",
        borderRadius: 6,
        marginBottom: 3,
        border: `1px solid ${isSelected ? "var(--brand-primary)" : "hsl(var(--border))"}`,
        background: "hsl(var(--card))",
        cursor: "pointer",
        userSelect: "none",
        opacity: node.isDisabled ? 0.5 : 1,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "hsl(var(--background))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "hsl(var(--card))";
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: isActive ? "#22C55E" : "#EF4444",
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: 11,
          fontWeight: 500,
          color: node.isDisabled
            ? "hsl(var(--muted-foreground))"
            : "hsl(var(--foreground))",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {smartCapitalize(node.name)}
      </span>

      <div
        style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
      >
        {privilegeId?.length > 1 && (
          <button
            title="Actions"
            onClick={(e) => {
              e.stopPropagation();
              if (!node.isDisabled) onActionClick(node);
            }}
            style={{
              ...iconBtnStyle(20),
              color: "hsl(var(--muted-foreground))",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "hsl(var(--border))")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <SettingsIcon />
          </button>
        )}
        {/* View Users */}
        <button
          title="View Users"
          onClick={(e) => {
            e.stopPropagation();
            onUsersClick(node);
          }}
          style={{ ...iconBtnStyle(20), color: "hsl(var(--muted-foreground))" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--border))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <UserIcon />
        </button>
        {/* Add Users (unmapped) — NEW */}
        {showAddUsersAction && (
          <button
            title="Assign Unmapped Users"
            onClick={(e) => {
              e.stopPropagation();
              if (!node.isDisabled) onAddUsersClick(node);
            }}
            style={{ ...iconBtnStyle(20), color: "#16A34A" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "hsl(var(--border))")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <UserPlusIcon size={12} />
          </button>
        )}
        {hasChildren && !isRoot && (
          <button
            title="View Children"
            onClick={(e) => {
              e.stopPropagation();
              onArrowClick(node);
            }}
            style={{
              ...iconBtnStyle(20),
              color: isSelected
                ? "var(--brand-primary)"
                : "hsl(var(--muted-foreground))",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "hsl(var(--border))")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <ChevronRightIcon size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── COLUMN ───────────────────────────────────────────────────────────────────
const OrgColumn = ({
  nodes,
  selectedNodeId,
  onActionClick,
  onUsersClick,
  onArrowClick,
  onMapUsersClick,
  onAddUsersClick, // ← NEW
  showAddUsersAction = true,
  privilegeId,
  isFirstColumn = false,
  isSqueezeable = false,
  isSqueezing = false,
  onUnsqueeze,
}) => {
  if (isSqueezeable && isSqueezing) {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
    return (
      <div
        onClick={onUnsqueeze}
        title={`Click to expand: ${smartCapitalize(selectedNode?.name || "")}`}
        style={{
          width: 88,
          flexShrink: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          background: "hsl(var(--background))",
          borderRadius: 8,
          border: "1px solid var(--brand-primary)",
          cursor: "pointer",
          overflow: "hidden",
          transition: "width 0.2s ease",
          gap: 4,
          padding: "8px 8px",
          minHeight: 36,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "hsl(var(--accent))")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "hsl(var(--background))")
        }
      >
        <ChevronRightIcon size={10} />
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "var(--brand-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 58,
          }}
        >
          {smartCapitalize(selectedNode?.name || "")}
        </span>
      </div>
    );
  }

  if (isFirstColumn && nodes.length > 0) {
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1);
    return (
      <div
        style={{
          width: 200,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "hsl(var(--background))",
          borderRadius: 8,
          border: "1px solid hsl(var(--border))",
          overflow: "hidden",
          transition: "width 0.2s ease",
        }}
      >
        <div
          style={{
            background: "hsl(var(--muted))",
            padding: "7px 6px 5px",
            borderBottom: "2px solid #BFDBFE",
          }}
        >
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "var(--brand-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              marginBottom: 4,
              paddingLeft: 3,
            }}
          >
            Root
          </div>
          <NodeCard
            node={rootNode}
            isSelected={selectedNodeId === rootNode.id}
            onActionClick={onActionClick}
            onUsersClick={onUsersClick}
            onArrowClick={onArrowClick}
            onMapUsersClick={onMapUsersClick}
            onAddUsersClick={onAddUsersClick}
            showAddUsersAction={showAddUsersAction}
            privilegeId={privilegeId}
            isRoot={true}
          />
        </div>
        <div style={{ padding: "5px 6px", flex: 1, overflowY: "auto" }}>
          {childNodes.length === 0 ? (
            <p
              style={{
                fontSize: 10,
                color: "hsl(var(--border))",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              No children
            </p>
          ) : (
            childNodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onActionClick={onActionClick}
                onUsersClick={onUsersClick}
                onArrowClick={onArrowClick}
                onMapUsersClick={onMapUsersClick}
                onAddUsersClick={onAddUsersClick}
                showAddUsersAction={showAddUsersAction}
                privilegeId={privilegeId}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 190,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "hsl(var(--background))",
        borderRadius: 8,
        border: "1px solid hsl(var(--border))",
        overflow: "hidden",
        transition: "width 0.2s ease",
      }}
    >
      <div style={{ padding: "6px", flex: 1, overflowY: "auto" }}>
        {nodes.length === 0 ? (
          <p
            style={{
              fontSize: 10,
              color: "hsl(var(--border))",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            No items
          </p>
        ) : (
          nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              onActionClick={onActionClick}
              onUsersClick={onUsersClick}
              onArrowClick={onArrowClick}
              onMapUsersClick={onMapUsersClick}
              onAddUsersClick={onAddUsersClick}
              showAddUsersAction={showAddUsersAction}
              privilegeId={privilegeId}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const Page = () => {
  const [root, setRoot] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [privilegeId, setPrivilegeId] = useState(null);
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [orgCounts, setOrgCounts] = useState({ Active: 0, Inactive: 0 });

  const [columns, setColumns] = useState([]);
  const [selectedPath, setSelectedPath] = useState([]);
  const [squeezedCols, setSqueezedCols] = useState(new Set());

  const [rightPanel, setRightPanel] = useState(null);
  const [actionNode, setActionNode] = useState(null);
  const [mode, setMode] = useState("view");
  const [newChildName, setNewChildName] = useState("");
  const [newChildDesc, setNewChildDesc] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [showAssociationError, setShowAssociationError] = useState(false);
  const [associationErrorMsg, setAssociationErrorMsg] = useState("");
  const [hasUnmappedUsers, setHasUnmappedUsers] = useState(false);

  const router = useRouter();
  const scrollRef = useRef(null);

  const getOrgPathLabel = (nodeId) =>
    findNodePath(treeData, nodeId)
      ?.map((item) => smartCapitalize(item.name))
      .join(" > ");

  const fetchUsersForOrganization = async (nodeId) => {
    const res = await fetch(`/api/organization/UserDeatilsGet/${nodeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        orgId: sessionStorage.getItem("selectedOrgId") || "",
        orgIds: getSelectedOrgIdsHeader(),
      },
      cache: "no-store",
    });

    const data = await res.json();
    return res.ok && data.success ? data.users : [];
  };

  const refreshUnmappedUsersAvailability = async () => {
    try {
      const res = await fetch("/api/organization/UnmappedUsersGet", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        cache: "no-store",
      });

      const data = await res.json();
      setHasUnmappedUsers(Array.isArray(data?.users) && data.users.length > 0);
    } catch (err) {
      console.error("Failed to check unmapped users:", err.message);
      setHasUnmappedUsers(false);
    }
  };

  const hasPrivilege = React.useCallback(
    (id) => privileges.some((p) => p.PrivilegeId === id),
    [privileges],
  );

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        let userId = null;
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          userId =
            JSON.parse(bytes.toString(CryptoJS.enc.Utf8))?.userId || null;
        }
        const res = await fetch("/api/privileges", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 8,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
            orgIds: getSelectedOrgIdsHeader(),
          },
          cache: "no-store",
        });
        if (!res.ok) {
          console.warn("Failed to fetch privileges: response not ok");
          return;
        }
        const data = await res.json();
        setPrivilegeId(data.privileges.map((p) => p.PrivilegeId));
        setPrivileges(data.privileges || []);
      } catch (err) {
        console.warn("Error fetching privileges:", err.message);
      } finally {
        setPrivilegesLoaded(true);
      }
    };
    fetchPrivileges();
  }, []);

  const fetchOrganization = async ({ preserveView = false } = {}) => {
    try {
      const res = await fetch("/api/organization/root", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const allNodes = data.organizations || [];
        const rootNode = allNodes.find((o) => o.id === 1) || { children: [] };
        setRoot(rootNode);
        const tree = transformDataForTree(allNodes);
        setTreeData(tree);
        setOrgCounts(data.counts || {});
        if (tree) {
          setColumns(
            preserveView
              ? buildColumnsFromPath(tree, selectedPath)
              : buildColumnsFromPath(tree),
          );
        }
      }
    } catch (err) {
      console.error("Fetch organization failed.");
    }
  };

  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) fetchOrganization();
  }, [privilegesLoaded, hasPrivilege]);

  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) refreshUnmappedUsersAvailability();
  }, [privilegesLoaded, hasPrivilege]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [columns.length]);

  if (!privilegesLoaded)
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  if (privilegesLoaded && !hasPrivilege(1)) return notFound();

  const handleArrowClick = (node) => {
    const colIndex = columns.findIndex((col) =>
      col.some((n) => n.id === node.id),
    );
    if (colIndex === -1) return;

    const newColumns = columns.slice(0, colIndex + 1);
    const newPath = selectedPath.slice(0, colIndex + 1);
    newPath[colIndex] = node.id;

    if (node.children && node.children.length > 0) {
      newColumns.push(node.children);
    }

    setColumns(newColumns);
    setSelectedPath(newPath);

    const newSqueezed = new Set();
    for (let i = 1; i <= colIndex; i++) {
      newSqueezed.add(i);
    }
    setSqueezedCols(newSqueezed);
  };

  const handleUnsqueeze = (colIdx) => {
    const newSqueezed = new Set(squeezedCols);
    for (let i = colIdx; i < columns.length; i++) {
      newSqueezed.delete(i);
    }
    setSqueezedCols(newSqueezed);
    setColumns((prev) => prev.slice(0, colIdx + 1));
    setSelectedPath((prev) => prev.slice(0, colIdx));
  };

  const handleActionClick = async (node) => {
    try {
      const orgRes = await fetch(
        `/api/organization/DescriptionGet/${node.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
            orgIds: getSelectedOrgIdsHeader(),
          },
          cache: "no-store",
        },
      );
      const orgData = await orgRes.json();
      if (orgRes.ok && orgData.success) {
        const fullNode = {
          id: node.id,
          name: orgData.organization.Name,
          description: orgData.organization.Description,
          isActive: Number(orgData.organization.isActive),
          isDisabled: node.isDisabled,
        };
        setActionNode(fullNode);
        setNewChildName(orgData.organization.Name);
        setNewChildDesc(orgData.organization.Description);
        setMode("view");
        setRightPanel({ type: "action" });
      }
    } catch (err) {
      alert(`Error: ${err.message || err}`);
    }
  };

  const handleUsersClick = async (node) => {
    try {
      const res = await fetch(`/api/organization/UserDeatilsGet/${node.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
        cache: "no-store",
      });
      const data = await res.json();
      const users = res.ok && data.success ? data.users : [];
      const orgPath =
        findNodePath(treeData, node.id)
          ?.map((item) => smartCapitalize(item.name))
          .join(" › ") || smartCapitalize(node.name);
      setUserSearch("");
      setRightPanel({ type: "users", users, node, orgPath });
    } catch (err) {
      alert(`Error: ${err.message || err}`);
    }
  };

  // Called after successful de-associate to refresh the users list in the panel
  const handleDeassociateSuccess = async () => {
    if (!rightPanel?.node) return;
    try {
      const users = await fetchUsersForOrganization(rightPanel.node.id);
      setRightPanel((prev) => ({ ...prev, type: "users", users }));
      await refreshUnmappedUsersAvailability();
    } catch (err) {
      console.error("Refresh users failed.");
    }
  };

  const handleMapUsersClick = (node) => {
    setRightPanel({ type: "mapUsers", node });
  };

  // ← NEW: open the Add Users (unmapped) panel
  const handleAddUsersClick = (node) => {
    setRightPanel({ type: "addUsers", node });
  };

  const handleSaveMapping = async (organizationId, users) => {
    try {
      const createdBy = getUserId();
      const res = await fetch("/api/organization/UserMappingSave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          organizationId,
          createdBy,
          users: users.map((u) => ({
            ciUserId: u.ciUserId || u.userId,
            agentLoginId: u.agentLoginId || u.user_login_id,
            username: u.username || u.user_full_name,
            userProfile: u.UserProfile,
            userProfileId: u.userProfileId,
            email: u.email,
          })),
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const currentNode =
          rightPanel?.node?.id === organizationId
            ? rightPanel.node
            : treeData
              ? buildMap([treeData])[organizationId]
              : null;
        const refreshedUsers = await fetchUsersForOrganization(organizationId);

        alert(data.message || "Users associated successfully!");
        await refreshUnmappedUsersAvailability();
        setUserSearch("");
        setRightPanel({
          type: "users",
          users: refreshedUsers,
          node: currentNode || { id: organizationId, name: "Organization" },
          orgPath:
            getOrgPathLabel(organizationId) ||
            smartCapitalize(currentNode?.name || "Organization"),
        });
      } else {
        alert(`Failed: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleAssociateExistingUsers = async (organizationId, userIds) => {
    try {
      const createdBy = getUserId();
      const res = await fetch("/api/organization/UserAssociate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          organizationId,
          createdBy,
          userIds,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const currentNode =
          rightPanel?.node?.id === organizationId
            ? rightPanel.node
            : treeData
              ? buildMap([treeData])[organizationId]
              : null;
        const refreshedUsers = await fetchUsersForOrganization(organizationId);

        alert(data.message || "Users associated successfully!");
        await refreshUnmappedUsersAvailability();
        setUserSearch("");
        setRightPanel({
          type: "users",
          users: refreshedUsers,
          node: currentNode || { id: organizationId, name: "Organization" },
          orgPath:
            getOrgPathLabel(organizationId) ||
            smartCapitalize(currentNode?.name || "Organization"),
        });
      } else {
        alert(`Failed: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const closePanel = () => {
    setRightPanel(null);
    setActionNode(null);
    setMode("view");
  };

  const addChild = async () => {
    if (!actionNode) return;
    if (/[^a-zA-Z0-9 ]/.test(newChildName)) {
      alert("Organization name must not contain special characters.");
      return;
    }
    if (!newChildName.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    if (newChildName.length > 20) {
      alert("Max 20 characters for name.");
      return;
    }
    const userId = getUserId();
    try {
      const res = await fetch("/api/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          name: newChildName,
          description: newChildDesc,
          parentId: actionNode.id,
          userId,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        closePanel();
        await fetchOrganization({ preserveView: true });
      } else {
        alert(
          data.message ||
            "Failed to create organization. It may already exist or limit reached.",
        );
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const editChild = async () => {
    if (!actionNode) return;
    if (/[^a-zA-Z0-9 ]/.test(newChildName)) {
      alert("No special characters allowed.");
      return;
    }
    if (!newChildName.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    if (newChildName.length > 20) {
      alert("Max 20 characters.");
      return;
    }
    const userId = getUserId();
    try {
      const res = await fetch(`/api/organization/EditChild/${actionNode.id}`, {
        method: "Post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          name: newChildName,
          description: newChildDesc,
          userId,
          OrganizationId: actionNode.id,
          isActive: actionNode.isActive ? 1 : 0,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        closePanel();
        await fetchOrganization({ preserveView: true });
      } else {
        alert(
          data.message ||
            "Failed to update organization. Name may already exist.",
        );
      }
    } catch (err) {
      alert(`Error: ${err.message || err}`);
    }
  };

  const deleteNode = async () => {
    if (!actionNode) return;
    if (!window.confirm("Are you sure you want to delete this organization?"))
      return;
    try {
      const res = await fetch(`/api/organization/Delete/${actionNode.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgIds: getSelectedOrgIdsHeader(),
        },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Deleted successfully.");
        closePanel();
        await fetchOrganization();
      } else {
        if (data.statusCode === 403 || data.statusCode === 410) {
          setAssociationErrorMsg(
            data.message ||
              "there is a child user exist delete them first to delete the organization",
          );
          setShowAssociationError(true);
          return;
        }
        alert(data.message || "Unknown error");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const toggleActivation = async (activate) => {
    if (!actionNode) return;
    if (
      !activate &&
      !window.confirm(
        "Deactivate this organization? All children will be affected.",
      )
    )
      return;
    if (!activate) {
      try {
        const checkRes = await fetch("/api/organization/checkOrgAssociation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            orgIds: getSelectedOrgIdsHeader(),
          },
          body: JSON.stringify({ OrgId: actionNode.id }),
          cache: "no-store",
        });
        const checkData = await checkRes.json();
        if (checkRes.ok && checkData.success && checkData.isAssociated) {
          setShowAssociationError(true);
          return;
        }
      } catch (err) {
        console.error("Check organization association failed.");
      }
    }
    const userId = getUserId();
    try {
      const res = await fetch(
        `/api/organization/EditIsActive/${actionNode.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            orgIds: getSelectedOrgIdsHeader(),
          },
          body: JSON.stringify({
            userId,
            OrganizationId: actionNode.id,
            isActive: activate ? 1 : 0,
          }),
          cache: "no-store",
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Organization ${activate ? "activated" : "deactivated"}!`);
        closePanel();
        await fetchOrganization();
      } else alert(`Failed: ${data.message}`);
    } catch {
      alert("Something went wrong.");
    }
  };

  const rootNodeName = treeData ? smartCapitalize(treeData.name) : "Root";

  const breadcrumb = [];
  breadcrumb.push({ label: rootNodeName, colIdx: -1, isRoot: true });

  selectedPath.forEach((nodeId, i) => {
    const col = columns[i] || [];
    const n = col.find((x) => x.id === nodeId);
    if (n)
      breadcrumb.push({
        label: smartCapitalize(n.name),
        colIdx: i,
        isRoot: false,
      });
  });

  const handleBreadcrumbClick = (colIdx, isRoot) => {
    if (isRoot) {
      setColumns(treeData ? [[treeData, ...(treeData.children || [])]] : []);
      setSelectedPath([]);
      setSqueezedCols(new Set());
      closePanel();
    } else {
      handleUnsqueeze(colIdx);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 88px)",
        minHeight: 0,
        overflow: "hidden",
        background: "hsl(var(--background))",
      }}
    >
      {/* ── TOP BAR */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 16px",
          borderBottom: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <h1
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "hsl(var(--foreground))",
              margin: 0,
              letterSpacing: "0.5px",
            }}
          >
            ORGANIZATION MANAGER
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={`${crumb.colIdx}-${idx}`}>
                {idx > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      color: "hsl(var(--muted-foreground))",
                      userSelect: "none",
                    }}
                  >
                    ›
                  </span>
                )}
                <button
                  onClick={() =>
                    handleBreadcrumbClick(crumb.colIdx, crumb.isRoot)
                  }
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color:
                      idx === breadcrumb.length - 1
                        ? "var(--brand-primary)"
                        : "hsl(var(--muted-foreground))",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "1px 3px",
                    borderRadius: 3,
                    transition: "color 0.12s, background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "hsl(var(--accent))";
                    e.currentTarget.style.color = "var(--brand-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.color =
                      idx === breadcrumb.length - 1
                        ? "var(--brand-primary)"
                        : "hsl(var(--muted-foreground))";
                  }}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22C55E",
                display: "inline-block",
              }}
            />
            Active{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>
              {orgCounts?.Active ?? 0}
            </strong>
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#EF4444",
                display: "inline-block",
              }}
            />
            Inactive{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>
              {orgCounts?.Inactive ?? 0}
            </strong>
          </span>
          <button
            onClick={() => {
              setColumns(
                treeData ? [[treeData, ...(treeData.children || [])]] : [],
              );
              setSelectedPath([]);
              setSqueezedCols(new Set());
              closePanel();
            }}
            style={{
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 600,
              color: "hsl(var(--foreground))",
              background: "hsl(var(--muted))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 5,
              cursor: "pointer",
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── COLUMNS AREA */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              display: "flex",
              gap: 8,
              padding: 10,
              overflowX: "auto",
              overflowY: "hidden",
              alignItems: "flex-start",
            }}
          >
            {columns.map((colNodes, colIdx) => {
              const isFirst = colIdx === 0;
              const isSqueezeable = !isFirst;
              const isSqueezed = squeezedCols.has(colIdx);
              return (
                <OrgColumn
                  key={colIdx}
                  nodes={colNodes}
                  selectedNodeId={selectedPath[colIdx]}
                  onActionClick={handleActionClick}
                  onUsersClick={handleUsersClick}
                  onArrowClick={handleArrowClick}
                  onMapUsersClick={handleMapUsersClick}
                  onAddUsersClick={handleAddUsersClick}
                  showAddUsersAction={hasUnmappedUsers}
                  privilegeId={privilegeId}
                  isFirstColumn={isFirst}
                  isSqueezeable={isSqueezeable}
                  isSqueezing={isSqueezed}
                  onUnsqueeze={() => handleUnsqueeze(colIdx)}
                />
              );
            })}
          </div>

          <RightPanel
            content={
              rightPanel?.type === "action" && actionNode ? (
                <ActionPanelContent
                  node={actionNode}
                  mode={mode}
                  setMode={setMode}
                  newChildName={newChildName}
                  setNewChildName={setNewChildName}
                  newChildDesc={newChildDesc}
                  setNewChildDesc={setNewChildDesc}
                  onSave={addChild}
                  onEdit={editChild}
                  onDelete={deleteNode}
                  onActivate={() => toggleActivation(true)}
                  onDeactivate={() => toggleActivation(false)}
                  onCancel={closePanel}
                  privilegeId={privilegeId}
                />
              ) : rightPanel?.type === "users" ? (
                <UsersPanelContent
                  users={rightPanel.users}
                  onClose={closePanel}
                  orgPath={rightPanel.orgPath}
                  node={rightPanel.node}
                  onSelectUser={(u) =>
                    setRightPanel({
                      ...rightPanel,
                      type: "profile",
                      selectedUser: u,
                    })
                  }
                  userSearch={userSearch}
                  setUserSearch={setUserSearch}
                  onDeassociateSuccess={handleDeassociateSuccess}
                />
              ) : rightPanel?.type === "profile" ? (
                <UserProfileContent
                  user={rightPanel.selectedUser}
                  onBack={() => setRightPanel({ ...rightPanel, type: "users" })}
                  onClose={closePanel}
                />
              ) : rightPanel?.type === "mapUsers" ? (
                <MapUsersPanelContent
                  node={rightPanel.node}
                  onClose={closePanel}
                  onSaveMapping={handleSaveMapping}
                />
              ) : rightPanel?.type === "addUsers" ? (
                <AddUsersPanelContent
                  node={rightPanel.node}
                  onClose={closePanel}
                  onAssociateUsers={handleAssociateExistingUsers}
                />
              ) : null
            }
            onClose={closePanel}
          />
        </div>
      </div>

      {/* ── ASSOCIATION ERROR MODAL */}
      {showAssociationError && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "hsl(var(--card))",
              padding: 20,
              borderRadius: 10,
              textAlign: "center",
              maxWidth: 380,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <p
              style={{
                marginBottom: 16,
                fontSize: 12,
                color: "hsl(var(--foreground))",
              }}
            >
              {associationErrorMsg ||
                "This organization or its children may be associated with users. Please de-associate them first."}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              <button
                onClick={() => setShowAssociationError(false)}
                style={{
                  padding: "7px 16px",
                  background: "hsl(var(--muted))",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAssociationError(false);
                  router.push("/dashboard/users");
                }}
                style={{
                  padding: "7px 16px",
                  background: "var(--brand-primary)",
                  color: "hsl(var(--card))",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Go to Users Page
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:hsl(var(--muted)); border-radius:10px; }
        ::-webkit-scrollbar-thumb { background:hsl(var(--border)); border-radius:10px; }
      `}</style>
    </div>
  );
};

export default withAuth(Page);

// ─── UTIL ─────────────────────────────────────────────────────────────────────
function getUserId() {
  try {
    const enc = sessionStorage.getItem("user");
    if (!enc) return null;
    const bytes = CryptoJS.AES.decrypt(enc, "");
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))?.userId || null;
  } catch {
    return null;
  }
}

// ─── MINI STYLE HELPERS ───────────────────────────────────────────────────────
function iconBtnStyle(size = 24) {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  };
}
function inputStyle(disabled) {
  return {
    width: "100%",
    padding: "6px 10px",
    fontSize: 12,
    color: "hsl(var(--foreground))",
    background: disabled ? "hsl(var(--background))" : "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 6,
    outline: "none",
    cursor: disabled ? "default" : "text",
    boxSizing: "border-box",
  };
}
function btnPrimary() {
  return {
    width: "100%",
    padding: "6px 14px",
    fontSize: 11,
    fontWeight: 600,
    color: "hsl(var(--card))",
    background: "var(--brand-primary)",
    border: "1px solid var(--brand-primary)",
    borderRadius: 6,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    transition: "background 0.15s",
  };
}
function btnSm(color, bg) {
  return {
    flex: 1,
    padding: "5px 8px",
    fontSize: 10,
    fontWeight: 600,
    color,
    background: bg,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background 0.15s",
  };
}

// ─── FIELD WRAPPER ────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 9,
          fontWeight: 600,
          color: "hsl(var(--muted-foreground))",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
function XIcon({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 14 14"
    >
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  );
}
function ChevronRightIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
function PlusIcon({ size = 11 }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 12 12"
    >
      <path d="M6 1v10M1 6h10" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
function UserPlusIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="var(--brand-primary)"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
      />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      width="12"
      height="12"
      fill="none"
      stroke="hsl(var(--muted-foreground))"
      strokeWidth="2"
      viewBox="0 0 24 24"
      style={{ flexShrink: 0 }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
      />
    </svg>
  );
}
function LinkIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}
