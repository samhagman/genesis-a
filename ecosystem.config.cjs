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
      script: "npm",
      args: "run dev:backend",
      cwd: __dirname,
      env: {
        NODE_ENV: "development",
      },
      // PM2 configuration for better process management
      instances: 1,
      autorestart: true,
      watch: false, // Prevent conflicts with wrangler's built-in hot reload
      max_memory_restart: "1G",
    },
  ],
};
