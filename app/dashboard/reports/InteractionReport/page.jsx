// app/dashboard/reports/InteractionReport/page.jsx

// app/dashboard/reports/InteractionReport/page.jsx
"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import withAuth from "@/components/withAuth";
import InteractionPage from "@/app/dashboard/interactions/page";

function InteractionReport() {
  const searchParams = useSearchParams();
  const backHref = `/dashboard/reports?tab=${searchParams?.get("tab") || "interactions"}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-1 shrink-0">
        <Link href={backHref}>
          <Button size="sm" className="h-6 w-6 p-0">
            <ChevronLeft className="h-3 w-3" />
          </Button>
        </Link>
        <h1 className="text-sm font-semibold">Interaction Report</h1>
      </div>

      {/* Content */}
      <InteractionPage />
    </div>
  );
}

export default withAuth(InteractionReport);
