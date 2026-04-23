import express from "express";
import { logInternalError, logMasterOnly, logger, loggerMasterOnly } from "./services/logger.service.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3020);

app.get("/", (_req, res) => {
  logger.info("POC health route");

  res.json({
    ok: true,
  });
});

app.get("/error", (req, res) => {
  logInternalError(req, new Error("POC simulated error"), {
    route: "/error",
  });

  res.status(500).json({ ok: false });
});

app.get("/master", (_req, res) => {
  const consoleResult = logMasterOnly("POC master console message", "info");
  loggerMasterOnly("POC master logger message", "info");

  res.json({
    ok: true,
    consoleResult,
  });
});

app.listen(PORT, () => {
  logger.info(`[POC] listening on http://127.0.0.1:${PORT}`);
});
