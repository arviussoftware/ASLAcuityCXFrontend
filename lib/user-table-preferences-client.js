"use client";

import { getSessionUserId } from "@/lib/session-user";

export async function loadUserTablePreference(pageKey) {
  const userId = getSessionUserId();

  if (!userId) {
    return null;
  }

  const response = await fetch(
    `/api/user-table-preferences?userId=${userId}&pageKey=${pageKey}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
      },
      credentials: "include",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result?.preference || null;
}

export async function saveUserTablePreference(pageKey, preference) {
  const userId = getSessionUserId();

  if (!userId) {
    return false;
  }

  const response = await fetch("/api/user-table-preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
    },
    credentials: "include",
    body: JSON.stringify({
      userId,
      pageKey,
      preference,
    }),
  });

  return response.ok;
}
