
"use client";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "../lib/msalConfig";

const msalInstance = new PublicClientApplication(msalConfig);

export default function Providers({ children }) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
