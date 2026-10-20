import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;

export async function authenticateRequest(req) {
  if (process.env.NODE_ENV !== "production") {
    const userKey = req.headers["x-torclix-user"];
    return userKey ? { subject: String(userKey), email: null, name: null, source: "development-header" } : null;
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
