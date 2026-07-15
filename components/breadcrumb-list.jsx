 "use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";

const breadcrumbNameMap = {
  QMagent:"Dashboard",
  dashboard1: "Dashboard",
  users: "Users",
  interactions: "Interactions",
  forms: "Form Management",
  builder: "Form Management",
  agentOrganization: "Agent Organization",
  organization: "Organization",
  roleManagement: "Role Management",
  Management_combined_page: "User Management",
};

const BreadCrumbListWrapper = () => {
  const pathname = usePathname();
  const pathnames = pathname?.split("/").filter((x) => x);
  const secondPathname = pathnames?.[1];
  return (
    <>
      {secondPathname && (
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <div className="contents">
              <BreadcrumbItem>
                {/* Use span to make the breadcrumb unclickable */}
                <span className="capitalize">
                  {breadcrumbNameMap[secondPathname] || secondPathname}
                </span>
              </BreadcrumbItem>
            </div>
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </>
  );
};

export default BreadCrumbListWrapper;
