import { SAML } from "@node-saml/node-saml";

export const saml = new SAML({
  issuer: process.env.SAML_ISSUER,
  callbackUrl: process.env.SAML_CALLBACK_URL,
  entryPoint: process.env.SAML_ENTRY_POINT,

  // IMPORTANT
  idpCert: process.env.SAML_CERT,

  identifierFormat: undefined,
  wantAssertionsSigned: true,
  wantAuthnResponseSigned: false,
  disableRequestedAuthnContext: true,
});
