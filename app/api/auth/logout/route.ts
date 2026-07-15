import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let logoutUrl = process.env.SAML_LOGOUT_URL;
  const baseUrl = new URL(request.url).origin;
  const redirectUri = `${baseUrl}/`;

  if (logoutUrl && logoutUrl.endsWith("/saml2")) {
    // Convert SAML endpoint to Microsoft generic OAuth2 sign-out endpoint to avoid AADSTS750054
    logoutUrl = logoutUrl.replace("/saml2", "/oauth2/v2.0/logout");
  }

  let destination = `${baseUrl}/`;
  if (logoutUrl) {
    destination = `${logoutUrl}?post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  const response = NextResponse.redirect(destination);
  response.cookies.delete("user");
  return response;
}
