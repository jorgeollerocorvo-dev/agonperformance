#!/usr/bin/env node
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const isDev = process.env.NODE_ENV !== "production";

console.log("[Start] Environment:", process.env.NODE_ENV || "production");
console.log("[Start] Time:", new Date().toISOString());

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("[ERROR] DATABASE_URL not set");
  process.exit(1);
}

// Run migrations with timeout
const runMigrations = () => {
  return new Promise((resolve, reject) => {
    console.log("[Start] Running Prisma migrations...");

    const prismaProcess = spawn("npx", ["prisma", "migrate", "deploy", "--skip-generate"], {
      stdio: "inherit",
      timeout: 120000, // 2 minute timeout
    });

    const migrationTimeout = setTimeout(() => {
      prismaProcess.kill();
      console.warn("[Warn] Migration timeout - continuing startup anyway");
      resolve();
    }, 120000);

    prismaProcess.on("exit", (code) => {
      clearTimeout(migrationTimeout);
      if (code === 0) {
        console.log("[Start] Migrations completed successfully");
        resolve();
      } else {
        console.warn(`[Warn] Migration exited with code ${code} - continuing startup`);
        resolve(); // Don't reject, just continue
      }
    });

    prismaProcess.on("error", (err) => {
      clearTimeout(migrationTimeout);
      console.error("[Warn] Migration error:", err.message);
      resolve(); // Continue even if there's an error
    });
  });
};

// Start the app
const startApp = () => {
  console.log("[Start] Starting Next.js app...");

  const nextProcess = spawn("next", ["start"], {
    stdio: "inherit",
  });

  nextProcess.on("exit", (code) => {
    console.log("[Start] Next.js exited with code", code);
    process.exit(code);
  });

  // Handle signals
  process.on("SIGTERM", () => {
    console.log("[Start] SIGTERM received, shutting down...");
    nextProcess.kill("SIGTERM");
  });

  process.on("SIGINT", () => {
    console.log("[Start] SIGINT received, shutting down...");
    nextProcess.kill("SIGINT");
  });
};

// Main flow
(async () => {
  try {
    await runMigrations();
    startApp();
  } catch (error) {
    console.error("[ERROR] Startup error:", error);
    process.exit(1);
  }
})();
