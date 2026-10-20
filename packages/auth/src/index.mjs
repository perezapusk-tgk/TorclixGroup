import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;

export async function authenticateRequest(req) {
  const devAuthEnabled = process.env.TORCLIX_DEV_AUTH === "true";
  if (devAuthEnabled) {
    // Demo/local mode must remain usable when the browser opens the app directly
    // (for example from Telegram or a public preview) and cannot attach the
    // development identity header. A supplied header still selects another
    // deterministic demo identity.
    const userKey = req.headers["x-torclix-user"];
    return {
      subject: String(userKey || "demo"),
      email: null,
      name: null,
      source: userKey ? "development-header" : "development-demo"
    };
  }

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;

  const issuer = process.env.AUTH_ISSUER;
  const audience = process.env.AUTH_AUDIENCE;
  const jwksUrl = process.env.AUTH_JWKS_URL;
  if (!issuer || !audience || !jwksUrl) {
    throw new Error("Production authentication requires AUTH_ISSUER, AUTH_AUDIENCE and AUTH_JWKS_URL");
  }

  jwks ||= createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jwtVerify(header.slice(7).trim(), jwks, { issuer, audience });
  if (!payload.sub) return null;

  return {
    subject: String(payload.sub),
    email: payload.email ? String(payload.email) : null,
    name: payload.name ? String(payload.name) : null,
    source: "jwt"
  };
}
