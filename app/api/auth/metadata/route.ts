import { NextResponse } from "next/server";
import { saml } from "@/lib/saml";

export const runtime = "nodejs";

export async function GET() {
  try {
    const metadata = saml.generateServiceProviderMetadata(null, null);

    console.log(metadata);
    return new NextResponse(metadata, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to generate SAML metadata" },
      { status: 500 }
    );
  }
}
