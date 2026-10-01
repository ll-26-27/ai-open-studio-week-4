import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

export default {
  // Next blocks dev resources for hostnames other than localhost, which leaves pages un-hydrated when opened
  // via 127.0.0.1 or a LAN address. Add any host you open the dev server from.
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.local"],
  // The Markdown lives in content/, inside this app; trace it into the build so Vercel's functions can read it.
  turbopack: { root: appRoot },
  outputFileTracingIncludes: { "/*": ["./content/**/*.md"] },
};
