import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { PlusCircle, User, Upload } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const CreateBtn = ({ basePath }) => {
  const { replace } = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const targetBase = basePath || pathname;

  const handleSelect = (type) => {
    setOpen(false);
    replace(`${targetBase}/add?mode=${type}`);
  };

  // 👉 close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] h-7 px-3 gap-1 text-xs shadow-sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        <PlusCircle className="h-4 w-4" />
        <span>Create New</span>
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* HEADER */}
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b bg-gray-50">
            Create User
          </div>

          {/* OPTIONS */}
          <button
            onClick={() => handleSelect("single")}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 transition"
          >
            <User className="h-4 w-4 text-gray-500" />
            Single User
          </button>

          <button
            onClick={() => handleSelect("bulk")}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 transition"
          >
            <Upload className="h-4 w-4 text-gray-500" />
            Bulk Upload
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateBtn;
