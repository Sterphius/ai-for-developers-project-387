import { defineConfig } from "@playwright/test";

const PORT = 5173;
const API_PORT = 8080;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: [
    {
      command: `go run ./cmd/server`,
      port: API_PORT,
      cwd: "../server",
    },
    {
      command: `VITE_API_BASE_URL=http://localhost:${API_PORT} npm run build && npx vite preview --port ${PORT} --strictPort`,
      port: PORT,
      cwd: ".",
      timeout: 120_000,
    },
  ],
});
