"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CryptoJS from "crypto-js";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,700;0,800;1,700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --accent: #2563eb; --accent-light: #eff6ff; --accent-mid: #bfdbfe;
    --border: #e2e8f0; --border-focus: #93c5fd;
    --text-primary: #0f172a; --text-secondary: #64748b; --text-label: #475569;
    --bg-page: #f8fafc; --bg-card: #ffffff;
    --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 4px 24px rgba(37,99,235,0.06);
    --radius: 12px; --radius-sm: 8px; --radius-input: 6px;
  }

  body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg-page); color: var(--text-primary); min-height: 100vh; }

  .page-wrap {
    min-height: 100vh;
    background: var(--bg-page);
    padding: 12px 16px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .page-header {
    width: 100%;
    max-width: 1000px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .page-title {
    font-family: 'Fraunces', serif;
    font-size: 17px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .page-desc {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 2px;
    line-height: 1.4;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-card);
    width: 100%;
    max-width: 1000px;
    overflow: hidden;
  }

  .mapping-header {
    display: grid;
    grid-template-columns: 1fr 28px 1fr 28px;
    gap: 0;
    padding: 6px 16px;
    background: #f8fafc;
    border-bottom: 1px solid var(--border);
  }

  .custom-header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 60px;
    gap: 6px;
    padding: 6px 16px;
    background: #f8fafc;
    border-bottom: 1px solid var(--border);
  }

  .col-header {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .section { border-bottom: 1px solid var(--border); }
  .section:last-child { border-bottom: none; }

  .collapse-toggle {
  cursor: pointer;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: linear-gradient(to right, #f1f5f9, #f8fafc);
    border: none;
    border-bottom: 1px solid #e9eef5;
    cursor: pointer;
    transition: background 0.18s;
    gap: 8px;
  }
  .collapse-toggle:hover { background: linear-gradient(to right, #e8edf5, #f1f5f9); }

  .collapse-toggle-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #64748b;
  }

  .section-label-pill {
    background: var(--accent-mid);
    color: var(--accent);
    padding: 1px 6px;
    border-radius: 20px;
    font-size: 9px;
    font-weight: 700;
  }

  .section-label-pill-green {
    background: #dcfce7;
    color: #16a34a;
    padding: 1px 6px;
    border-radius: 20px;
    font-size: 9px;
    font-weight: 700;
  }

  .collapse-toggle-right {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
  }

  .chevron {
    width: 13px; height: 13px;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
    flex-shrink: 0;
  }
  .chevron.open { transform: rotate(180deg); }

  .collapse-body { overflow: hidden; transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease; max-height: 0; opacity: 0; }
  .collapse-body.open { max-height: 4000px; opacity: 1; }

  .fixed-row {
    display: grid;
    grid-template-columns: 1fr 28px 1fr 28px;
    padding: 5px 16px;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
    animation: fadeUp 0.3s ease both;
  }
  .fixed-row:last-child { border-bottom: none; }
  .fixed-row:hover { background: #fafbff; }

  .saved-custom-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 60px;
    gap: 6px;
    padding: 5px 16px;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
    animation: fadeUp 0.3s ease both;
  }
  .saved-custom-row:last-child { border-bottom: none; }


  .custom-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 60px;
    gap: 6px;
    padding: 5px 16px;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
    animation: fadeUp 0.3s ease both;
  }
  .custom-row:last-child { border-bottom: none; }
  .custom-row:hover { background: #f5f8ff; }

  /* Field-level error highlight */
  .map-input.field-error,
  .map-select.field-error {
    border-color: #f87171 !important;
    background: #fff5f5 !important;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.10) !important;
  }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin   { to { transform: rotate(360deg); } }

  .map-input {
    width: 100%;
    background: #fafbfd;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-input);
    color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11.5px;
    padding: 5px 8px;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }
  .map-input:focus { border-color: var(--border-focus); background: var(--bg-card); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .map-input:read-only { background: #f1f5f9; color: #64748b; cursor: default; border-color: #e9eef5; }
  .map-input::placeholder { color: #cbd5e1; font-size: 11px; }

  .map-select {
    width: 100%;
    background: #fafbfd;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-input);
    color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11.5px;
    padding: 5px 24px 5px 8px;
    outline: none;
    cursor: pointer;
    appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 7px center;
    background-size: 11px;
  }
  .map-select:focus { border-color: var(--border-focus); background-color: var(--bg-card); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .map-select:disabled { background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed; opacity: 0.7; }

  .select-loading {
    width: 100%;
    background: #f1f5f9;
    border: 1.5px solid #e9eef5;
    border-radius: var(--radius-input);
    padding: 5px 8px;
    font-size: 11.5px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .spin { width: 10px; height: 10px; border: 2px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }

  .arrow-cell { display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 12px; }
  .action-cell { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
  .placeholder-cell { width: 22px; }

  .delete-btn {
    width: 22px; height: 22px;
    border-radius: 5px;
    border: 1.5px solid #fecaca;
    background: #fff5f5;
    color: #ef4444;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    font-size: 11px;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
    flex-shrink: 0;
  }
  .delete-btn:hover { background: #fee2e2; border-color: #ef4444; transform: scale(1.07); }

  .saved-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: #f1f5f9;
    color: #64748b;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    font-size: 8.5px;
    font-weight: 700;
    padding: 2px 6px;
    white-space: nowrap;
    margin-left: 8px;
  }

  .saved-divider {
    padding: 5px 16px;
    background: #f8fafc;
    border-bottom: 1px dashed #e2e8f0;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .add-row-wrap {
    padding: 8px 16px;
    border-top: 1px dashed #e2e8f0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .add-custom-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    background: var(--accent-light);
    border: 1.5px dashed var(--accent-mid);
    border-radius: var(--radius-sm);
    color: var(--accent);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
  }
  .add-custom-btn:hover:not(:disabled) { background: #dbeafe; border-color: var(--accent); transform: translateY(-1px); }
  .add-custom-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .custom-count { font-size: 11px; color: var(--text-secondary); }
  .custom-count span { font-weight: 700; color: var(--accent); }

  .empty-custom { padding: 12px 16px; color: #94a3b8; font-size: 11.5px; text-align: center; }

  .footer {
    width: 100%;
    max-width: 1000px;
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    animation: fadeUp 0.35s 0.18s ease both;
  }

  .btn-ghost {
    padding: 7px 14px;
    background: var(--bg-card);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
  }
  .btn-ghost:hover { border-color: var(--accent-mid); color: var(--accent); background: var(--accent-light); }

  .btn-primary {
    padding: 7px 18px;
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    color: white;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 3px 12px rgba(37,99,235,0.28);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .btn-primary:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 5px 16px rgba(37,99,235,0.38); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: #0f172a;
    color: #f8fafc;
    padding: 8px 18px;
    border-radius: 40px;
    font-size: 11px;
    font-weight: 500;
    box-shadow: 0 10px 28px rgba(0,0,0,0.18);
    transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
    z-index: 999;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .toast.show { transform: translateX(-50%) translateY(0); }
  .toast-check { color: #4ade80; font-size: 12px; }

  .info-btn {
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 1.5px solid #93c5fd;
    background: #eff6ff;
    color: #2563eb;
    font-size: 9px;
    font-weight: 800;
    font-family: 'Plus Jakarta Sans', sans-serif;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.18s, border-color 0.18s, transform 0.15s;
    flex-shrink: 0;
    line-height: 1; padding: 0;
  }
  .info-btn:hover { background: #dbeafe; border-color: #2563eb; transform: scale(1.12); }

  .info-tooltip-portal {
    position: fixed;
    width: 300px;
    background: #ffffff;
    color: #334155;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 0;
    font-size: 11.5px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    line-height: 1.7;
    box-shadow: 0 12px 40px rgba(15,23,42,0.15), 0 2px 10px rgba(37,99,235,0.10);
    z-index: 9999;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    overflow: hidden;
  }
  .info-tooltip-portal.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .info-tooltip-portal::before {
    content: '';
    position: absolute;
    top: -6px; left: 18px;
    width: 10px; height: 10px;
    background: #ffffff;
    border-left: 1.5px solid #e2e8f0;
    border-top: 1.5px solid #e2e8f0;
    transform: rotate(45deg);
    border-radius: 2px 0 0 0;
  }
  .info-tooltip-header {
    padding: 10px 14px 8px;
    border-bottom: 1px solid #f1f5f9;
    background: #f8fafc;
    border-radius: 10px 10px 0 0;
  }
  .info-tooltip-title { font-weight: 700; color: #1e293b; font-size: 12px; display: flex; align-items: center; gap: 4px; }
  .info-tooltip-body {
    max-height: 200px;
    overflow-y: auto;
    padding: 10px 14px;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }
  .info-tooltip-body::-webkit-scrollbar { width: 4px; }
  .info-tooltip-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  .info-tooltip-portal ul { padding-left: 13px; margin: 0; }
  .info-tooltip-portal ul li { margin-bottom: 4px; color: #64748b; font-size: 11.5px; }
  .info-tooltip-portal ul li:last-child { margin-bottom: 0; }
  .info-tooltip-portal ul li strong { color: #2563eb; font-weight: 600; }

  /* Validation banner */
  .validation-banner {
    width: 100%;
    max-width: 1000px;
    margin-top: 8px;
    padding: 10px 16px;
    background: #fef2f2;
    border: 1.5px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    animation: fadeUp 0.25s ease both;
  }
  .validation-banner ul {
    margin: 4px 0 0 4px;
    padding-left: 14px;
  }
  .validation-banner ul li {
    font-size: 11.5px;
    margin-bottom: 2px;
    color: #b91c1c;
  }
  .validation-banner-close {
    margin-left: auto;
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0 2px;
    flex-shrink: 0;
  }

  @media (max-width: 680px) {
    .fixed-row, .custom-row, .saved-custom-row, .mapping-header, .custom-header { padding: 5px 10px; }
    .custom-row, .saved-custom-row { grid-template-columns: 1fr; }
    .custom-header { display: none; }
    .add-row-wrap { padding: 8px 10px; }
    .collapse-toggle { padding: 8px 10px; }
    .info-tooltip-portal { width: 240px; }
  }
`;

const MAX_CUSTOM = 25;

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const FIXED_COL_ITEMS = [
  "<strong>These are the 10 fixed columns</strong> that cannot be modified.",
  "The <strong>Source Columns</strong> contain the fields that you want to map.",
  "The <strong>Destination Columns</strong> represent the table columns where the data will be mapped.",
  "Fixed columns cannot be added or removed to ensure consistency and data integrity.",
];

const CUSTOM_COL_ITEMS = [
  "Add up to <strong>25 custom columns</strong> to extend your mapping beyond fixed fields.",
  "<strong>Display Name</strong>: The label shown in your destination system.",
  "<strong>System Column</strong>: The internal field from your workspace schema.",
  "<strong>Map Source Column</strong>: The destination field this column maps to.",
  "Saved columns are locked but their source mapping can still be updated.",
  "Source mapping can be modified when configuring for a different platform.",
  "For the same platform, the mapping remains unchanged and cannot be edited.",
  "This ensures consistency and avoids conflicts within the same platform configuration.",
];

function ColDropdown({ value, onChange, options = [], colsLoading, colsError, hasError }) {
  if (colsLoading)
    return (
      <div className="select-loading">
        <div className="spin" /> Loading…
      </div>
    );
  if (colsError)
    return (
      <select className="map-select" disabled>
        <option>Failed to load</option>
      </select>
    );
  return (
    <select
      className={`map-select${hasError ? " field-error" : ""}`}
      value={value || ""}
      onChange={onChange}
      disabled={options.length === 0}
    >
      <option value="">{options.length === 0 ? "— No columns —" : "— Select —"}</option>
      {options.map((col, i) => (
        <option key={i} value={col.name}>
          {col.name}
        </option>
      ))}
    </select>
  );
}

// ─── InfoButton ────────────────────────────────────────────────────────────────
function InfoButton({ title, listItems }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const tooltipRef = useRef(null);
  const rafRef = useRef(null);

  const calcCoords = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 8, left: rect.left });
  };

  const openTooltip = (e) => {
    e.stopPropagation();
    if (visible) { setVisible(false); return; }
    calcCoords();
    setVisible(true);
  };

  useEffect(() => {
    if (!visible) return;
    const handler = () => { rafRef.current = requestAnimationFrame(calcCoords); };
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("scroll", handler, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible]);

  useEffect(() => {
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target)
      ) {
        setVisible(false);
        e.stopPropagation();
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, []);

  return (
    <>
      <button ref={btnRef} className="info-btn" type="button" onClick={openTooltip} aria-label="More information">i</button>
      <div
        ref={tooltipRef}
        className={`info-tooltip-portal ${visible ? "visible" : ""}`}
        style={{ top: coords.top, left: coords.left }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="info-tooltip-header">
          <div className="info-tooltip-title">{title}</div>
        </div>
        <div className="info-tooltip-body">
          <ul>
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export default function ColumnMappingPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get("appid");
  const returnFilter = searchParams.get("returnFilter") || "All";

  const [DestinationColumns, setDestinationColumns] = useState([]);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [fixedColumns, setFixedColumns] = useState([]);
  const [colsLoading, setColsLoading] = useState(false);
  const [colsError, setColsError] = useState(false);
  const [customColumns, setCustomColumns] = useState([]);
  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fixedOpen, setFixedOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(true);
  const [savedCustomColumns, setSavedCustomColumns] = useState([]);
  const [savedColumnEdits, setSavedColumnEdits] = useState({});
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Track which new-row fields have errors (for red highlight)
  const [fieldErrors, setFieldErrors] = useState({});
  // Track which saved-row sourceColumn fields have errors
  const [savedFieldErrors, setSavedFieldErrors] = useState({});

  useEffect(() => {
    async function loadColumns() {
      setColsLoading(true);
      try {
        const response = await fetch(`/api/workspace/SystemColDLL?Platformid=${id}`);
        const data = await response.json();
        if (response.ok) {
          setDynamicColumns(data.customFieldList || []);
          setFixedColumns(data.fixedColumns || []);
        } else {
          console.error("Failed to fetch columns:", data.message);
        }
      } catch (error) {
        console.error(error);
        setColsError(true);
      } finally {
        setColsLoading(false);
      }
    }
    loadColumns();
  }, []);

  useEffect(() => {
    async function loadDestColumns() {
      setColsLoading(true);
      try {
        const response = await fetch(`/api/workspace/DestcolDLL?Platformid=${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setDestinationColumns(data.destFieldList);
        } else {
          console.error("Failed to fetch Custom Fields:", data.message);
        }
      } catch {
        setColsError(true);
      } finally {
        setColsLoading(false);
      }
    }
    loadDestColumns();
  }, []);

  useEffect(() => {
    if (!id) return;

    setSavedCustomColumns([]);
    setSavedColumnEdits({});
    setCustomColumns([]);
    setSavedLoading(true);
    setSavedError(false);

    async function loadSavedCustomColumns() {
      try {
        const response = await fetch(
          `/api/integrationWorkspace/ColumnMapping?Platformid=${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        if (response.ok && data.success) {
          setSavedCustomColumns(data.data || []);
          const initialEdits = {};
          (data.data || []).forEach((col, i) => {
            initialEdits[i] = col.sourceColumn || "";
          });
          setSavedColumnEdits(initialEdits);
        } else {
          setSavedError(true);
        }
      } catch (err) {
        console.error("Failed to fetch saved columns:", err);
        setSavedError(true);
      } finally {
        setSavedLoading(false);
      }
    }

    loadSavedCustomColumns();
  }, [id]);

  const addCustomColumn = () => {
    if (customColumns.length >= MAX_CUSTOM) return;
    setCustomColumns((prev) => [
      ...prev,
      { id: Date.now(), displayName: "", srcColumn: "", destColumn: "" },
    ]);
  };

  const removeCustomColumn = (colId) => {
    setCustomColumns((prev) => prev.filter((c) => c.id !== colId));
    // Clear field errors for removed row
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[colId];
      return next;
    });
  };

  const updateCol = (colId, field, value) => {
    setCustomColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, [field]: value } : c))
    );
    // Clear error for this specific field when user fills it
    if (value) {
      setFieldErrors((prev) => {
        const row = { ...(prev[colId] || {}) };
        delete row[field];
        const next = { ...prev, [colId]: row };
        return next;
      });
    }
  };

  const hasEdits =
    customColumns.length > 0 ||
    Object.keys(savedColumnEdits).some(
      (i) => savedColumnEdits[i] !== (savedCustomColumns[i]?.sourceColumn || "")
    );

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errors = [];
    const newFieldErrors = {};
    const newSavedFieldErrors = {};

    // 1. New custom rows — all three fields required
    customColumns.forEach((col, idx) => {
      const rowErrors = {};
      if (!col.srcColumn) {
        errors.push(`Row ${idx + 1}: System Column is required.`);
        rowErrors.srcColumn = true;
      }
      if (!col.displayName?.trim()) {
        errors.push(`Row ${idx + 1}: Display Name is required.`);
        rowErrors.displayName = true;
      }
      if (!col.destColumn) {
        errors.push(`Row ${idx + 1}: Map Source Column is required.`);
        rowErrors.destColumn = true;
      }
      if (Object.keys(rowErrors).length > 0) newFieldErrors[col.id] = rowErrors;
    });

    // 2. Saved rows that have an empty sourceColumn and are using the dropdown
    savedCustomColumns.forEach((col, i) => {
      if (!col.sourceColumn) {
        // This row needs the dropdown filled
        if (!savedColumnEdits[i]) {
          errors.push(`Saved row "${col.displayName || col.systemColumn}": Map Source Column is required.`);
          newSavedFieldErrors[i] = true;
        }
      }
    });

    // 3. Duplicate Display Names across all rows
    const allDisplayNames = [
      ...fixedColumns.map((c) => c.display_name?.trim().toLowerCase()),
      ...savedCustomColumns.map((c) => c.displayName?.trim().toLowerCase()),
      ...customColumns.map((c) => c.displayName?.trim().toLowerCase()),
    ].filter(Boolean);
    const dupDisplay = allDisplayNames.find((n, i) => allDisplayNames.indexOf(n) !== i);
    if (dupDisplay) errors.push(`Duplicate Display Name: "${dupDisplay}". Each column must have a unique display name.`);

    // 4. Duplicate System Columns
    const allSystemCols = [
      ...fixedColumns.map((c) => c.column_name?.trim().toLowerCase()),
      ...savedCustomColumns.map((c) => c.systemColumn?.trim().toLowerCase()),
      ...customColumns.map((c) => c.srcColumn?.trim().toLowerCase()),
    ].filter(Boolean);
    const dupSystem = allSystemCols.find((n, i) => allSystemCols.indexOf(n) !== i);
    if (dupSystem) errors.push(`Duplicate System Column: "${dupSystem}". The same system column cannot be mapped twice.`);

    // 5. Duplicate Source/Destination Columns
    const allSourceCols = [
      ...fixedColumns.map((c) => c.display_name?.trim().toLowerCase()),
      ...savedCustomColumns.map((c, i) =>
        (savedColumnEdits[i] !== undefined ? savedColumnEdits[i] : c.sourceColumn)?.trim().toLowerCase()
      ),
      ...customColumns.map((c) => c.destColumn?.trim().toLowerCase()),
    ].filter(Boolean);
    const dupSource = allSourceCols.find((n, i) => allSourceCols.indexOf(n) !== i);
    if (dupSource) errors.push(`Duplicate Map Source Column: "${dupSource}". The same source column cannot be used twice.`);

    setFieldErrors(newFieldErrors);
    setSavedFieldErrors(newSavedFieldErrors);
    setValidationErrors(errors);

    // Open the custom section so errors are visible
    if (errors.length > 0) setCustomOpen(true);

    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;
      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }

      const fixedData = fixedColumns.map((col) => ({
        systemColumn: col.display_name,
        sourceColumn: col.column_name,
        displayName: col.display_name,
      }));

      const savedData = savedCustomColumns.map((col, i) => ({
        systemColumn: col.systemColumn,
        sourceColumn: savedColumnEdits[i] !== undefined ? savedColumnEdits[i] : col.sourceColumn,
        displayName: col.displayName,
      }));

      const customData = customColumns.map((col) => ({
        systemColumn: col.srcColumn,
        sourceColumn: col.destColumn,
        displayName: col.displayName,
      }));

      const payload = {
        Platformid: id,
        appid: appId,
        mappings: [...fixedData, ...savedData, ...customData],
        created_by: userId,
      };

      const response = await fetch("/api/workspace/saveColumnMapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const newSaved = customColumns.map((col) => ({
        systemColumn: col.srcColumn,
        sourceColumn: col.destColumn,
        displayName: col.displayName,
      }));
      setSavedCustomColumns((prev) => {
        const merged = [...prev, ...newSaved];
        const newEdits = {};
        merged.forEach((col, i) => {
          newEdits[i] = savedColumnEdits[i] !== undefined ? savedColumnEdits[i] : col.sourceColumn || "";
        });
        setSavedColumnEdits(newEdits);
        return merged;
      });
      setCustomColumns([]);
      setFieldErrors({});
      setSavedFieldErrors({});
      setValidationErrors([]);

      setToast(true);
      setTimeout(() => setToast(false), 3000);
      const backUrl =
        returnFilter && returnFilter !== "All"
          ? `/dashboard/integrationWorkspace?filter=${encodeURIComponent(returnFilter)}`
          : `/dashboard/integrationWorkspace`;
      router.push(backUrl);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const totalUsed = savedCustomColumns.length + customColumns.length;
  const slotsRemaining = MAX_CUSTOM - totalUsed;

  return (
    <>
      <style>{styles}</style>
      <div className="page-wrap">
        {/* Header */}
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button className="btn-ghost" onClick={() => router.back()}>← Back</button>
            <div style={{ width: "1px", height: "24px", background: "var(--border)", flexShrink: 0 }} />
            <div>
              <h1 className="page-title">Column Mapping</h1>
              <p className="page-desc">
                Map source columns to destination columns. Add up to {MAX_CUSTOM} custom columns.
              </p>
            </div>
          </div>
        </div>

        <div className="card">

          {/* ── Fixed Columns ── */}
          <div className="section">
            <div className="collapse-toggle" onClick={() => setFixedOpen((v) => !v)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setFixedOpen((v) => !v)}>
              <div className="collapse-toggle-left">
                <span>🔒</span>
                Fixed Columns
                <span className="section-label-pill">{fixedColumns.length} columns</span>
                <InfoButton title="🔒 Fixed Columns" listItems={FIXED_COL_ITEMS} />
              </div>
              <div className="collapse-toggle-right">
                <span>{fixedOpen ? "Hide" : "Show"}</span>
                <span className={`chevron ${fixedOpen ? "open" : ""}`}><ChevronIcon /></span>
              </div>
            </div>

            <div className={`collapse-body ${fixedOpen ? "open" : ""}`}>
              <div className="mapping-header">
                <div className="col-header">📥 Source Column</div>
                <div />
                <div className="col-header">📤 Destination Column</div>
                <div />
              </div>

              {fixedColumns.length === 0 && !colsLoading && (
                <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "11px", textAlign: "center" }}>
                  No fixed columns loaded yet.
                </div>
              )}

              {fixedColumns.map((col, i) => (
                <div className="fixed-row" key={i} style={{ animationDelay: `${0.02 * i}s` }}>
                  <input className="map-input" value={col.column_name} readOnly />
                  <div className="arrow-cell">→</div>
                  <input className="map-input" value={col.display_name} readOnly />
                  <div className="action-cell"><div className="placeholder-cell" /></div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Custom Columns ── */}
          <div className="section">
            <button className="collapse-toggle" onClick={() => setCustomOpen((v) => !v)} type="button">
              <div className="collapse-toggle-left">
                <span>✏️</span>
                Custom Columns
                {savedCustomColumns.length > 0 && (
                  <span className="section-label-pill-green">✓ {savedCustomColumns.length} saved</span>
                )}
                <span className="section-label-pill">
                  {customColumns.length} new · {MAX_CUSTOM} max
                </span>
                <InfoButton title="✏️ Custom Columns" listItems={CUSTOM_COL_ITEMS} />
              </div>
              <div className="collapse-toggle-right">
                <span>{customOpen ? "Hide" : "Show"}</span>
                <span className={`chevron ${customOpen ? "open" : ""}`}><ChevronIcon /></span>
              </div>
            </button>

            <div className={`collapse-body ${customOpen ? "open" : ""}`}>

              {savedLoading && (
                <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 7, fontSize: "11px", color: "#94a3b8" }}>
                  <div className="spin" /> Loading saved columns…
                </div>
              )}

              {/* Saved custom columns */}
              {!savedLoading && savedCustomColumns.length > 0 && (
                <>
                  <div className="custom-header">
                    <div className="col-header">📥 System Column</div>
                    <div className="col-header">🏷️ Display Name</div>
                    <div className="col-header">📤 Map Source Column</div>
                    <div />
                  </div>

                  {savedCustomColumns.map((col, i) => (
                    <div className="saved-custom-row" key={`saved-${i}`} style={{ animationDelay: `${0.02 * i}s` }}>
                      <input className="map-input" value={col.systemColumn || "—"} readOnly />
                      <input className="map-input" value={col.displayName || "—"} readOnly />

                      {col.sourceColumn ? (
                        <input
                          className="map-input"
                          value={savedColumnEdits[i] ?? col.sourceColumn ?? "—"}
                          readOnly
                        />
                      ) : (
                        // Stable ColDropdown — won't unmount/remount because it's defined outside
                        <ColDropdown
                          options={DestinationColumns || []}
                          value={savedColumnEdits[i] ?? ""}
                          colsLoading={colsLoading}
                          colsError={colsError}
                          hasError={!!savedFieldErrors[i]}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSavedColumnEdits((prev) => ({ ...prev, [i]: val }));
                            // Clear saved field error when user selects
                            if (val) {
                              setSavedFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next[i];
                                return next;
                              });
                              setValidationErrors((prev) =>
                                prev.filter((err) => !err.includes(col.displayName || col.systemColumn))
                              );
                            }
                          }}
                        />
                      )}
                      <div className="action-cell">
                        <span className="saved-badge">✓ Saved</span>
                      </div>
                    </div>
                  ))}

                  {customColumns.length > 0 && (
                    <div className="saved-divider">
                      <span>➕</span> New columns to add
                    </div>
                  )}
                </>
              )}

              {/* New custom column header */}
              {!savedLoading && customColumns.length > 0 && (
                <div className="custom-header">
                  <div className="col-header">📥 System Column</div>
                  <div className="col-header">🏷️ Display Name</div>
                  <div className="col-header">📤 Map Source Column</div>
                  <div />
                </div>
              )}

              {!savedLoading && customColumns.length === 0 && savedCustomColumns.length === 0 && (
                <div className="empty-custom">
                  No custom columns yet. Click Add Custom Column to get started.
                </div>
              )}

              {/* New (unsaved) custom columns */}
              {customColumns.map((col, idx) => {
                const rowErr = fieldErrors[col.id] || {};
                return (
                  <div className="custom-row" key={col.id} style={{ animationDelay: `${0.03 * idx}s` }}>
                    <ColDropdown
                      options={dynamicColumns || []}
                      value={col.srcColumn}
                      colsLoading={colsLoading}
                      colsError={colsError}
                      hasError={!!rowErr.srcColumn}
                      onChange={(e) => updateCol(col.id, "srcColumn", e.target.value)}
                    />
                    <input
                      className={`map-input${rowErr.displayName ? " field-error" : ""}`}
                      value={col.displayName}
                      placeholder="e.g. My Custom Field"
                      onChange={(e) => updateCol(col.id, "displayName", e.target.value)}
                    />
                    <ColDropdown
                      options={DestinationColumns || []}
                      value={col.destColumn}
                      colsLoading={colsLoading}
                      colsError={colsError}
                      hasError={!!rowErr.destColumn}
                      onChange={(e) => updateCol(col.id, "destColumn", e.target.value)}
                    />
                    <div className="action-cell">
                      <button className="delete-btn" onClick={() => removeCustomColumn(col.id)} title="Remove">
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="add-row-wrap">
                <button
                  className="add-custom-btn"
                  onClick={addCustomColumn}
                  disabled={totalUsed >= MAX_CUSTOM}
                >
                  <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span> Add Custom Column
                </button>
                {totalUsed > 0 && (
                  <span className="custom-count">
                    <span>{slotsRemaining}</span> slots remaining
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Validation error banner */}
        {validationErrors.length > 0 && (
          <div className="validation-banner">
            <span style={{ fontSize: "14px", flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: "2px" }}>
                Please fix the following before saving:
              </div>
              <ul>
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
            <button
              className="validation-banner-close"
              onClick={() => {
                setValidationErrors([]);
                setFieldErrors({});
                setSavedFieldErrors({});
              }}
            >✕</button>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <button
            className="btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={handleSave}
            disabled={saving || !hasEdits}
          >
            {saving ? "⏳ Saving…" : "💾 Save Mapping"}
          </button>
        </div>
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>
        <span className="toast-check">✓</span>
        Column mapping saved successfully!
      </div>
    </>
  );
}
