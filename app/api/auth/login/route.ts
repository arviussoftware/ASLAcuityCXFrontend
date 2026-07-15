import { NextResponse } from "next/server";
import { saml } from "@/lib/saml";

export const runtime = "nodejs";

export async function GET() {
  try {
    const loginUrl = await saml.getAuthorizeUrlAsync("", undefined, {});

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to generate SAML login URL" },
      { status: 500 }
    );
  }
}