import { NextResponse } from "next/server";
import { saml } from "@/lib/saml";


export const runtime = "nodejs";

function extractClaims(profile: any) {
  const claims: Record<string, string> = {};

  // Standard properties
  if (profile.nameID) claims["Name ID"] = profile.nameID;
  if (profile.issuer) claims["Issuer"] = profile.issuer;
  if (profile.sessionIndex) claims["Session Index"] = profile.sessionIndex;
  if (profile.nameIDFormat) claims["NameID Format"] = profile.nameIDFormat;

  // Iterate over all other properties
  for (const [key, value] of Object.entries(profile)) {
    if (
      typeof value === "function" ||
      key === "getAssertionXml" ||
      key === "getAssertion" ||
      key === "getSamlResponseXml"
    ) {
      continue;
    }

    if (typeof value === "string") {
      // Simplify common Microsoft/schemas URIs if matched
      if (key.includes("claims/givenname")) {
        claims["Given Name"] = value;
      } else if (key.includes("claims/surname")) {
        claims["Surname"] = value;
      } else if (key.includes("claims/emailaddress")) {
        claims["Email Address"] = value;
      } else if (key.includes("claims/name") && !key.includes("nameidentifier") && !key.includes("givenname")) {
        claims["User Principal Name (UPN)"] = value;
      } else if (key.includes("claims/displayname")) {
        claims["Display Name"] = value;
      } else if (key.includes("claims/tenantid")) {
        claims["Tenant ID"] = value;
      } else if (key.includes("claims/identityprovider")) {
        claims["Identity Provider"] = value;
      } else if (key.includes("claims/objectidentifier")) {
        claims["Object ID"] = value;
      } else {
        const label = key.includes("/") ? key.split("/").pop() || key : key;
        claims[label] = value;
      }
    } else if (Array.isArray(value)) {
      const label = key.includes("/") ? key.split("/").pop() || key : key;
      claims[label] = value.join(", ");
    }
  }

  return claims;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const SAMLResponse = formData.get("SAMLResponse") as string;
    const RelayState = (formData.get("RelayState") as string) || "";

    if (!SAMLResponse) {
      console.error("Missing SAMLResponse in POST body");
      return NextResponse.json(
        { error: "Missing SAMLResponse in callback payload" },
        { status: 400 }
      );
    }

    const { profile } = await saml.validatePostResponseAsync({
      SAMLResponse,
      RelayState,
    });

    if (!profile) {
      console.error("SAML validation succeeded but profile is null");
      return NextResponse.json(
        { error: "Invalid SAML assertion" },
        { status: 401 }
      );
    }

    const claims = extractClaims(profile);

    const email = profile.email || profile.mail || (profile["urn:oid:0.9.2342.19200300.100.1.3"] as string) || claims["Email Address"] || "";



    // Redirect to home page and store user details in a cookie.
    // We use a 303 (See Other) redirect so the browser uses a GET request for the next page.
    const redirectUrl = new URL("/", request.url);
    if (email) {
      redirectUrl.searchParams.set("samlEmail", email);
    }
    const response = NextResponse.redirect(redirectUrl, {
      status: 303,
    });

    response.cookies.set(
      "user",
      JSON.stringify({
        nameID: profile.nameID,
        email,
        name: (profile.displayName as string) || (profile.name as string) || claims["Display Name"] || claims["User Principal Name (UPN)"] || profile.nameID,
        issuer: profile.issuer,
        claims: claims,
      }),
      {
        path: "/",
        httpOnly: false, // Let client/server components read it easily
        maxAge: 60 * 60 * 24, // 1 day
        sameSite: "lax",
      }
    );

    return response;
  } catch (error) {
    console.error("SAML Validation Error:", error);
    return NextResponse.json(
      {
        error: "SAML validation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
