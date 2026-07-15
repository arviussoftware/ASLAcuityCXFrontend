"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import "./Styles/Sidebar.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DynamicForm = dynamic(() => import("@/components/dynamicForm"), { ssr: false });
const SubmittedForm = dynamic(() => import("./show-SubmittedForm"), { ssr: false });
import withAuth from "@/components/withAuth";
import CryptoJS from "crypto-js";
import { FileText } from "lucide-react";
import { useRef } from "react";
import { AudioPlayer } from "@/components/audio-player";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

const IterationToolbar = ({
  formData,
  Status,
  audioUrl,
  audioFetching = false,
  fileExtension,
  audioError,
  sttGenerating = false,
  sttError = null,
  sttStatus = null,
  transcriptionMode = null,
  grantedPrivileges,
  onBack,
  downloadNode,
  onRetryTranscription,
  stableTranscriptionPath = null, // stable, never reverts to null once set for an interaction
  archiveStatus = null,
  onRetrieve,
  showTranscription = false,
}) => {
  const [assignedForms, setAssignedForms] = useState([]);
  const [submittedForms, setsubmittedForms] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [form, setForm] = useState(null);
  const [privileges, setPrivileges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmiteedOpen, setIsSubmiteedOpen] = useState(false);
  // "audio" = audio panel full width, "form" = form panel full width, null = 50/50
  const [expandedPanel, setExpandedPanel] = useState(null);
  const toggleExpandAudio = () => setExpandedPanel((p) => p === "audio" ? null : "audio");
  const toggleExpandForm = () => setExpandedPanel((p) => p === "form" ? null : "form");
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [formType, setFormType] = useState(null);
  const [formStructureOpen, setFormStructureOpen] = useState(false);
  const formRef = useRef(null);
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => {
    if (
      formRef.current &&
      selectedForm &&
      form &&
      !hasAutoScrolledRef.current
    ) {
      setTimeout(() => {
        if (expandedPanel !== "form") {
          formRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          hasAutoScrolledRef.current = true; // 🔒 lock it
        }
      }, 300);
    }
  }, [selectedForm, formType, expandedPanel]);

  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
    fetchPrivilege();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const fetchFormById = async (UniqueId, assignedFormId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/forms/${UniqueId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const formData = data.forms[0];
        if (formData) {
          const parsedFormJson = JSON.parse(formData.formJson);

          const currentTimestamp = new Date();
          setForm({
            ...formData,
            formJson: parsedFormJson,
            assignedFormId,
            timestamp: currentTimestamp,
          });
          setSelectedForm(formData);
          setFormType("evaluation");
        }
      } else {
        console.error("Error fetching form:", data.message);
      }
    } catch (error) {
      console.error("Error fetching form:", error);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleCloseForm = () => {
    setSelectedForm(null);
    setForm(null);
    setFormType(null);
    setExpandedPanel(null);
    setFormStructureOpen(false);
    hasAutoScrolledRef.current = false; // 🔓 allow next open
  };

  const viewSubmission = async (UniqueId) => {
    setLoading(true);
    try {
      const encryptedUserData = sessionStorage.getItem("user");

      let loggedInUserId = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          loggedInUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      if (!loggedInUserId) {
        console.error("User not logged in.");
        return;
      }

      const response = await fetch(
        `/api/interactions/submittedform/${UniqueId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: loggedInUserId,
            interactionId: formData.id,
            orgIds: getSelectedOrgIdsHeader(),
          },
        },
      );

      const data = await response.json();
      if (response.ok) {
        // Access the first form from the data array
        const formData = data.data[0]; // Change from data.forms[0] to data.data[0]

        if (formData) {
          setForm({
            ...formData,
            ansFormJson: formData.ansFormJson, // No need to parse, just assign the object
          });
        }
        setSelectedForm(formData);
        setFormType("submitted");
      } else {
        console.error("Error fetching form:", `${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching form:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedForms = async () => {
    setLoading(true);
    try {
      let loggedInUserId = null;
      const encryptedUserData = sessionStorage.getItem("user");
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          loggedInUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        loggedInUserId: loggedInUserId,
      };

      // Fetch the form data
      const res = await fetch(`/api/interactions/mappedform/${formData.id}`, {
        method: "GET",
        headers: headers,
      });

      // Check if the response is not OK before parsing JSON
      if (!res.ok) {
        setFetchError("No assigned forms available for this interaction.");
        return; // keep existing assignedForms — don't clear
      }

      // Parse the JSON response if the status code is OK
      const result = await res.json();

      // Check the message for no assigned forms
      if (result.message === "Record Not Found.") {
        setFetchError("No assigned forms available for this interaction.");
        setAssignedForms([]);
        return;
      }

      // Set the assigned forms if the request was successful
      setAssignedForms(result.mappedForm);
    } catch (error) {
      // Log the error
      console.error("Failed to fetch assigned forms:", error);
      setFetchError("An error occurred while fetching assigned forms.");
    } finally {
      setLoading(false);
    }
  };
  const fetchSubmittedForms = async () => {
    setLoading(true);
    try {
      let loggedInUserId = null;
      const encryptedUserData = sessionStorage.getItem("user");
      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          loggedInUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        loggedInUserId: loggedInUserId,
      };

      // Fetch the form data
      const res = await fetch(
        `/api/interactions/submittedformddl/${formData.id}`,
        {
          method: "GET",
          headers: headers,
        },
      );

      if (!res.ok) {
        setFetchError("No assigned forms available for this interaction.");
        return; // keep existing submittedForms — don't clear
      }

      // Parse the JSON response if the status code is OK
      const result = await res.json();
      // Check the message for no assigned forms
      if (result.message === "Record Not Found.") {
        setFetchError("No assigned forms available for this interaction.");
        setsubmittedForms([]);
        return;
      }

      // Set the assigned forms if the request was successful
      setsubmittedForms(result.mappedForm);
    } catch (error) {
      // Log the error
      console.error("Failed to fetch assigned forms:", error);
      setFetchError("An error occurred while fetching assigned forms.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivilege = async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }

      const response = await fetch(`/api/privileges`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          moduleId: 6, // Users module
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
      });

      if (!response.ok) throw new Error("Failed to fetch privileges");
      const data = await response.json();

      setPrivileges(data.privileges || []);
      setPrivilegesLoaded(true);
    } catch (err) {
      console.error("Error fetching privileges:", err);
      setPrivilegesLoaded(true); // Still mark as loaded to avoid indefinite loading
    }
  };

  if (!formData) {
    return null;
  }
  const encryptedUserData = sessionStorage.getItem("user");

  let licensedModules = null;
  if (encryptedUserData) {
    try {
      // Decrypt the data
      const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

      // Parse JSON
      const user = JSON.parse(decryptedData);
      licensedModules = user?.licensedModules || null;
    } catch (error) {
      console.error("Error decrypting user data:", error);
    }
  }
  const hasModule5 = licensedModules?.includes(5);
  const hasPrivilegeEight = privileges.some((p) => p.PrivilegeId === 8);
  const hasPrivilegeNine = privileges.some((p) => p.PrivilegeId === 9);

  if (!privilegesLoaded && !grantedPrivileges?.length) return null;

  // Use grantedPrivileges (from page, module=INTERACTION) for audio gate
  // Use local privileges (module=6) for form buttons
  const canViewAudio = grantedPrivileges.some((p) => p.PrivilegeId === 1) || hasPrivilege(1);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2 ml-auto">
          {hasModule5 && hasPrivilegeEight && (
            <DropdownMenu open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) fetchAssignedForms(); }}>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-7 px-3 gap-1.5 shadow-md rounded-lg font-medium transition-all duration-200 text-xs">
                  <FileText className="w-3.5 h-3.5" /> Evaluation Forms
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2 shadow-lg border rounded-lg bg-card flex flex-col">
                <div className="flex-grow overflow-y-auto max-h-60 scrollable-content">
                  {loading ? (
                    <DropdownMenuItem disabled className="text-muted-foreground text-center py-2 text-xs">Loading...</DropdownMenuItem>
                  ) : Array.isArray(assignedForms) && assignedForms.length > 0 ? (
                    assignedForms.map((f) => (
                      <DropdownMenuItem
                        key={f.formId}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-primary/10 transition-all duration-200 cursor-pointer ${selectedForm?.formId === f.formId ? "bg-primary/20" : ""}`}
                        onClick={() => fetchFormById(f.UniqueId, f.id)}
                      >{f.formName}</DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled className="text-muted-foreground text-center py-2">No forms available</DropdownMenuItem>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {hasModule5 && hasPrivilegeNine && (
            <DropdownMenu open={isSubmiteedOpen} onOpenChange={(open) => { setIsSubmiteedOpen(open); if (open) fetchSubmittedForms(); }}>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-7 px-3 gap-1.5 shadow-md rounded-lg font-medium transition-all duration-200 text-xs">
                  <FileText className="w-3.5 h-3.5" /> Submitted Forms
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2 shadow-lg border rounded-lg bg-card flex flex-col">
                <div className="flex-grow overflow-y-auto max-h-60 scrollable-content">
                  {loading ? (
                    <DropdownMenuItem disabled className="text-muted-foreground text-center py-2 text-xs">Loading...</DropdownMenuItem>
                  ) : submittedForms.length > 0 ? (
                    submittedForms.map((f) => (
                      <DropdownMenuItem
                        key={f.formId}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-primary/10 transition-all duration-200 cursor-pointer ${selectedForm?.formId === f.formId ? "bg-primary/20" : ""}`}
                        onClick={() => viewSubmission(f.UniqueId)}
                      >{f.formName}</DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled className="text-muted-foreground text-center py-2">No forms available</DropdownMenuItem>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className={`flex-1 min-h-0 ${selectedForm ? "flex items-stretch gap-0" : "flex flex-col"}`}>
        <div className={`${selectedForm
          ? expandedPanel === "form"
            ? "hidden"
            : expandedPanel === "audio"
              ? "w-full"
              : formStructureOpen
                ? "w-1/3 pr-2"
                : "w-1/2 pr-2"
          : "w-full"
          } flex flex-col transition-all duration-300 min-h-0 h-full`}>
          {canViewAudio ? (
            <AudioPlayer
              AURL={audioUrl}
              audioFetching={audioFetching}
              audioError={audioError}
              fileExtension={fileExtension}
              filePath={formData.fileLocation || formData.file_location}
              fileSourceType={formData.fileSourceType || formData.file_source_type}
              transcriptionFilePath={
                // Use stable path (never null once set) to prevent layout flip
                stableTranscriptionPath ||
                formData.transcriptionfilepath ||
                formData.transcription_file_path ||
                null
              }
              transcriptionSourceType={formData.transcription_source_type || null}
              transcriptionMode={transcriptionMode}
              interactionId={formData.id}
              callData={formData}
              grantedPrivileges={grantedPrivileges}
              onExpand={selectedForm ? toggleExpandAudio : undefined}
              isAudioExpanded={expandedPanel === "audio"}
              formOpen={true}
              sttGenerating={sttGenerating}
              sttError={sttError}
              sttStatus={sttStatus}
              onRetryTranscription={onRetryTranscription}
              archiveStatus={archiveStatus}
              onRetrieve={onRetrieve}
              showTranscription={showTranscription}
              onBack={onBack}
              downloadNode={downloadNode}
            />
          ) : (
            <p className="text-xs text-muted-foreground p-4">Loading audio components...</p>
          )}
        </div>

        {selectedForm && (
          <div key={`${form?.UniqueId}-${formType}`} className={`transition-all duration-300 border border-border animate-form-open flex flex-col h-full min-h-0 ${expandedPanel === "audio"
            ? "hidden"
            : expandedPanel === "form"
              ? "w-full"
              : formStructureOpen
                ? "w-2/3"
                : "w-1/2"
            }`} style={{ overflowY: "auto", overflowX: "hidden", borderRadius: "10px" }}>
            {formType === "evaluation" && form && (
              <>
                <DynamicForm
                  UniqueId={form.UniqueId}
                  formId={form.formId}
                  interactionId={formData.id}
                  status={form.Status}
                  sections={form.formJson.sections}
                  formName={form.formName}
                  formDescription={form.formDescription}
                  sectionDetails={form.formJson.sections.map((s) => s.sectionDetails)}
                  sectionDescription={form.formJson.sections.map((s) => s.sectionDescription)}
                  visibilityRules={form.formJson.visibilityRules}
                  scoringRules={form.formJson.scoringRules}
                  scoringMethod={form.formJson.scoringMethod}
                  QuestionInstructions={false}
                  hideFormScore={form.formJson.hideFormScore}
                  basePercentage={form.formJson.basePercentage}
                  baselineScore={form.baselineScore}
                  timestamp={form.timestamp}
                  header={form.formJson.header}
                  footer={form.formJson.footer}
                  onClose={handleCloseForm}
                  isFullscreen={expandedPanel === "form"}
                  setIsFullscreen={toggleExpandForm}
                  onStructureToggle={setFormStructureOpen}
                />
              </>
            )}
            {formType === "submitted" && form && (
              <>
                <SubmittedForm
                  UniqueId={form.UniqueId}
                  formId={form.formId}
                  interactionId={formData.id}
                  sections={form.ansFormJson.sections}
                  formName={form.formName}
                  formDescription={form.formDescription}
                  sectionDetails={form.ansFormJson.sections.map((s) => s.sectionDetails)}
                  sectionDescription={form.ansFormJson.sections.map((s) => s.sectionDescription)}
                  visibilityRules={form.ansFormJson.visibilityRules}
                  scoringRules={form.ansFormJson.scoringRules}
                  scoringMethod={form.ansFormJson.scoringMethod}
                  QuestionInstructions={false}
                  hideFormScore={form.ansFormJson.hideFormScore}
                  basePercentage={form.ansFormJson.basePercentage}
                  baselineScore={form.baselineScore}
                  totalformScore={form.ansFormJson.totalScore}
                  timestamp={form.timestamp}
                  header={form.ansFormJson.header}
                  footer={form.ansFormJson.footer}
                  evaluator={form.user_full_name}
                  onClose={handleCloseForm}
                  isFullscreen={expandedPanel === "form"}
                  setIsFullscreen={toggleExpandForm}
                  onStructureToggle={setFormStructureOpen}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default withAuth(IterationToolbar);
