import { defineConfig } from "@playwright/test";
import base from "../../playwright.config";

// Runs the E2E suite against internal staging. ignoreHTTPSErrors exists because the
// browser does not trust the local CA, so certificate validity is checked with curl --cacert.
export default defineConfig({
  ...base,
  testDir: "../../e2e",
  workers: 1,
  use: {
    ...base.use,
    baseURL: "https://nutritrack-staging.localhost:8443",
    ignoreHTTPSErrors: true,
  },
});
