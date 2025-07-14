module.exports = {
  apps: [
    {
      name: "frontend",
      script: "npm",
      args: "run dev:frontend",
      cwd: __dirname,
      env: {
        NODE_ENV: "development",
      },
      // PM2 configuration for better process management
      instances: 1,
      autorestart: true,
      watch: false, // Prevent conflicts with vite's built-in hot reload
      max_memory_restart: "1G",
    },
    {
      name: "backend",
      script: "/opt/homebrew/bin/wrangler", // call binary directly
      interpreter: "none", // tell PM2 it's NOT a JS file :contentReference[oaicite:3]{index=3}
      args: "dev --local --port 8787 --log-level debug",
      env: {
        NODE_ENV: "development",
        NO_COLOR: "1", // strip ANSI for non-TTY :contentReference[oaicite:4]{index=4}
      },
      merge_logs: true, // single file per app :contentReference[oaicite:5]{index=5}
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      max_memory_restart: "1G",
      cwd: __dirname,
      // PM2 configuration for better process management
      instances: 1,
      autorestart: true,
      watch: false, // Prevent conflicts with wrangler's built-in hot reload
    },
  ],
};
