// app/dashboard/users/add/page.jsx
"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { HiMiniInformationCircle } from "react-icons/hi2";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import withAuth from "@/components/withAuth";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import AddUserPageContent from "./AddUserPageContent";
import AddBulkUserPage from "./AddBulkUserpage";
import { useSearchParams } from "next/navigation";

const AddUserPage = () => {
  const router = useRouter();
  const submitRef = useRef(null);
  const discardRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false); // ADD THIS

  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode"); // "single" | "bulk"

  // null = selection screen
  const [mode, setMode] = useState(initialMode);
  const [helpOpen, setHelpOpen] = useState(false);
  // const [hovered, setHovered] = useState(null); // "single" | "bulk" | null

  return (
    <div className="p-4">
      <div className="min-w-[640px] mx-auto grid max-w-[90rem] gap-4 px-4">
        {/* ================= HEADER ================= */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shadow-md"
            onClick={() => router.push("/dashboard/users")}
            style={{
              backgroundColor: "var(--brand-primary)",
              color: "#ffffff",
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <h1 className="text-lg font-semibold tracking-tight">
            {mode === "single"
              ? "Add Single User"
              : mode === "bulk"
                ? "Bulk User Upload"
                : "Select User Creation Type"}
          </h1>

          {/* right side */}
          <div className="ml-auto flex items-center gap-3">
            {/* Single mode buttons */}
            {mode === "single" && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isSaving} // ADD THIS
                  onClick={() => discardRef.current?.click()}
                >
                  Discard
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving} // ADD THIS
                  onClick={() => submitRef.current?.click()}
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  {isSaving ? "Saving..." : "Save User"} {/* CHANGE THIS */}
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="text-slate-500 hover:text-[var(--brand-primary)]"
            >
              <HiMiniInformationCircle className="h-7 w-7 ml-auto cursor-pointer text-blue-500 hover:text-blue-600" />
            </button>
          </div>
        </div>

        {/* ================= FULL SCREEN VIEW ================= */}
        {mode && (
          <Card className="shadow-md mt-4">
            <CardContent className="p-6">
              {mode === "single" ? (
                <AddUserPageContent
                  onSuccess={() => router.push("/dashboard/users")}
                  onCancel={() => setMode(null)}
                  submitRef={submitRef}
                  discardRef={discardRef}
                  hideFooterButtons={true}
                  onSubmittingChange={setIsSaving} // ADD THIS
                />
              ) : (
                <AddBulkUserPage
                  onSuccess={() => router.push("/dashboard/users")}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto pr-2" aria-describedby={undefined}>
          <DialogTitle className="text-sm font-semibold">
            {mode === "single"
              ? "Single User Information"
              : "Bulk User Upload Information"}
          </DialogTitle>

          <div className="text-xs text-muted-foreground space-y-2 mt-2">
            {mode === "single" ? (
              <>
                <p className="font-medium text-slate-700">Mandatory Fields</p>
                <p>• User Name is required.</p>
                <p>• First Name is required.</p>
                <p>• Last Name is required.</p>
                <p>• Organization selection is required.</p>

                <p className="font-medium text-slate-700 mt-3">
                  Field Validation Rules
                </p>
                <p>• User Name: Minimum 3 characters, Maximum 50 characters.</p>
                <p>
                  • Email: Optional, Maximum 50 characters, must be in valid
                  email format.
                </p>
                <p>
                  • First Name: Minimum 3 characters, Maximum 100 characters.
                </p>
                <p>• Middle Name: Optional, Maximum 100 characters.</p>
                <p>
                  • Last Name: Minimum 3 characters, Maximum 100 characters.
                </p>
                <p>• Phone: Optional, must be exactly 10 digits.</p>
                <p>
                  • Address: Optional, Maximum 512 characters. URLs are not
                  allowed.
                </p>

                <p className="font-medium text-slate-700 mt-3">
                  Organization & Role Mapping
                </p>
                <p>• Roles are loaded only after selecting an organization.</p>
                <p>
                  • Roles shown are mapped to the selected organization and all
                  its parent organizations.
                </p>
                <p>• Child organization roles are not included.</p>
                <p>
                  • If no role is selected, Agent role is automatically selected
                  (if available).
                </p>
                <p>• Agent role cannot be combined with other roles.</p>
                <p>• Agent users can belong to only one organization.</p>

                <p className="font-medium text-slate-700 mt-3">Other Rules</p>
                <p>• Super Admin roles are hidden for non-super admin users.</p>
                <p>• Duplicate username/email is not allowed.</p>
              </>
            ) : (
              <>
                <p className="font-medium text-slate-700">File Requirements</p>
                <p>• Only .xlsx and .csv files are supported.</p>
                <p>• Use the provided template format only.</p>
                <p>
                  • Required columns: userName, firstName, middleName, lastName,
                  email, phone, userAddress
                </p>

                <p className="font-medium text-slate-700 mt-3">
                  Mandatory Fields Per Row
                </p>
                <p>• User Name is required.</p>
                <p>• First Name is required.</p>
                <p>• Last Name is required.</p>

                <p className="font-medium text-slate-700 mt-3">
                  Field Validation Rules
                </p>
                <p>• User Name: Maximum 50 characters.</p>
                <p>
                  • Email: Optional, Maximum 50 characters, valid email format.
                </p>
                <p>• First Name: Maximum 100 characters.</p>
                <p>• Middle Name: Optional, Maximum 100 characters.</p>
                <p>• Last Name: Maximum 100 characters.</p>
                <p>• Phone: Optional, exactly 10 digits.</p>
                <p>
                  • Address: Optional, Maximum 512 characters. URLs are not
                  allowed.
                </p>

                <p className="font-medium text-slate-700 mt-3">
                  Organization & Role Mapping
                </p>
                <p>• Organization selection is mandatory before upload.</p>
                <p>• Roles are loaded after selecting organization(s).</p>
                <p>
                  • Roles shown are mapped to selected organizations and their
                  parent organizations only.
                </p>
                <p>• Child organization roles are not included.</p>
                <p>
                  • If no role is selected, Agent role is automatically assigned
                  (if available).
                </p>
                <p>• Agent role cannot be combined with other roles.</p>
                <p>• Agent users can belong to only one organization.</p>

                <p className="font-medium text-slate-700 mt-3">
                  Upload Validation
                </p>
                <p>• Duplicate usernames inside the file are not allowed.</p>
                <p>• Duplicate emails inside the file are not allowed.</p>
                <p>• Existing usernames/emails in system will be rejected.</p>
                <p>• Failed rows can be downloaded as an error report.</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default withAuth(AddUserPage);
