import { redirect } from "next/navigation";

export default async function ReportsCombinedRedirect({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams?.tab;
  redirect(tab ? `/dashboard/reports?tab=${tab}` : "/dashboard/reports");
}
