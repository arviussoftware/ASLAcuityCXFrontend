import { SAML } from "@node-saml/node-saml";

// Lazy creator to prevent compile-time initialization crash in container builds
function createSamlInstance() {
  const issuer = process.env.SAML_ISSUER;
  const callbackUrl = process.env.SAML_CALLBACK_URL;
  const entryPoint = process.env.SAML_ENTRY_POINT;
  const idpCert = process.env.SAML_CERT;

  // Validate only at runtime, not build-time
  if (!issuer || !callbackUrl || !entryPoint || !idpCert) {
    throw new Error("Missing required SAML configuration variables (SAML_ISSUER, SAML_CALLBACK_URL, SAML_ENTRY_POINT, SAML_CERT)");
  }

  return new SAML({
    issuer,
    callbackUrl,
    entryPoint,
    idpCert,
    identifierFormat: undefined,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    disableRequestedAuthnContext: true,
  });
}

// Export a proxy wrapper so that it acts as a singleton but initializes lazily at runtime
let samlInstance = null;
/** @type {any} */
const proxyInstance = new Proxy({}, {
  get(target, prop) {
    if (!samlInstance) {
      samlInstance = createSamlInstance();
    }
    const val = Reflect.get(samlInstance, prop);
    if (typeof val === "function") {
      return val.bind(samlInstance);
    }
    return val;
  }
});

/** @type {SAML} */
export const saml = proxyInstance;
