import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const index = path.join(dist, "index.html");
const callbackDir = path.join(dist, "callback");
const callback = path.join(callbackDir, "index.html");

if (!fs.existsSync(index)) {
  throw new Error("Vite build output dist/index.html was not found");
}

fs.mkdirSync(callbackDir, { recursive: true });
fs.copyFileSync(index, callback);
console.log("Created static Auth0 callback entry:", callback);
