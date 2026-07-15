"use client";

import { Suspense, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import CryptoJS from "crypto-js";
import { formatDistance } from "date-fns";
import CreateFormBtn from "@/components/create-form-btn";
import withAuth from "@/components/withAuth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";
import {
  Edit2, Eye, Copy, Trash2, ChevronDown, Search,
  LayoutGrid, List, FileText, CheckCircle2, EyeOff,
  Rocket, Clock, Send, ArchiveX, Layers,
  Activity, Star
} from "lucide-react";
import { BsFillTelephoneForwardFill } from "react-icons/bs";
import { IoIosChatbubbles } from "react-icons/io";
import { MdEmail, MdSocialDistance } from "react-icons/md";
import "@/components/Styles/FormPage.css";
import TreeDropdown from "@/components/organizationTreeDDL";
/* ─────────────────────────────────────────────────────────── */
/*  HELPERS                                                    */
/* ─────────────────────────────────────────────────────────── */

const getUserFromSession = () => {
  if (typeof window === "undefined") return null;
  const encryptedUserData = sessionStorage.getItem("user");
  if (!encryptedUserData) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch {
    return null;
  }
};

/* ─────────────────────────────────────────────────────────── */
/*  INTERACTION TYPE ICON MAP                                  */
/* ─────────────────────────────────────────────────────────── */

const INTERACTION_ICON_MAP = {
  telephony: { icon: BsFillTelephoneForwardFill, color: "#3b82f6" },
  voice: { icon: BsFillTelephoneForwardFill, color: "#3b82f6" },
  call: { icon: BsFillTelephoneForwardFill, color: "#3b82f6" },
  chat: { icon: IoIosChatbubbles, color: "#22c55e" },
  email: { icon: MdEmail, color: "#f59e0b" },
  social: { icon: MdSocialDistance, color: "#7c3aed" },
};


function getInteractionIcon(type = "") {
  const key = type.toLowerCase();
  for (const [k, val] of Object.entries(INTERACTION_ICON_MAP)) {
    if (key.includes(k)) return val;
  }
  return { icon: Activity, color: "#6b7280" }; // grey fallback
}
/* ─────────────────────────────────────────────────────────── */
/*  STATUS CONFIG  (icons instead of emojis)                   */
/* ─────────────────────────────────────────────────────────── */

const STATUS_MAP = {
  0: {
    label: "Draft",
    stripClass: "fmg-strip-draft",
    iconClass: "fmg-icon-draft",
    pillClass: "fmg-pill-draft",
    Icon: FileText,
    StatsIcon: FileText,
  },
  1: {
    label: "In Review",
    stripClass: "fmg-strip-review",
    iconClass: "fmg-icon-review",
    pillClass: "fmg-pill-review",
    Icon: Clock,
    StatsIcon: Clock,
  },
  2: {
    label: "Hidden",
    stripClass: "fmg-strip-hidden",
    iconClass: "fmg-icon-hidden",
    pillClass: "fmg-pill-hidden",
    Icon: EyeOff,
    StatsIcon: EyeOff,
  },
  3: {
    label: "Staged",
    stripClass: "fmg-strip-staged",
    iconClass: "fmg-icon-staged",
    pillClass: "fmg-pill-staged",
    Icon: Rocket,
    StatsIcon: Rocket,
  },
  5: {
    label: "Published",
    stripClass: "fmg-strip-published",
    iconClass: "fmg-icon-published",
    pillClass: "fmg-pill-published",
    Icon: CheckCircle2,
    StatsIcon: CheckCircle2,
  },
};

/* ─────────────────────────────────────────────────────────── */
/*  STATS ROW                                                  */
/* ─────────────────────────────────────────────────────────── */

function StatsRow({ forms }) {
  const total = forms.length;
  const live = forms.filter((f) => f.Status === 5).length;
  const draft = forms.filter((f) => f.Status === 0).length;
  const hidden = forms.filter((f) => f.Status === 2).length;
  const reviewStaged = forms.filter((f) => f.Status === 1 || f.Status === 3).length;

  const stats = [
    { label: "Total Forms", value: total, sub: "Across all channels", Icon: Layers, accentClass: "fmg-sum-total" },
    { label: "Published", value: live, sub: "Live in evaluations", Icon: CheckCircle2, accentClass: "fmg-sum-live" },
    { label: "Draft", value: draft, sub: "Not yet submitted", Icon: FileText, accentClass: "fmg-sum-draftonly" },
    { label: "Hidden", value: hidden, sub: "Archived forms", Icon: EyeOff, accentClass: "fmg-sum-archived" },
    { label: "Review / Staged", value: reviewStaged, sub: "Staged forms", Icon: Clock, accentClass: "fmg-sum-reviewstaged" },
  ];

  return (
    <div className="fmg-stats-row">
      {stats.map((s) => (
        <div key={s.label} className={`fmg-sum-card ${s.accentClass}`}>
          <div className="fmg-sum-header">
            <span className="fmg-sum-label">{s.label}</span>
            <div className="fmg-sum-icon-wrap">
              <s.Icon size={16} />
            </div>
          </div>
          <div className="fmg-sum-value">{s.value}</div>
          <div className="fmg-sum-sub">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  MAIN PAGE                                                  */
/* ─────────────────────────────────────────────────────────── */

function FormsPage({ basePath = "/dashboard/forms" }) {
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [forms, setForms] = useState([]);
  const [formsLoaded, setFormsLoaded] = useState(false);

  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("modified");

  const hasPrivilege = (privId) => privileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const user = getUserFromSession();
        const userId = user?.userId ?? null;
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 5,
            orgIds: getSelectedOrgIdsHeader(),
          },
        });
        if (!response.ok) throw new Error("Failed to fetch privileges");
        const data = await response.json();
        setPrivileges(data.privileges || []);
        setPrivilegesLoaded(true);
      } catch (err) {
        console.error("Error fetching privileges:", err);
        setPrivilegesLoaded(true);
      }
    };
    fetchPrivileges();
  }, []);

  useEffect(() => {
    if (!privilegesLoaded) return;
    const fetchForms = async () => {
      try {
        const user = getUserFromSession();
        const userId = user?.userId ?? null;
        const response = await fetch("/api/forms", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            orgIds: getSelectedOrgIdsHeader(),
          },
          cache: "no-store",
        });
        const data = await response.json();
        if (response.ok) setForms(data.forms || []);
        else console.error("Failed to fetch forms:", data.message);
      } catch (error) {
        console.error("Error fetching forms:", error);
      } finally {
        setFormsLoaded(true);
      }
    };
    fetchForms();
  }, [privilegesLoaded]);

  if (!privilegesLoaded) return <div className="fmg-loading">Loading…</div>;
  if (privilegesLoaded && !hasPrivilege(1)) return notFound();

  const shouldShowCreateFormButton = privileges.some((p) => p.PrivilegeId === 10);

  const privilegeIds = privileges.map((p) => p.PrivilegeId);
  const allowedStatuses = new Set();
  if (privilegeIds.includes(1) && privilegeIds.includes(10)) {
    allowedStatuses.add(0).add(1).add(5).add(2).add(3);
  } else {
    if (privilegeIds.includes(1)) allowedStatuses.add(5);
    if (privilegeIds.includes(10)) allowedStatuses.add(0).add(1);
    if (privilegeIds.includes(7)) allowedStatuses.add(1);
    if (privilegeIds.includes(5)) allowedStatuses.add(1);
    if (privilegeIds.includes(16)) allowedStatuses.add(5);
    if (privilegeIds.includes(17)) allowedStatuses.add(2).add(5);
    if (privilegeIds.includes(18)) allowedStatuses.add(3).add(1);
  }

  const privilegeFiltered = forms.filter((f) => allowedStatuses.has(f.Status));

  const uniqueCreators = Array.from(
    new Set(
      forms
        .map((f) => {
          const temp = f.Creationby ?? "";
          if (temp.includes("<")) {
            return temp.replace(/<[^>]*>/g, "").trim();
          }
          return temp.trim();
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  /* apply UI filters */
  let visibleForms = privilegeFiltered.filter((f) => {
    const matchSearch = f.formName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === "all" ? true :
        statusFilter === "published" ? f.Status === 5 :
          statusFilter === "draft" ? f.Status === 0 :
            statusFilter === "review" ? f.Status === 1 :
              statusFilter === "hidden" ? f.Status === 2 :
                statusFilter === "staged" ? f.Status === 3 : true;

    const creatorClean = (f.Creationby ?? "").replace(/<[^>]*>/g, "").trim();
    const matchCreator = creatorFilter === "all" ? true : creatorClean === creatorFilter;

    return matchSearch && matchStatus && matchCreator;
  });

  visibleForms = [...visibleForms].sort((a, b) => {
    if (sortOrder === "name") return a.formName.localeCompare(b.formName);
    if (sortOrder === "created") return new Date(b.Creationdate) - new Date(a.Creationdate);
    return new Date(b.Modifydate) - new Date(a.Modifydate);
  });

  return (
    <div className="fmg-page">

      {/* PAGE HEADER */}
      <div className="fmg-header">
        <div>
          <h1 className="fmg-page-title">Forms</h1>
          <p className="fmg-page-sub">
            Create, publish and govern all QA evaluation forms across your contact center
          </p>
        </div>
        <div className="fmg-header-actions">
          {shouldShowCreateFormButton && <CreateFormBtn />}
        </div>
      </div>

      {/* STATS ROW */}
      {formsLoaded
        ? <StatsRow forms={privilegeFiltered} />
        : (
          <div className="fmg-stats-row">
            {[1, 2, 3, 4, 5].map((n) => <div key={n} className="fmg-sum-card fmg-skeleton" style={{ height: 90 }} />)}
          </div>
        )
      }

      {/* FILTER BAR */}
      <div className="fmg-filter-bar">
        <div className="fmg-search-wrap">
          <Search size={14} className="fmg-search-icon" />
          <input
            className="fmg-search-input"
            type="text"
            placeholder="Search forms by name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="fmg-select-wrap">
          <select className="fmg-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="review">In Review</option>
            <option value="staged">Staged</option>
            <option value="hidden">Hidden</option>
          </select>
          <ChevronDown size={12} className="fmg-select-arrow" />
        </div>

        <div className="fmg-select-wrap">
          <select className="fmg-filter-select" value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)}>
            <option value="all">Created By: All</option>
            {uniqueCreators.map((creator) => (
              <option key={creator} value={creator}>
                {creator}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="fmg-select-arrow" />
        </div>

        <div className="fmg-select-wrap">
          <select className="fmg-filter-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="modified">Sort: Last Modified</option>
            <option value="created">Sort: Date Created</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
          <ChevronDown size={12} className="fmg-select-arrow" />
        </div>

        <div className="fmg-filter-divider" />

        <span className="fmg-count-badge">
          {visibleForms.length} form{visibleForms.length !== 1 ? "s" : ""}
        </span>

        <div className="fmg-view-toggle">
          <button
            className={`fmg-vt-btn${viewMode === "grid" ? " active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <LayoutGrid size={13} /> Grid
          </button>
          <button
            className={`fmg-vt-btn${viewMode === "list" ? " active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <List size={13} /> List
          </button>
        </div>
      </div>

      {/* FORMS */}
      {!formsLoaded ? (
        <div className="fmg-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="fmg-skeleton" />)}
        </div>
      ) : viewMode === "list" ? (
        <ListView forms={visibleForms} privileges={privileges} basePath={basePath} />
      ) : (
        <div className="fmg-grid">
          {visibleForms.length === 0 ? (
            <div className="fmg-empty">
              <div className="fmg-empty-icon"><FileText size={36} strokeWidth={1.2} /></div>
              <div className="fmg-empty-title">No forms found</div>
              <div className="fmg-empty-sub">
                {searchTerm ? `No results for "${searchTerm}"` : "No forms are available yet."}
              </div>
            </div>
          ) : (
            visibleForms.map((form) => {
              try {
                return <FormCard key={form.formId} form={form} privileges={privileges} basePath={basePath} />;
              } catch (error) {
                console.error("Error rendering FormCard:", error);
                return <p key={form.formId}>Error rendering form card.</p>;
              }
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  LIST VIEW                                                  */
/* ─────────────────────────────────────────────────────────── */

function ListView({ forms, privileges, basePath }) {
  if (forms.length === 0) {
    return (
      <div className="fmg-list">
        <div className="fmg-empty" style={{ gridColumn: "unset" }}>
          <div className="fmg-empty-icon"><FileText size={36} strokeWidth={1.2} /></div>
          <div className="fmg-empty-title">No forms found</div>
        </div>
      </div>
    );
  }
  return (
    <div className="fmg-list">
      <div className="fmg-list-header">
        <span className="fmg-list-title"><List size={14} style={{ display: "inline", marginRight: 6 }} />All Forms</span>
        <span className="fmg-count-badge">{forms.length} form{forms.length !== 1 ? "s" : ""}</span>
      </div>
      <table className="fmg-table">
        <thead>
          <tr>
            <th>Form Name</th>
            <th>Status</th>
            <th>Interaction Types</th>
            <th>Sections</th>
            <th>Points</th>
            <th>Last Modified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {forms.map((form) => (
            <ListRow key={form.formId} form={form} privileges={privileges} basePath={basePath} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListRow({ form, privileges, basePath }) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const statusInfo = STATUS_MAP[form.Status] ?? STATUS_MAP[0];
  const StatusIcon = statusInfo.Icon;
  const returnTo = encodeURIComponent(basePath);
  const hasPriv5 = privileges.some((p) => p.PrivilegeId === 5);
  const hasPriv7 = privileges.some((p) => p.PrivilegeId === 7);
  const hasPriv16 = privileges.some((p) => p.PrivilegeId === 16);
  const hasPriv17 = privileges.some((p) => p.PrivilegeId === 17);
  const hasPriv18 = privileges.some((p) => p.PrivilegeId === 18);
  const hasPriv19 = privileges.some((p) => p.PrivilegeId === 19);
  const fa = useFormActions(form);

  // Parse interaction types
  const interactionTypes = parseInteractionTypes(form.InteractionTypeName);

  return (
    <tr>
      <td>
        <div className="fmg-td-form">
          <div className={`fmg-td-icon ${statusInfo.iconClass}`}>
            <StatusIcon size={14} />
          </div>
          <div className="fmg-td-info">
            <div className="fmg-td-name">{form.formName}</div>
            <div className="fmg-td-sub">
              Created by: <span dangerouslySetInnerHTML={{ __html: form.Creationby }} />
            </div>
          </div>
        </div>
      </td>
      <td>
        <span className={`fmg-pill ${statusInfo.pillClass}`}>
          <StatusIcon size={10} />
          {statusInfo.label}
        </span>
      </td>
      <td>
        <div className="fmg-interaction-chips">
          {interactionTypes.length > 0
            ? interactionTypes.map((t) => {
              const { icon: IIcon, color } = getInteractionIcon(t);
              return (
                <span key={t} className="fmg-interaction-chip">
                  <IIcon size={10} color={color} /> {t}
                </span>
              );
            })
            : <span className="fmg-td-sub">—</span>
          }
        </div>
      </td>
      <td>
        {(() => {
          const sc = getSectionCount(form);
          return sc > 0
            ? (
              <span className="fmg-section-chip">
                <Layers size={10} /> {sc} Section{sc !== 1 ? "s" : ""}
              </span>
            )
            : <span className="fmg-td-sub">—</span>;
        })()}
      </td>
      <td>
        {form.Max_score != null && form.Max_score !== ""
          ? (
            <span className="fmg-points-chip">
              <Star size={10} /> {form.Max_score} pts
            </span>
          )
          : <span className="fmg-td-sub">—</span>
        }
      </td>
      <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
        {formatDistance(new Date(form.Modifydate), new Date(), { includeSeconds: true, addSuffix: true })}
      </td>
      <td>
        <div className="fmg-act-cell">
          {form.Status === 0
            ? <Link href={`/dashboard/forms/builder/${form.UniqueId}?returnTo=${returnTo}`} className="fmg-row-btn primary" title="Edit">
              <Edit2 size={13} />
            </Link>
            : <Link href={`/dashboard/forms/${form.UniqueId}?returnTo=${returnTo}`} className="fmg-row-btn primary" title="Preview">
              <Eye size={13} />
            </Link>
          }

          {hasPriv7 && (form.Status === 1 || form.Status === 3) &&
            <button className="fmg-row-btn success" onClick={fa.handleSubmit}>
              <Send size={11} /> Publish
            </button>
          }

          {hasPriv18 && form.Status === 1 &&
            <button className="fmg-row-btn" onClick={fa.handleStaged} title="Stage">
              <Rocket size={13} />
            </button>
          }

          {hasPriv19 && form.Status === 3 &&
            <button className="fmg-row-btn warn" onClick={fa.handleUnStaged} title="Unstage">
              <ArchiveX size={13} />
            </button>
          }

          {hasPriv17 && form.Status === 5 &&
            <button className="fmg-row-btn warn" onClick={fa.handleHide} title="Hide">
              <EyeOff size={13} />Hide
            </button>
          }

          {hasPriv17 && form.Status === 2 &&
            <button className="fmg-row-btn success" onClick={fa.handleUnHide} title="Unhide">
              <Eye size={13} />Unhide
            </button>
          }

          {hasPriv16 && (form.Status === 5 || form.Status === 2) &&
            <Link href={`/dashboard/forms/duplicate/${form.UniqueId}?returnTo=${returnTo}`} className="fmg-row-btn" title="Clone">
              <Copy size={13} />
            </Link>
          }

          {hasPriv5 && (form.Status === 0 || form.Status === 1 || form.Status === 3) &&
            <button className="fmg-row-btn danger" onClick={fa.handleDelete} title="Delete">
              <Trash2 size={13} />
            </button>
          }

          {(form.Status === 5 || form.Status === 3) &&
            <button className="fmg-row-btn assign" onClick={() => setShowAssignModal(true)}>
              <Send size={11} /> Assign
            </button>
          }
          {showAssignModal && <AssignFormModal form={form} onClose={() => setShowAssignModal(false)} />}
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  HELPER: parse interaction types from form field            */
/* ─────────────────────────────────────────────────────────── */

function parseInteractionTypes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [String(parsed)];
  } catch {
    return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
  }
}

function getSectionCount(form) {
  try {
    const formJson = typeof form.formJson === "string" ? JSON.parse(form.formJson) : form.formJson;
    return formJson?.sections?.length ?? 0;
  } catch {
    return 0;
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  SHARED FORM ACTIONS HOOK                                   */
/* ─────────────────────────────────────────────────────────── */

function useFormActions(form) {
  const [basePercentage] = useState(100);

  const calculateQuesMaxScore = (question) => {
    if (!question) return 0;
    let maxPossibleScore = 0;
    try {
      if (["multipleChoice", "fiveRankedList", "twoRankedList", "drpdwn"].includes(question.type)) {
        if (Array.isArray(question.scores) && question.scores.length > 0)
          maxPossibleScore = Math.max(...question.scores.map(Number));
      } else if (question.questionOptionType === "checkboxes") {
        if (Array.isArray(question.options) && Array.isArray(question.scores))
          question.options.forEach((_, i) => { maxPossibleScore += Number(question.scores[i] || 0); });
      } else if (question.type === "shortAnswer" || question.type === "paragraph") {
        maxPossibleScore = Number(question.scores?.[0] || 0);
      }
    } catch (e) { console.error("Error Calculating Question Max Score:", e); }
    return maxPossibleScore;
  };

  const calculateMaxFormScore = (sections, scoringMethod) => {
    let totalScore = 0, questionMaxPosibleScore = 0, length = 0;
    let sublength = 0, sectionCount = 0, subsectionMaxScore = 0, sectionMaxScore = 0;
    try {
      sections.forEach((section) => {
        let hasSubsections = false, sectionScore = 0;
        section.subsections.forEach((subSection) => {
          let hasQuestions = false, subMaxScore = 0;
          subSection.questions.forEach((question) => {
            const q = calculateQuesMaxScore(question);
            questionMaxPosibleScore += q; subMaxScore += q;
            if (question.scorable) length += 1;
            hasQuestions = true;
          });
          if (hasQuestions) { subsectionMaxScore += subMaxScore; sectionScore += subMaxScore; sublength += 1; hasSubsections = true; }
        });
        if (hasSubsections) { sectionMaxScore += sectionScore; sectionCount += 1; }
      });
      switch (scoringMethod) {
        case "Section Sum": totalScore = sectionMaxScore || 0; break;
        case "Section Average": totalScore = sectionMaxScore / sectionCount || 0; break;
        case "Section Percentage": totalScore = questionMaxPosibleScore !== 0 ? basePercentage : 0; break;
        case "Category Sum": totalScore = subsectionMaxScore; break;
        case "Category Average": totalScore = subsectionMaxScore / sublength || 0; break;
        case "Category Percentage": totalScore = questionMaxPosibleScore !== 0 ? basePercentage : 0; break;
        case "Question Sum": totalScore = questionMaxPosibleScore; break;
        case "Question Average": totalScore = questionMaxPosibleScore / length || 0; break;
        case "Question Percentage": totalScore = questionMaxPosibleScore !== 0 ? basePercentage : 0; break;
        default: totalScore = 0; break;
      }
    } catch (e) { console.error("Error calculating Max Form Score:", e); }
    return totalScore;
  };

  const apiPost = async (url, body) => fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
    body: JSON.stringify(body),
  });

  const handleHide = async (e) => {
    e?.preventDefault();
    try {
      const res = await apiPost(`/api/forms/update/${form.formId}`, { Status: 2, currentUserId: getUserFromSession()?.userId ?? null, formName: form.formName, auditAction: "FORM_HIDDEN" });
      const r = await res.json();
      if (res.ok) { alert("Form hidden successfully!"); window.location.reload(); } else alert(`Error hiding form: ${r.message}`);
    } catch (e) { console.error(e); alert("Error hiding form."); }
  };

  const handleUnHide = async (e) => {
    e?.preventDefault();
    try {
      const res = await apiPost(`/api/forms/update/${form.formId}`, { Status: 5, currentUserId: getUserFromSession()?.userId ?? null, formName: form.formName, auditAction: "FORM_UNHIDDEN" });
      const r = await res.json();
      if (res.ok) { alert("Form unhidden successfully!"); window.location.reload(); } else alert(`Error unhiding form: ${r.message}`);
    } catch (e) { console.error(e); alert("Error unhiding form."); }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const formJson = JSON.parse(form.formJson);
    const maxScore = calculateMaxFormScore(formJson.sections, formJson.scoringMethod);
    try {
      const res = await apiPost(`/api/forms/${form.formId}`, {
        sections: formJson.sections, formName: form.formName, formDescription: form.formDescription,
        hideFormScore: formJson.hideFormScore, basePercentage: formJson.basePercentage,
        baselineScore: form.baselineScore, scoringMethod: formJson.scoringMethod,
        selectedInteractionTypes: form.interactiontype,
        visibilityRules: formJson.visibilityRules, scoringRules: formJson.scoringRules,
        disabledOptions: formJson.disabledOptions, Status: 5, currentUserId: getUserFromSession()?.userId ?? null,
        auditAction: "FORM_PUBLISHED", maxScore, header: formJson.header, footer: formJson.footer,
      });
      const r = await res.json();
      if (res.ok) { alert("Form published successfully!"); window.location.reload(); } else alert(`Error publishing form: ${r.message}`);
    } catch (e) { console.error(e); alert("Error publishing form."); }
  };

  const handleStaged = async (e) => {
    e?.preventDefault();
    try {
      const res = await apiPost(`/api/forms/update/${form.formId}`, { Status: 3, currentUserId: getUserFromSession()?.userId ?? null, formName: form.formName, auditAction: "FORM_STAGED" });
      const r = await res.json();
      if (res.ok) { alert("This form is now ready to be mapped to any organization!"); window.location.reload(); } else alert(`Error staging form: ${r.message}`);
    } catch (e) { console.error(e); alert("Error staging form."); }
  };

  const handleUnStaged = async (e) => {
    e?.preventDefault();
    try {
      const res = await apiPost(`/api/forms/update/${form.formId}`, { Status: 1, currentUserId: getUserFromSession()?.userId ?? null, formName: form.formName, auditAction: "FORM_UNSTAGED" });
      const r = await res.json();
      if (res.ok) { alert("Form unstaged successfully!"); window.location.reload(); } else alert(`Error unstaging form: ${r.message}`);
    } catch (e) { console.error(e); alert("Error unstaging form."); }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this form?")) return;
    try {
      const res = await apiPost(`/api/forms/delete/${form.formId}`, { currentUserId: getUserFromSession()?.userId ?? null, formName: form.formName });
      if (!res.ok) { const r = await res.json(); alert(r.message || "Failed to delete form."); return; }
      alert("Form deleted successfully!");
      window.location.reload();
    } catch (e) { console.error(e); alert("An unexpected error occurred. Please try again."); }
  };

  return { handleHide, handleUnHide, handleSubmit, handleStaged, handleUnStaged, handleDelete };
}
function AssignFormModal({ form, onClose }) {
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(true);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    fetchExistingMappings();
    return () => { document.body.style.overflow = ""; };
  }, []);

  const fetchExistingMappings = async () => {
    try {
      const res = await fetch(`/api/forms/Assignform/${form.formId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.mappings?.length > 0) {
        // Pre-select existing orgs in TreeDropdown format { value, label }
        const preSelected = data.mappings.map((m) => ({
          value: m.OrganizationId,
          label: m.OrganizationName,
        }));
        setSelected(preSelected);
      }
    } catch (e) {
      console.error("Error fetching existing mappings:", e);
    } finally {
      setLoadingMappings(false);
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return alert("Please select at least one organization.");
    setSubmitting(true);
    try {
      const user = getUserFromSession();
      const userId = user?.userId ?? null;
      const res = await fetch(`/api/forms/Assignform/${form.formId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          orgIds: selected.map((o) => o.value),
          formId: form.formId,
          currentUserId: userId,
        }),
      });
      if (res.ok) { alert("Form assigned successfully!"); onClose(); }
      else { const r = await res.json(); alert(r.message || "Failed to assign form."); }
    } catch (e) {
      console.error(e); alert("Error assigning form.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div className="fmg-modal-overlay" onClick={onClose}>
      <div className="fmg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fmg-modal-header">
          <div className="fmg-modal-title">
            <Send size={16} /> Assign Form
          </div>
          <button className="fmg-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="fmg-modal-sub">
          <strong>{form.formName}</strong> — select organizations to assign
        </div>
        <div className="fmg-modal-body">
          {loadingMappings ? (
            <div style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0" }}>
              Loading existing assignments…
            </div>
          ) : (
            <TreeDropdown
              isMulti={true}
              usePortalMenu={true}
              onChange={(val) => setSelected(val || [])}
              value={selected}
            />
          )}
        </div>
        <div className="fmg-modal-footer">
          <span className="fmg-modal-count">{selected.length} selected</span>
          <button className="fmg-act-btn" onClick={onClose}>Cancel</button>
          <button className="fmg-act-btn success" onClick={handleSubmit} disabled={submitting || loadingMappings}>
            <Send size={11} /> {submitting ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
/* ─────────────────────────────────────────────────────────── */
/*  FORM CARD (GRID VIEW)                                      */
/* ─────────────────────────────────────────────────────────── */

function FormCard({ form, privileges, basePath }) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const statusInfo = STATUS_MAP[form.Status] ?? STATUS_MAP[0];
  const StatusIcon = statusInfo.Icon;
  const returnTo = encodeURIComponent(basePath);
  const hasPriv5 = privileges.some((p) => p.PrivilegeId === 5);
  const hasPriv7 = privileges.some((p) => p.PrivilegeId === 7);
  const hasPriv16 = privileges.some((p) => p.PrivilegeId === 16);
  const hasPriv17 = privileges.some((p) => p.PrivilegeId === 17);
  const hasPriv18 = privileges.some((p) => p.PrivilegeId === 18);
  const hasPriv19 = privileges.some((p) => p.PrivilegeId === 19);
  const fa = useFormActions(form);

  const timeAgo = formatDistance(new Date(form.Modifydate), new Date(), { includeSeconds: true, addSuffix: true });
  const interactionTypes = parseInteractionTypes(form.InteractionTypeName);

  const sectionCount = getSectionCount(form);

  return (
    <div className="fmg-card">
      <div className={`fmg-card-strip ${statusInfo.stripClass}`} />
      <div className="fmg-card-body">

        {/* Card Head: icon + status pill */}
        <div className="fmg-card-head">
          <div className={`fmg-card-icon ${statusInfo.iconClass}`}>
            <StatusIcon size={16} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: "auto" }}>
            <span className={`fmg-pill ${statusInfo.pillClass}`}>
              <StatusIcon size={10} />
              {statusInfo.label}
            </span>
            {hasPriv5 && (form.Status === 0 || form.Status === 1 || form.Status === 3) &&
              <button className="fmg-act-btn danger" onClick={fa.handleDelete} title="Delete Form">
                <Trash2 size={13} />
              </button>
            }
          </div>
        </div>
        {/* Form Name */}
        <div className="fmg-card-name">{form.formName}</div>

        {/* Meta: creator + time */}
        <div className="fmg-card-meta">
          <span dangerouslySetInnerHTML={{ __html: form.Creationby }} />
          <span className="fmg-card-meta-dot">·</span>
          <span>{timeAgo}</span>
        </div>

        {/* Interaction Type + Section + Points chips */}
        <div className="fmg-card-chips">
          {interactionTypes.map((t) => {
            const { icon: IIcon, color } = getInteractionIcon(t);
            return (
              <span key={t} className="fmg-interaction-chip">
                <IIcon size={10} color={color} /> {t}
              </span>
            );
          })}
          {sectionCount > 0 && (
            <span className="fmg-section-chip">
              <Layers size={10} /> {sectionCount} Section{sectionCount !== 1 ? "s" : ""}
            </span>
          )}
          {form.Max_score != null && form.Max_score !== "" && (
            <span className="fmg-points-chip">
              <Star size={10} /> {form.Max_score} pts
            </span>
          )}
        </div>

        <div className="fmg-card-divider" />

        {/* Actions */}
        <div className="fmg-card-actions">
          {form.Status === 0
            ? <Link href={`/dashboard/forms/builder/${form.UniqueId}?returnTo=${returnTo}`} className="fmg-act-btn primary">
              <Edit2 size={11} /> Edit Form
            </Link>
            : <Link href={`/dashboard/forms/${form.UniqueId}?returnTo=${returnTo}`} className="fmg-act-btn primary">
              <Eye size={11} /> Preview
            </Link>
          }

          {hasPriv7 && (form.Status === 1 || form.Status === 3) &&
            <button className="fmg-act-btn success" onClick={fa.handleSubmit}>
              <Send size={11} /> Publish
            </button>
          }

          {hasPriv18 && form.Status === 1 &&
            <button className="fmg-act-btn" onClick={fa.handleStaged}>
              <Rocket size={11} /> Stage
            </button>
          }

          {hasPriv19 && form.Status === 3 &&
            <button className="fmg-act-btn warn" onClick={fa.handleUnStaged}>
              <ArchiveX size={11} /> Unstage
            </button>
          }

          {hasPriv17 && form.Status === 5 &&
            <button className="fmg-act-btn warn" onClick={fa.handleHide}>
              <EyeOff size={11} /> Hide
            </button>
          }

          {hasPriv17 && form.Status === 2 &&
            <button className="fmg-act-btn success" onClick={fa.handleUnHide}>
              <Eye size={11} /> Unhide
            </button>
          }

          {hasPriv16 && (form.Status === 5 || form.Status === 2) &&
            <Link href={`/dashboard/forms/duplicate/${form.UniqueId}?returnTo=${returnTo}`} className="fmg-act-btn">
              <Copy size={11} /> Clone
            </Link>
          }

          {(form.Status === 5 || form.Status === 3) &&
            <button className="fmg-act-btn assign" onClick={() => setShowAssignModal(true)}>
              <Send size={11} /> Assign
            </button>
          }
          {showAssignModal && <AssignFormModal form={form} onClose={() => setShowAssignModal(false)} />}
        </div>
      </div>
    </div>
  );
}

export default withAuth(FormsPage);