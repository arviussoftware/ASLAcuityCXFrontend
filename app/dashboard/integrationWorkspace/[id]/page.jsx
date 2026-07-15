"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ── Helpers ── */
const fmt = (val) => {
  const s = String(val ?? "");
  return !s || s === "NULL" ? "—" : s;
};

const formatDateTime = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return fmt(val);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const DATE_KEYS = ["dtLastFetchDateTime", "dtCreatedDate", "dtModifiedDate", "lastFetchDateTime", "date", "time"];
const CONN_KEY = "Connection_Name";
const ACTION_KEY = "appid";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const toLabel = (key) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^dt\s?/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

const buildColumns = (row) =>
  Object.keys(row).map((key) => ({
    key,
    label: toLabel(key),
    isDate: DATE_KEYS.some((dk) => key.toLowerCase().includes(dk.toLowerCase())),
    isConn: key === CONN_KEY,
    isAction: key === ACTION_KEY,
  }));

const SortIcon = ({ colKey, sortKey, sortDir }) => {
  if (sortKey !== colKey)
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.3 }}>
        <path d="M3 3.5L5 1.5L7 3.5M3 6.5L5 8.5L7 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return sortDir === "asc" ? (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: "#1a6bb5" }}>
      <path d="M3 6.5L5 4.5L7 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: "#1a6bb5" }}>
      <path d="M3 3.5L5 5.5L7 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function IntegrationConfigurationPage({ params }) {
  const { id } = params;

  const platformId = id;
  const router = useRouter();
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/workspace/configuration");
      const json = await res.json();
      if (res.ok) {
        const rows = json.rows || [];
        setData(rows);
        if (rows.length > 0) setColumns(buildColumns(rows[0]));
      } else {
        setError(json.message || "Failed to load data.");
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setPage(1); }, [search, sortKey, sortDir, pageSize]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  /* Columns to display — excludes appid (used only for routing) */
  const displayCols = columns.filter((c) => !c.isAction);

  const filtered = data
    .filter((row) =>
      displayCols.some((col) =>
        String(row[col.key] ?? "").toLowerCase().includes(search.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (!sortKey) return 0;
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const renderCell = (col, row) => {
    if (col.isDate) return formatDateTime(row[col.key]);
    return fmt(row[col.key]);
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (safePage >= totalPages - 3) return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", safePage - 1, safePage, safePage + 1, "…", totalPages];
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .ig-page {
          padding: 28px 32px; min-height: 100vh;
          background: #f0f4f8;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .ig-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
        }
        .ig-title    { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
        .ig-subtitle { font-size: 13px; color: #64748b; margin: 3px 0 0; }

        .ig-back-btn {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 10px;
          background: #fff; border: 1px solid #e2e8f0; cursor: pointer;
          box-shadow: 0 1px 3px rgba(15,23,42,0.07);
          transition: background 0.15s, border-color 0.15s; flex-shrink: 0;
        }
        .ig-back-btn:hover { background: #f0f7ff; border-color: #bfdbfe; }

        .ig-add-btn {
          display: flex; align-items: center; gap: 8px;
          background: #1a6bb5; color: #fff; border: none;
          border-radius: 10px; padding: 10px 20px;
          font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
          transition: background 0.18s, transform 0.12s;
          box-shadow: 0 2px 8px rgba(26,107,181,0.22);
        }
        .ig-add-btn:hover  { background: #155fa0; transform: translateY(-1px); }
        .ig-add-btn:active { transform: translateY(0); }

        .ig-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
        }
        .ig-search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 10px; padding: 8px 14px; width: 280px;
          box-shadow: 0 1px 3px rgba(15,23,42,0.05);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ig-search-wrap:focus-within {
          border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(147,197,253,0.25);
        }
        .ig-search-input {
          border: none; outline: none; background: transparent;
          font-size: 13px; color: #334155; font-family: inherit; width: 100%;
        }
        .ig-search-input::placeholder { color: #94a3b8; }
        .ig-count-badge {
          background: #eff6ff; color: #1a6bb5; border: 1px solid #dbeafe;
          border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600;
        }

        .ig-table-wrap {
          background: #fff; border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 6px rgba(15,23,42,0.06); overflow: hidden;
        }
        .ig-table-scroll { overflow-x: auto; }
        table.ig-table   { width: 100%; border-collapse: collapse; font-size: 13px; }

        .ig-table thead tr { background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; }
        .ig-table th {
          padding: 13px 16px; text-align: left; font-size: 11.5px; font-weight: 600;
          color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;
          white-space: nowrap; user-select: none;
        }
        .ig-table th.sortable { cursor: pointer; transition: color 0.15s; }
        .ig-table th.sortable:hover { color: #1a6bb5; }
        .th-inner { display: inline-flex; align-items: center; gap: 5px; }
        .ig-table th.col-actions { text-align: center; width: 100px; }

        .ig-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.12s; }
        .ig-table tbody tr:last-child { border-bottom: none; }
        .ig-table tbody tr:hover { background: #f8faff; }

        .ig-table td {
          padding: 13px 16px; color: #334155; white-space: nowrap;
          max-width: 220px; overflow: hidden; text-overflow: ellipsis; vertical-align: middle;
        }
        .ig-table td.empty-val   { color: #cbd5e1; }
        .ig-table td.col-actions { text-align: center; }

        .ig-edit-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: #eff6ff; color: #1a6bb5;
          border: 1px solid #dbeafe; border-radius: 8px;
          padding: 6px 14px; font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: background 0.15s, border-color 0.15s, transform 0.12s, box-shadow 0.15s;
        }
        .ig-edit-btn:hover {
          background: #1a6bb5; color: #fff; border-color: #1a6bb5;
          transform: translateY(-1px); box-shadow: 0 3px 8px rgba(26,107,181,0.25);
        }
        .ig-edit-btn:active { transform: translateY(0); }

        .ig-conn-cell { display: flex; align-items: center; gap: 10px; }
        .ig-conn-dot  {
          width: 8px; height: 8px; border-radius: 50%;
          background: #1a6bb5; flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(26,107,181,0.15);
        }

        .ig-state-row td {
          text-align: center; padding: 52px 20px;
          color: #94a3b8; font-size: 14px; border-bottom: none !important;
        }
        .ig-state-row:hover td { background: transparent !important; }

        .ig-skel-line {
          height: 12px; border-radius: 6px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf2 50%, #f1f5f9 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0%   { background-position:  200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Pagination ── */
        .ig-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-top: 1px solid #f1f5f9;
          flex-wrap: wrap; gap: 12px;
        }
        .ig-page-info { font-size: 12px; color: #64748b; }
        .ig-page-info strong { color: #334155; }

        .ig-page-controls { display: flex; align-items: center; gap: 4px; }

        .ig-page-btn {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 32px; height: 32px; padding: 0 6px;
          border-radius: 8px; border: 1px solid #e2e8f0;
          background: #fff; color: #475569; font-size: 12px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .ig-page-btn:hover:not(:disabled):not(.active) {
          background: #f0f7ff; border-color: #bfdbfe; color: #1a6bb5;
        }
        .ig-page-btn.active {
          background: #1a6bb5; color: #fff; border-color: #1a6bb5; font-weight: 600;
        }
        .ig-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .ig-page-ellipsis {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 32px; height: 32px; color: #94a3b8; font-size: 13px;
        }

        .ig-pagesize-wrap {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #64748b;
        }
        .ig-pagesize-select {
          border: 1px solid #e2e8f0; border-radius: 8px;
          background: #fff; color: #334155; font-size: 12px; font-family: inherit;
          padding: 5px 10px; cursor: pointer; outline: none;
          transition: border-color 0.13s;
        }
        .ig-pagesize-select:focus { border-color: #93c5fd; }
      `}</style>

      <div className="ig-page">

        {/* Header */}
        <div className="ig-header">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button className="ig-back-btn" onClick={() => router.back()} title="Go back">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="#1a6bb5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div>
              <p className="ig-title">Integration Workspace</p>
              <p className="ig-subtitle">
                {!loading && !error
                  ? `${filtered.length} of ${data.length} configuration${data.length !== 1 ? "s" : ""}`
                  : "Manage your app configurations"}
              </p>
            </div>
          </div>
          <button
            className="ig-add-btn"
            onClick={() =>
              router.push(`/dashboard/integrationWorkspace/Addworkspace?platformId=${platformId}`)
            }
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add Configuration
          </button>
        </div>

        {/* Toolbar */}
        <div className="ig-toolbar">
          <div className="ig-search-wrap">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: "#94a3b8" }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              className="ig-search-input"
              placeholder="Search configurations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#94a3b8", display: "flex" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          {!loading && !error && (
            <span className="ig-count-badge">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Table */}
        <div className="ig-table-wrap">
          <div className="ig-table-scroll">
            <table className="ig-table">
              <thead>
                <tr>
                  {columns.length > 0
                    ? displayCols.map((col) => (
                      <th key={col.key} className="sortable" onClick={() => handleSort(col.key)}>
                        <span className="th-inner">
                          {col.label}
                          <SortIcon colKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                        </span>
                      </th>
                    ))
                    : Array.from({ length: 4 }).map((_, i) => (
                      <th key={i}><div className="ig-skel-line" style={{ width: "80px" }} /></th>
                    ))
                  }
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: Math.max(displayCols.length, 4) }).map((__, j) => (
                        <td key={j}>
                          <div className="ig-skel-line" style={{ width: `${55 + (j * 13) % 35}%` }} />
                        </td>
                      ))}
                      <td><div className="ig-skel-line" style={{ width: "64px", margin: "0 auto" }} /></td>
                    </tr>
                  ))
                ) : error ? (
                  <tr className="ig-state-row">
                    <td colSpan={displayCols.length + 1}>
                      <div style={{ color: "#ef4444", marginBottom: "10px" }}>{error}</div>
                      <button onClick={fetchData}
                        style={{ background: "#1a6bb5", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 16px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr className="ig-state-row">
                    <td colSpan={displayCols.length + 1}>
                      {search ? `No results for "${search}"` : "No configurations found."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((row, i) => (
                    <tr key={i}>
                      {displayCols.map((col) => {
                        const value = renderCell(col, row);
                        const empty = value === "—";
                        return (
                          <td key={col.key} className={empty ? "empty-val" : ""}>
                            {col.isConn ? (
                              <span className="ig-conn-cell">
                                <span className="ig-conn-dot" />
                                {value}
                              </span>
                            ) : value}
                          </td>
                        );
                      })}
                      <td className="col-actions">
                        <button
                          className="ig-edit-btn"
                          onClick={() => router.push(`/dashboard/integrationWorkspace/Editworkspace/${row[ACTION_KEY]}`)}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M8.5 1.5a1.414 1.414 0 0 1 2 2L3.5 10.5 1 11l.5-2.5 7-7z"
                              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && !error && filtered.length > 0 && (
            <div className="ig-pagination">

              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div className="ig-pagesize-wrap">
                  Rows per page:
                  <select
                    className="ig-pagesize-select"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <span className="ig-page-info">
                  Showing&nbsp;
                  <strong>{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}</strong>
                  &nbsp;of&nbsp;<strong>{filtered.length}</strong> records
                </span>
              </div>

              <div className="ig-page-controls">
                <button
                  className="ig-page-btn"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={safePage === 1}
                  title="Previous page"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M8.5 10.5L5.5 7l3-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {getPageNumbers().map((p, idx) =>
                  p === "…" ? (
                    <span key={`ell-${idx}`} className="ig-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`ig-page-btn${safePage === p ? " active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className="ig-page-btn"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={safePage === totalPages}
                  title="Next page"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5.5 3.5L8.5 7l-3 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
