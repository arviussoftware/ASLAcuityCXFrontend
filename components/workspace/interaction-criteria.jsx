// components/workspace/interaction-criteria.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Monitor } from "lucide-react";
import { Field, SelectControl, TextControl } from "./rule-ui";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

// ─── Auth ─────────────────────────────────────────────────────────────────────
import CryptoJS from "crypto-js";

const getUserId = () => {
  try {
    const enc = typeof window !== "undefined" ? sessionStorage.getItem("user") : null;
    if (!enc) return "1";
    const bytes = CryptoJS.AES.decrypt(enc, "");
    const userString = bytes.toString(CryptoJS.enc.Utf8);
    if (!userString) return "1";
    const user = JSON.parse(userString);
    return String(user?.userId ?? user?.UserId ?? user?.id ?? "1");
  } catch (err) {
    console.warn("Auth decryption failed in InteractionCriteriaFields:", err.message);
    return "1";
  }
};

const makeHeaders = () => {
  const orgIds = getSelectedOrgIdsHeader();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
    loggedInUserId: getUserId(),
    ...(orgIds ? { orgIds } : {}),
  };
};

// Generic fetch hook
function useFetch(url, transform) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const transformRef = useRef(transform);
  transformRef.current = transform;

  useEffect(() => {
    if (!url) { setData([]); setLoading(false); setError(null); return; }
    const ctrl = new AbortController();
    setLoading(true); setError(null);
    (async () => {
      try {
        const res = await fetch(url, { headers: makeHeaders(), signal: ctrl.signal });
        const json = await res.json();
        if (!res.ok || json?.success === false)
          throw new Error(json?.message || `Request failed: ${url}`);
        setData(transformRef.current(json));
      } catch (err) {
        if (err.name !== "AbortError") setError(String(err.message ?? err));
      } finally { setLoading(false); }
    })();
    return () => ctrl.abort();
  }, [url]);

  return { data, loading, error };
}

// ─── Org-tree helpers ─────────────────────────────────────────────────────────
function filterTree(list, q) {
  if (!q) return list;
  return list.reduce((acc, node) => {
    const kids = filterTree(node.children || [], q);
    if (String(node.label || "").toLowerCase().includes(q.toLowerCase()) || kids.length)
      acc.push({ ...node, children: kids });
    return acc;
  }, []);
}

// collect all descendant ids (including self)
function collectIds(node) {
  const ids = [String(node.id)];
  (node.children || []).forEach(c => ids.push(...collectIds(c)));
  return ids;
}

// OrgTreeNode — multi-select with checkboxes
function OrgTreeNode({ node, selectedIds, onToggle, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const hasKids = !!node.children?.length;
  const nodeId = String(node.id);
  const isChecked = selectedIds.has(nodeId);

  const childIds = useMemo(() => collectIds(node).slice(1), [node]);
  const checkedCount = childIds.filter(id => selectedIds.has(id)).length;
  const isIndeterminate = hasKids && !isChecked && checkedCount > 0;

  const checkboxRef = useRef(null);
  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

  const handleChevron = (e) => { e.stopPropagation(); if (hasKids) setOpen(o => !o); };

  const handleCheck = (e) => {
    e.stopPropagation();
    if (node.isDisabled) return;
    onToggle([nodeId], !isChecked);
  };

  return (
    <div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: `5px 8px 5px ${8 + depth * 18}px`,
          borderRadius: "7px",
          cursor: node.isDisabled ? "not-allowed" : "pointer",
          opacity: node.isDisabled ? 0.4 : 1,
          background: isChecked
            ? "color-mix(in srgb, var(--brand-primary) 8%, transparent)"
            : "transparent",
          transition: "background 0.12s",
          userSelect: "none",
        }}
        onClick={handleCheck}
      >
        <button
          type="button"
          onClick={handleChevron}
          style={{
            width: "14px", height: "14px", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", padding: 0,
            cursor: hasKids ? "pointer" : "default",
            color: "var(--brand-primary)",
          }}
        >
          {hasKids ? (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d={open ? "M2 4l3 3 3-3" : "M4 2l3 3-3 3"}
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="5" height="5" viewBox="0 0 6 6">
              <circle cx="3" cy="3" r="2.2" fill="color-mix(in srgb, var(--brand-primary) 35%, transparent)" />
            </svg>
          )}
        </button>

        <input
          ref={checkboxRef}
          type="checkbox"
          checked={isChecked}
          onChange={handleCheck}
          onClick={e => e.stopPropagation()}
          style={{
            width: "14px", height: "14px", flexShrink: 0,
            accentColor: "var(--brand-primary)", cursor: "pointer",
          }}
        />

        <span style={{
          width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isChecked
            ? "color-mix(in srgb, var(--brand-primary) 20%, transparent)"
            : "color-mix(in srgb, var(--brand-primary) 8%, transparent)",
        }}>
          {depth === 0 ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="var(--brand-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          ) : (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke="var(--brand-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          )}
        </span>

        <span style={{
          flex: 1, fontSize: "12px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontWeight: isChecked ? 600 : 400,
          color: isChecked ? "var(--brand-primary)" : "hsl(var(--foreground))",
        }}>
          {node.label}
        </span>
      </div>

      {hasKids && open && (
        <div style={{
          borderLeft: "1.5px solid color-mix(in srgb, var(--brand-primary) 14%, transparent)",
          marginLeft: `${8 + depth * 18 + 7}px`, paddingLeft: "4px",
        }}>
          {node.children.map(child => (
            <OrgTreeNode
              key={child.id}
              node={child}
              selectedIds={selectedIds}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── OrgMultiPicker ───────────────────────────────────────────────────────────
function OrgMultiPicker({ nodes, selectedIds, onToggle, onClearAll, loading, error, fallbackLabels = {} }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onMouse = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [open]);

  const filtered = useMemo(() => filterTree(nodes, search), [nodes, search]);
  const selectedCount = selectedIds.size;

  const labelMap = useMemo(() => {
    const map = {};
    const walk = (list) => list.forEach(n => { map[String(n.id)] = n.label; walk(n.children || []); });
    walk(nodes);
    return map;
  }, [nodes]);

  const triggerStyle = {
    width: "100%", minHeight: "36px", display: "flex", alignItems: "center",
    flexWrap: "wrap", gap: "5px", padding: "4px 10px",
    border: `1px solid ${open ? "var(--brand-primary)" : "var(--brand-input-border)"}`,
    borderRadius: "8px",
    background: open
      ? "color-mix(in srgb, var(--brand-primary) 4%, hsl(var(--background)))"
      : "hsl(var(--background))",
    cursor: "pointer", transition: "border 0.15s, background 0.15s",
    boxShadow: open ? "0 0 0 3px color-mix(in srgb, var(--brand-primary) 12%, transparent)" : "none",
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={triggerStyle} onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>

        {selectedCount === 0 ? (
          <span style={{ flex: 1, fontSize: "13px", color: "var(--brand-placeholder)", fontWeight: 400 }}>
            {loading ? "Loading organizations…" : "All Organizations (Global)"}
          </span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", flex: 1 }}>
            {[...selectedIds].slice(0, 3).map(id => (
              <span key={id} style={{
                fontSize: "11px", fontWeight: 600,
                color: "var(--brand-primary)",
                background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                borderRadius: "20px", padding: "1px 8px",
              }}>
                {labelMap[id] ?? fallbackLabels[id] ?? id}
              </span>
            ))}
            {selectedCount > 3 && (
              <span style={{
                fontSize: "11px", fontWeight: 600,
                color: "var(--brand-primary)",
                background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                borderRadius: "20px", padding: "1px 8px",
              }}>
                +{selectedCount - 3} more
              </span>
            )}
          </div>
        )}

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClearAll(); }}
            aria-label="Clear all org selections"
            style={{
              width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "color-mix(in srgb, var(--brand-error-text, #e53e3e) 12%, transparent)",
              color: "var(--brand-error-text, #e53e3e)",
              cursor: "pointer", fontSize: "10px", fontWeight: 700, border: "none", padding: 0,
            }}
          >✕</button>
        )}

        <svg width="11" height="11" viewBox="0 0 10 10" fill="none"
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M2 3.5l3 3 3-3" stroke="var(--brand-placeholder)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          border: "1px solid var(--brand-input-border)", borderRadius: "10px", overflow: "hidden",
          background: "hsl(var(--background))",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "7px", padding: "8px 10px",
            borderBottom: "1px solid var(--brand-input-border)",
            background: "color-mix(in srgb, var(--brand-input-bg) 50%, transparent)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--brand-placeholder)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search organizations…"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "12px", color: "hsl(var(--foreground))" }}
            />
            {selectedCount > 0 && (
              <span style={{
                fontSize: "10px", fontWeight: 700, padding: "1px 7px", borderRadius: "20px",
                background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                color: "var(--brand-primary)", flexShrink: 0,
              }}>
                {selectedCount} selected
              </span>
            )}
            {search && (
              <button type="button" onClick={() => setSearch("")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", color: "var(--brand-placeholder)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div role="listbox" aria-multiselectable="true" style={{ maxHeight: "260px", overflowY: "auto", padding: "6px" }}>
            {loading ? (
              <div style={{ padding: "18px", textAlign: "center", fontSize: "12px", color: "var(--brand-placeholder)" }}>Loading organizations…</div>
            ) : error ? (
              <div style={{ padding: "12px", fontSize: "11px", color: "var(--brand-error-text)" }}>{error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "18px", textAlign: "center", fontSize: "12px", color: "var(--brand-placeholder)" }}>
                {search ? "No matching organizations." : "No organizations available."}
              </div>
            ) : (
              filtered.map(node => (
                <OrgTreeNode
                  key={node.id}
                  node={node}
                  selectedIds={selectedIds}
                  onToggle={onToggle}
                  depth={0}
                />
              ))
            )}
          </div>

          {selectedCount > 0 && (
            <div style={{
              display: "flex", justifyContent: "flex-end", padding: "6px 10px",
              borderTop: "1px solid var(--brand-input-border)",
              background: "color-mix(in srgb, var(--brand-input-bg) 50%, transparent)",
            }}>
              <button
                type="button"
                onClick={() => { onClearAll(); setOpen(false); }}
                style={{
                  fontSize: "11px", fontWeight: 600,
                  color: "var(--brand-error-text, #e53e3e)",
                  background: "none", border: "none", cursor: "pointer", padding: "2px 8px",
                }}
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  fontSize: "11px", fontWeight: 600,
                  color: "var(--brand-primary)",
                  background: "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                  borderRadius: "6px", cursor: "pointer", padding: "2px 12px", marginLeft: "6px",
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AgentMultiPicker — searchable dropdown with checkboxes ───────────────────
function AgentMultiPicker({ agents, selectedIds, onToggle, onClearAll, loading, fallbackLabels = {} }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onMouse = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [open]);

  const uniqueAgents = useMemo(() => {
    const seen = new Set();
    return agents.filter(a => {
      const key = String(a.agentId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [agents]);

  const filtered = useMemo(() =>
    search
      ? uniqueAgents.filter(a => a.agentName.toLowerCase().includes(search.toLowerCase()))
      : uniqueAgents,
    [uniqueAgents, search]);

  const selectedCount = selectedIds.size;

  const labelMap = useMemo(() => {
    const map = {};
    uniqueAgents.forEach(a => { map[String(a.agentId)] = a.agentName; });
    return map;
  }, [uniqueAgents]);

  const triggerStyle = {
    width: "100%", minHeight: "36px", display: "flex", alignItems: "center",
    flexWrap: "wrap", gap: "5px", padding: "4px 10px",
    border: `1px solid ${open ? "var(--brand-primary)" : "var(--brand-input-border)"}`,
    borderRadius: "8px",
    background: open
      ? "color-mix(in srgb, var(--brand-primary) 4%, hsl(var(--background)))"
      : "hsl(var(--background))",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "border 0.15s, background 0.15s",
    boxShadow: open ? "0 0 0 3px color-mix(in srgb, var(--brand-primary) 12%, transparent)" : "none",
    opacity: loading ? 0.6 : 1,
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={triggerStyle} onClick={() => { if (!loading) setOpen(o => !o); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>

        {selectedCount === 0 ? (
          <span style={{ flex: 1, fontSize: "13px", color: "var(--brand-placeholder)", fontWeight: 400 }}>
            {loading
              ? "Loading agents…"
              : uniqueAgents.length
                ? "— Select Agent(s) (optional) —"
                : "No agents available"}
          </span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", flex: 1 }}>
            {[...selectedIds].slice(0, 3).map(id => (
              <span key={id} style={{
                fontSize: "11px", fontWeight: 600,
                color: "var(--brand-primary)",
                background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                borderRadius: "20px", padding: "1px 8px",
              }}>
                {labelMap[id] ?? fallbackLabels[id] ?? id}
              </span>
            ))}
            {selectedCount > 3 && (
              <span style={{
                fontSize: "11px", fontWeight: 600,
                color: "var(--brand-primary)",
                background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                borderRadius: "20px", padding: "1px 8px",
              }}>+{selectedCount - 3} more</span>
            )}
          </div>
        )}

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClearAll(); }}
            aria-label="Clear all agent selections"
            style={{
              width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "color-mix(in srgb, var(--brand-error-text, #e53e3e) 12%, transparent)",
              color: "var(--brand-error-text, #e53e3e)",
              cursor: "pointer", fontSize: "10px", fontWeight: 700, border: "none", padding: 0,
            }}
          >✕</button>
        )}

        <svg width="11" height="11" viewBox="0 0 10 10" fill="none"
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M2 3.5l3 3 3-3" stroke="var(--brand-placeholder)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          border: "1px solid var(--brand-input-border)", borderRadius: "10px", overflow: "hidden",
          background: "hsl(var(--background))",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "7px", padding: "8px 10px",
            borderBottom: "1px solid var(--brand-input-border)",
            background: "color-mix(in srgb, var(--brand-input-bg) 50%, transparent)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--brand-placeholder)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents…"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "12px", color: "hsl(var(--foreground))" }}
            />
            {uniqueAgents.length > 0 && (
              <button
                type="button"
                onClick={() => onToggle(uniqueAgents.map(a => String(a.agentId)), true)}
                style={{
                  fontSize: "10px", fontWeight: 800, letterSpacing: "0.02em",
                  padding: "4px 10px", borderRadius: "999px",
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 18%, transparent), color-mix(in srgb, var(--brand-primary) 8%, transparent))",
                  border: "1px solid color-mix(in srgb, var(--brand-primary) 35%, transparent)",
                  color: "var(--brand-primary)", cursor: "pointer", flexShrink: 0,
                }}
                title="Select all agents"
              >
                Select All
              </button>
            )}
            {selectedCount > 0 && (
              <span style={{
                fontSize: "10px", fontWeight: 700, padding: "1px 7px", borderRadius: "20px",
                background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                color: "var(--brand-primary)", flexShrink: 0,
              }}>
                {selectedCount} selected
              </span>
            )}
            {search && (
              <button type="button" onClick={() => setSearch("")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", color: "var(--brand-placeholder)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div role="listbox" aria-multiselectable="true" style={{ maxHeight: "240px", overflowY: "auto", padding: "6px" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "18px", textAlign: "center", fontSize: "12px", color: "var(--brand-placeholder)" }}>
                {search ? "No matching agents." : "No agents available."}
              </div>
            ) : (
              filtered.map(a => {
                const id = String(a.agentId);
                const isChecked = selectedIds.has(id);
                return (
                  <div
                    key={id}
                    role="option"
                    aria-selected={isChecked}
                    onClick={() => onToggle([id], !isChecked)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "6px 8px", borderRadius: "7px", cursor: "pointer",
                      background: isChecked
                        ? "color-mix(in srgb, var(--brand-primary) 8%, transparent)"
                        : "transparent",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = "color-mix(in srgb, var(--brand-primary) 4%, transparent)"; }}
                    onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = "transparent"; }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle([id], !isChecked)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: "14px", height: "14px", accentColor: "var(--brand-primary)", cursor: "pointer", flexShrink: 0 }}
                    />
                    <span style={{
                      width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isChecked
                        ? "color-mix(in srgb, var(--brand-primary) 20%, transparent)"
                        : "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
                      fontSize: "9px", fontWeight: 700, color: "var(--brand-primary)",
                    }}>
                      {(a.agentName || "?")[0].toUpperCase()}
                    </span>
                    <span style={{
                      flex: 1, fontSize: "12px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      fontWeight: isChecked ? 600 : 400,
                      color: isChecked ? "var(--brand-primary)" : "hsl(var(--foreground))",
                    }}>
                      {a.agentName}
                    </span>
                    {isChecked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="var(--brand-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {selectedCount > 0 && (
            <div style={{
              display: "flex", justifyContent: "flex-end", padding: "6px 10px",
              borderTop: "1px solid var(--brand-input-border)",
              background: "color-mix(in srgb, var(--brand-input-bg) 50%, transparent)",
            }}>
              <button type="button" onClick={() => { onClearAll(); setOpen(false); }}
                style={{ fontSize: "11px", fontWeight: 600, color: "var(--brand-error-text, #e53e3e)", background: "none", border: "none", cursor: "pointer", padding: "2px 8px" }}>
                Clear all
              </button>
              <button type="button" onClick={() => setOpen(false)}
                style={{
                  fontSize: "11px", fontWeight: 600, color: "var(--brand-primary)",
                  background: "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                  borderRadius: "6px", cursor: "pointer", padding: "2px 12px", marginLeft: "6px",
                }}>
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function InteractionCriteriaFields({ form, setForm, update, setStatus }) {
  const getInstanceId = useCallback((inst) => {
    const id =
      inst?.appid ?? inst?.AppId ?? inst?.AppID ?? inst?.appId ??
      inst?.applicationId ?? inst?.ApplicationId ?? inst?.id ?? inst?.Id;
    return id == null ? "" : String(id);
  }, []);

  const getInstancePlatformId = useCallback((inst) => {
    const id = inst?.PlatformId ?? inst?.platformId ?? inst?.platformID ?? inst?.PlatformID;
    return id == null ? "" : String(id);
  }, []);

  const getInstanceKey = useCallback((inst) => {
    const appId = getInstanceId(inst);
    const platformId = getInstancePlatformId(inst);
    if (!appId && !platformId) return "";
    return `${platformId || "0"}|${appId || "0"}`;
  }, [getInstanceId, getInstancePlatformId]);

  // ── data fetches ──────────────────────────────────────────────────────────────
  const { data: instances, loading: instancesLoading } = useFetch(
    "/api/instanceNameDDL",
    json => Array.isArray(json.data) ? json.data : [],
  );

  // ── FIX: platformId bhi pass ho raha hai ab SP ke liye ──────────────────────
  const { data: orgTree, loading: orgLoading, error: orgError } = useFetch(
    form.instanceId && form.platformId
      ? `/api/workFlow/organizationDDLByInstance?instanceId=${encodeURIComponent(
          form.instanceId
        )}&platformId=${encodeURIComponent(form.platformId)}`
      : null,
    json => Array.isArray(json.organizationList) ? json.organizationList : [],
  );

  const agentUrl = useMemo(() => {
    if (!form.organizationIds?.length) return null;
    const params = new URLSearchParams();
    form.organizationIds.forEach(id => params.append("orgId", id));
    return `/api/workFlow/agentsByOrganization?${params.toString()}`;
  }, [form.organizationIds]);

  const { data: customFields, loading: fieldsLoading } = useFetch(
    "/api/workFlow/coustomMetadataField",
    json => Array.isArray(json.data) ? json.data : [],
  );

  const { data: rawAgents, loading: agentsLoading } = useFetch(
    agentUrl,
    json => Array.isArray(json.agents) ? json.agents : [],
  );

  const selectedOrgIds = useMemo(
    () => new Set((form.organizationIds || []).map(String)),
    [form.organizationIds],
  );

  const selectedAgentIds = useMemo(
    () => new Set((form.agentIds || []).map(String)),
    [form.agentIds],
  );

  // ── Fallback labels from initial mappings (shown while tree/agents load) ─────
  const fallbackOrgLabels = useMemo(() => {
    const map = {};
    (form.orgAgentMappings || []).forEach(m => {
      if (m.orgId && m.orgName) map[String(m.orgId)] = m.orgName;
    });
    return map;
  }, [form.orgAgentMappings]);

  const fallbackAgentLabels = useMemo(() => {
    const map = {};
    (form.orgAgentMappings || []).forEach(m => {
      if (m.agentId && m.agentName) map[String(m.agentId)] = m.agentName;
    });
    return map;
  }, [form.orgAgentMappings]);

  const agents = useMemo(() => {
    if (!selectedOrgIds.size) return [];
    return rawAgents.filter(agent => {
      const agentOrgId = String(agent.orgId ?? agent.OrganizationId ?? agent.OrgId ?? "");
      if (!agentOrgId) return true;
      return selectedOrgIds.has(agentOrgId);
    });
  }, [rawAgents, selectedOrgIds]);

  const agentOrgPairs = useMemo(() => {
    const pairs = new Map();
    agents.forEach((a) => {
      const orgId = Number(a.orgId ?? a.OrganizationId ?? a.OrgId ?? 0);
      const agentId = Number(a.agentId ?? a.AgentId ?? a.userId ?? 0);
      if (!orgId || !agentId) return;
      const key = `${orgId}|${agentId}`;
      if (!pairs.has(key)) pairs.set(key, { orgId, agentId });
    });
    return pairs;
  }, [agents]);

  // ── org toggle ────────────────────────────────────────────────────────────────
  const onOrgToggle = useCallback((ids, shouldAdd) => {
    setForm(p => {
      const current = new Set((p.organizationIds || []).map(String));
      if (shouldAdd) ids.forEach(id => current.add(String(id)));
      else ids.forEach(id => current.delete(String(id)));
      return {
        ...p,
        organizationIds: [...current].map(Number),
        agentIds: [],
        orgAgentMappings: [],
      };
    });
  }, [setForm]);

  const onOrgClearAll = useCallback(() => {
    setForm(p => ({ ...p, organizationIds: [], agentIds: [], orgAgentMappings: [] }));
  }, [setForm]);

  // ── agent toggle ──────────────────────────────────────────────────────────────
  const onAgentToggle = useCallback((ids, shouldAdd) => {
    setForm(p => {
      const current = new Set((p.agentIds || []).map(String));
      if (shouldAdd) ids.forEach(id => current.add(String(id)));
      else ids.forEach(id => current.delete(String(id)));

      const nextAgentIds = [...current].map(Number);
      const nextOrgIds = (p.organizationIds || []).map(String);

      let orgAgentMappings = [];
      if (!nextAgentIds.length) {
        orgAgentMappings = nextOrgIds.map((orgId) => ({ orgId: Number(orgId), agentId: null }));
      } else {
        nextOrgIds.forEach((orgId) => {
          nextAgentIds.forEach((agentId) => {
            const key = `${orgId}|${agentId}`;
            const pair = agentOrgPairs.get(key);
            if (pair) orgAgentMappings.push(pair);
          });
        });
      }

      return { ...p, agentIds: nextAgentIds, orgAgentMappings };
    });
  }, [setForm, agentOrgPairs]);

  const onAgentClearAll = useCallback(() => {
    setForm(p => ({
      ...p,
      agentIds: [],
      orgAgentMappings: (p.organizationIds || []).map((orgId) => ({ orgId: Number(orgId), agentId: null })),
    }));
  }, [setForm]);

  // ── instance change ───────────────────────────────────────────────────────────
  const onInstanceChange = useCallback((e) => {
    const instanceKey = String(e.target.value ?? "");
    const inst = instances.find(i => getInstanceKey(i) === instanceKey);
    const id = inst ? getInstanceId(inst) : "";
    setForm(p => ({
      ...p,
      instanceKey,
      instanceId: id,
      instanceName: inst ? (inst.instanceName ?? inst.InstanceName ?? String(id)) : "",
      platformId: inst ? getInstancePlatformId(inst) : "",
      // Reset downstream selections when instance changes
      organizationIds: [],
      agentIds: [],
      orgAgentMappings: [],
    }));
    setStatus?.({ type: "idle", message: "" });
  }, [instances, setForm, setStatus, getInstanceId, getInstancePlatformId, getInstanceKey]);

  // ── other handlers ────────────────────────────────────────────────────────────
  const onExtTypeChange = useCallback(e => setForm(p => ({ ...p, extType: e.target.value, extInput: "", extStart: "", extEnd: "" })), [setForm]);
  const onDurationOpChange = useCallback(e => setForm(p => ({ ...p, durationOp: e.target.value, durationValueMax: "" })), [setForm]);
  const onCustomFieldChange = useCallback(e => setForm(p => ({ ...p, customField: e.target.value, customValue: "" })), [setForm]);

  const showExtRange = form.extType === "range";
  const showDurationMax = form.durationOp === "bw";
  const showCustomValue = form.customField !== "none";
  const showAgentField = selectedOrgIds.size > 0;

  const extensionHint = useMemo(() => ({
    range: "Define a numerical range of extensions.",
    multiple: "Enter extensions separated by commas.",
  })[form.extType] ?? "Enter a single extension.", [form.extType]);

  const agentHint = agentsLoading
    ? "Loading agents…"
    : agents.length > 0
      ? `${agents.length} agent(s) across selected organizations`
      : "No agents found in selected organizations";

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-4 md:grid-cols-2">

      {/* Instance */}
      <div className="md:col-span-2">
        <Field
          label="Instance Name"
          required
          hint={instancesLoading ? "Loading instances…" : `${instances.length} instance(s) available`}
        >
          <SelectControl
            value={
              String(
                form.instanceKey ??
                (form.platformId != null && form.instanceId != null
                  ? `${String(form.platformId)}|${String(form.instanceId)}`
                  : ""),
              )
            }
            onChange={onInstanceChange}
            disabled={instancesLoading || !instances.length}
            icon={<Monitor size={15} />}
          >
            <option value="">{instancesLoading ? "Loading…" : "— Select Instance —"}</option>
            {instances.map(inst => {
              const key = getInstanceKey(inst);
              const id = getInstanceId(inst);
              if (!key || !id) return null;
              const name = inst.instanceName ?? inst.InstanceName ?? String(id);
              return <option key={key} value={key}>{name}</option>;
            })}
          </SelectControl>
        </Field>
      </div>

      <div className="md:col-span-2"><div className="h-px bg-[var(--brand-input-border)]" /></div>

      {/* ANI */}
      <Field label="ANI (Caller Number)" hint="e.g. 555*">
        <TextControl value={form.ani} onChange={update("ani")} placeholder="555*" />
      </Field>

      {/* DNIS */}
      <Field label="DNIS (Dialed Number)" hint="e.g. 8001234567">
        <TextControl value={form.dnis} onChange={update("dnis")} placeholder="8001234567" />
      </Field>

      {/* Extensions */}
      <div className="md:col-span-2">
        <Field label="Extension(s)" hint={extensionHint}>
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "10px" }}>
            <SelectControl value={form.extType} onChange={onExtTypeChange}>
              <option value="">— Select Extension Type —</option>
              <option value="single">Single</option>
              <option value="multiple">Multiple (comma-sep)</option>
              <option value="range">Range</option>
            </SelectControl>
            {showExtRange ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <TextControl type="number" value={form.extStart} onChange={update("extStart")} placeholder="Start" />
                <TextControl type="number" value={form.extEnd} onChange={update("extEnd")} placeholder="End" />
              </div>
            ) : (
              <TextControl value={form.extInput} onChange={update("extInput")} placeholder="e.g. 1001" />
            )}
          </div>
        </Field>
      </div>

      {/* Call Duration */}
      <div className="md:col-span-2">
        <Field label="Call Duration (seconds)" hint={showDurationMax ? "Set a min–max range." : "Filter calls by duration."}>
          <div style={{
            display: "grid",
            gridTemplateColumns: showDurationMax ? "200px 1fr 1fr" : "200px 1fr",
            gap: "10px",
          }}>
            <SelectControl value={form.durationOp} onChange={onDurationOpChange}>
              <option value="">— Select Duration Filter —</option>
              <option value="gt">Greater Than</option>
              <option value="lt">Less Than</option>
              <option value="eq">Equal To</option>
              <option value="bw">In Between</option>
            </SelectControl>
            <TextControl type="number" value={form.durationValue} onChange={update("durationValue")} placeholder="Seconds" />
            {showDurationMax && (
              <TextControl type="number" value={form.durationValueMax} onChange={update("durationValueMax")} placeholder="Max Seconds" />
            )}
          </div>
        </Field>
      </div>

      {/* Organization multi-select */}
      <div className="md:col-span-2">
        <Field
          label="Organization Scope"
          hint={selectedOrgIds.size > 0 ? `${selectedOrgIds.size} organization(s) selected` : "Leave blank to apply globally."}
        >
          <OrgMultiPicker
            nodes={orgTree}
            selectedIds={selectedOrgIds}
            onToggle={onOrgToggle}
            onClearAll={onOrgClearAll}
            loading={orgLoading}
            error={orgError}
            fallbackLabels={fallbackOrgLabels}
          />
        </Field>
      </div>

      {/* Agent multi-select — only when orgs selected */}
      {showAgentField && (
        <div className="md:col-span-2">
          <Field label="Agent(s)" hint={agentHint}>
            <AgentMultiPicker
              agents={agents}
              selectedIds={selectedAgentIds}
              onToggle={onAgentToggle}
              onClearAll={onAgentClearAll}
              loading={agentsLoading}
              fallbackLabels={fallbackAgentLabels}
            />
          </Field>
        </div>
      )}

      {/* Custom Metadata */}
      <Field label="Custom Metadata Field" hint="Optional — filter by custom metadata.">
        <SelectControl
          value={form.customField}
          onChange={onCustomFieldChange}
          disabled={fieldsLoading}
        >
          <option value="none">
            {fieldsLoading ? "Loading fields…" : "— Select Custom Field —"}
          </option>
          {customFields.map(f => (
            <option key={f.Id} value={f.Metadatacolumn}>{f.DisplayName}</option>
          ))}
        </SelectControl>
      </Field>

      {showCustomValue && (
        <Field
          label="Match Value"
          hint="You can provide multiple values separated by commas (e.g. value1,value2,value3)."
        >
          <TextControl
            value={form.customValue}
            onChange={update("customValue")}
            placeholder="e.g. value1,value2,value3"
          />
        </Field>
      )}
    </div>
  );
}