#!/usr/bin/env node

/**
 * Validation script for expensive integration tests
 * Checks that all required credentials and bindings are configured
 * before running tests that cost real money.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description} found`);
    return true;
  } else {
    console.log(`❌ ${description} missing`);
    return false;
  }
}

function checkEnvVar(varName, description) {
  const devVarsPath = path.join(projectRoot, ".dev.vars");
  if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, "utf8");
    const hasVar = content.includes(varName + "=");
    const isNotPlaceholder =
      !content.includes(varName + "=your-") &&
      !content.includes(varName + "=sk-your-");
    if (hasVar && isNotPlaceholder) {
      console.log(`✅ ${description} configured in .dev.vars`);
      return true;
    }
  }
  console.log(`❌ ${description} not configured in .dev.vars`);
  return false;
}

function checkBinding(bindingName, description) {
  const wranglerPath = path.join(projectRoot, "wrangler.jsonc");
  if (fs.existsSync(wranglerPath)) {
    const content = fs.readFileSync(wranglerPath, "utf8");
    if (content.includes('"' + bindingName + '"')) {
      console.log(`✅ ${description} binding configured`);
      return true;
    }
  }
  console.log(`❌ ${description} binding not configured`);
  return false;
}

function main() {
  console.log("🔍 Validating expensive test setup...\n");

  let allValid = true;

  // Check required files
  allValid &= checkFile(path.join(projectRoot, ".dev.vars"), ".dev.vars file");
  allValid &= checkFile(
    path.join(projectRoot, "wrangler.jsonc"),
    "wrangler.jsonc file"
  );
  allValid &= checkFile(
    path.join(projectRoot, "tests/integration-cost-money.test.ts"),
    "Expensive tests file"
  );

  console.log("");

  // Check environment variables
  allValid &= checkEnvVar("OPENAI_API_KEY", "OpenAI API key");

  console.log("");

  // Check Cloudflare bindings
  allValid &= checkBinding("AI", "Cloudflare AI");
  allValid &= checkBinding("WORKFLOW_VERSIONS", "R2 bucket");
  allValid &= checkBinding("AGENT", "Durable Object");

  console.log("");

  if (allValid) {
    console.log("🎉 All requirements satisfied! You can run expensive tests.");
    console.log("");
    console.log("Commands to run:");
    console.log("  npm run test:expensive       # Run all expensive tests");
    console.log("  wrangler dev --local         # Test bindings locally");
    console.log("  wrangler secret bulk .dev.vars  # Upload secrets to remote");
    console.log("");
    console.log("💰 Cost estimate: ~$0.50-2.00 per full test run");
    process.exit(0);
  } else {
    console.log("❌ Setup incomplete. Please fix the issues above.");
    console.log("");
    console.log("Setup instructions:");
    console.log("1. Add OpenAI API key to .dev.vars:");
    console.log('   echo "OPENAI_API_KEY=sk-your-key" >> .dev.vars');
    console.log("");
    console.log("2. Ensure Cloudflare account has required services:");
    console.log("   - AI Workers (for inference)");
    console.log("   - R2 Object Storage (for persistence)");
    console.log("   - Durable Objects (for state management)");
    console.log("");
    console.log("3. Upload secrets to remote:");
    console.log("   wrangler secret bulk .dev.vars");
    console.log("");
    console.log(
      "See tests/EXPENSIVE_TESTS.md for detailed setup instructions."
    );
    process.exit(1);
  }
}

main();
