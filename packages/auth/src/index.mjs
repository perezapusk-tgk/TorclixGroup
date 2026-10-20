import { createRemoteJWKSet, jwtVerify } from "jose";
import crypto from "node:crypto";

let jwks;

function trialSubject(token){
  const clean=String(token||"").trim();
  if(!/^[A-Za-z0-9_-]{32,128}$/.test(clean)) return null;
  return "trial:"+clean;
}

export async function authenticateRequest(req) {
  const devAuthEnabled = process.env.NODE_ENV !== "production" && process.env.TORCLIX_DEV_AUTH === "true";
  if (devAuthEnabled) {
    const userKey = req.headers["x-torclix-user"];
    return {subject:String(userKey||"demo"),email:null,name:null,source:userKey?"development-header":"development-demo"};
  }

  if (process.env.TORCLIX_TRIAL_MODE === "true") {
    const token=trialSubject(req.headers["x-torclix-trial"]);
    if (token) return {subject:token,email:null,name:"Владелец пробной студии",source:"trial"};
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
  return {subject:String(payload.sub),email:payload.email?String(payload.email):null,name:payload.name?String(payload.name):null,source:"jwt"};
}
