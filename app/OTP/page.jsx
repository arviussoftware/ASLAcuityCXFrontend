// app/OTP/page.jsx

export const dynamic = "force-dynamic"; // ✅ force this page to be dynamic, never SSG

import OTPClient from "./OTPClient";

export default function OTPPage() {
  return <OTPClient />;
}
