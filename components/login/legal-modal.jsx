"use client";

import { useEffect, useMemo, useState } from "react";
import {
  legalContent,
  supportCategories,
  supportOptions,
} from "@/components/login/legal-content";

export default function LegalModal({ activeModal, onClose }) {
  const [supportForm, setSupportForm] = useState({
    name: "",
    email: "",
    type: "",
    description: "",
  });

  useEffect(() => {
    if (!activeModal) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeModal, onClose]);

  const modalMeta = useMemo(() => {
    if (!activeModal || activeModal === "support") return null;
    return legalContent[activeModal];
  }, [activeModal]);

  if (!activeModal) return null;

  const handleSupportSubmit = () => {
    const { name, email, type, description } = supportForm;

    if (!name || !email || !type || !description) {
      alert("Please complete all fields before submitting.");
      return;
    }

    alert(
      `Thank you, ${name}. Your support request has been submitted. You will receive a confirmation at ${email} shortly.`,
    );
    setSupportForm({
      name: "",
      email: "",
      type: "",
      description: "",
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,12,28,0.75)] px-5 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[82vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between bg-[linear-gradient(90deg,#0d2244_0%,#1a3a6e_100%)] px-5 py-4 sm:px-7 sm:py-5">
          <h2 className="text-[17px] font-bold tracking-[0.2px] text-white">
            {activeModal === "support" ? "Support" : modalMeta?.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg leading-none text-white transition hover:bg-white/30"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 text-[13.5px] leading-7 text-[#2d3748] sm:px-[30px] sm:py-7">
          {activeModal === "support" ? (
            <div>
              <h3 className="text-[15px] font-bold text-[#0d2244]">
                How Can We Help?
              </h3>
              <p className="mt-2">
                Our support team is available to assist with technical issues,
                account management, billing enquiries, and general questions
                about the AcuityCx Platform.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {supportOptions.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-4 py-[14px] text-center"
                  >
                    <strong className="block text-[13px] text-[#0d2244]">
                      {item.label}
                    </strong>
                    <span className="mt-1 block text-xs text-[#718096]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="mt-7 text-[15px] font-bold text-[#0d2244]">
                Submit a Support Request
              </h3>
              <div className="mt-4 space-y-[14px]">
                <div>
                  <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={supportForm.name}
                    onChange={(event) =>
                      setSupportForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Your full name"
                    className="h-[42px] w-full rounded-[8px] border-[1.5px] border-[#d1d9e6] bg-[#fafbfc] px-3 text-[13.5px] text-[#1a2744] outline-none transition focus:border-[#20b2aa]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={supportForm.email}
                    onChange={(event) =>
                      setSupportForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@company.com"
                    className="h-[42px] w-full rounded-[8px] border-[1.5px] border-[#d1d9e6] bg-[#fafbfc] px-3 text-[13.5px] text-[#1a2744] outline-none transition focus:border-[#20b2aa]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]">
                    Issue Type
                  </label>
                  <select
                    value={supportForm.type}
                    onChange={(event) =>
                      setSupportForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="h-[42px] w-full rounded-[8px] border-[1.5px] border-[#d1d9e6] bg-[#fafbfc] px-3 text-[13.5px] text-[#1a2744] outline-none transition focus:border-[#20b2aa]"
                  >
                    <option value="">Select a category...</option>
                    {supportCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]">
                    Description
                  </label>
                  <textarea
                    value={supportForm.description}
                    onChange={(event) =>
                      setSupportForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Please describe your issue in detail..."
                    className="min-h-[90px] w-full resize-y rounded-[8px] border-[1.5px] border-[#d1d9e6] bg-[#fafbfc] px-3 py-[9px] text-[13.5px] text-[#1a2744] outline-none transition focus:border-[#20b2aa]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSupportSubmit}
                  className="flex h-11 w-full items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,#0d2244_0%,#1a3a6e_100%)] px-4 text-[13.5px] font-semibold text-white transition hover:opacity-95"
                >
                  Submit Request
                </button>
              </div>

              <h3 className="mt-7 text-[15px] font-bold text-[#0d2244]">
                Self-Service Resources
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>
                  <strong>Knowledge Base</strong> - Searchable articles and
                  how-to guides
                </li>
                <li>
                  <strong>Video Tutorials</strong> - Step-by-step walkthroughs
                  for key features
                </li>
                <li>
                  <strong>Release Notes</strong> - Latest updates and feature
                  announcements
                </li>
                <li>
                  <strong>API Documentation</strong> - Developer reference and
                  integration guides
                </li>
                <li>
                  <strong>Community Forum</strong> - Connect with other
                  AcuityCx users
                </li>
              </ul>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: modalMeta?.body || "" }} />
          )}
        </div>

        <div className="border-t border-[#e5eaf0] bg-[#f8fafc] px-5 py-4 text-right sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] bg-[linear-gradient(135deg,#0d2244_0%,#1a3a6e_100%)] px-7 py-2.5 text-[13.5px] font-semibold text-white transition hover:opacity-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
