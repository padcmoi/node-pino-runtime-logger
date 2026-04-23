# Express Integration

## Service (drop-in replacement style)

### `src/services/logger.service.ts`

```ts
import { createRuntimePinoLoggerExports } from "@naskot/node-pino-runtime-logger";

const runtime = createRuntimePinoLoggerExports({
  logLevel: "info",
  exportLogPath: "data/logs/runtime.log",
  pm2: {
    nodeAppInstance: process.env.NODE_APP_INSTANCE,
  },
});

export const {
  pinoGenericLogger,
  logger,
  logInternalError,
  logFatalError,
  logMasterOnly,
  loggerMasterOnly,
  purgeOldPinoInstanceExportLogs,
  purgeOldPinoInstanceExportArchives,
} = runtime;
```

Alternative with singleton service:

```ts
import { RuntimePinoLoggerService } from "@naskot/node-pino-runtime-logger";

const runtimeLoggerService = RuntimePinoLoggerService.singleton({
  logLevel: process.env.LOG_LEVEL === "debug" ? "debug" : "info",
  exportLogPath: process.env.PINO_INSTANCE_EXPORT_LOG,
  pm2: {
    nodeAppInstance: process.env.NODE_APP_INSTANCE,
  },
});

export const {
  pinoGenericLogger,
  logger,
  logInternalError,
  logFatalError,
  logMasterOnly,
  loggerMasterOnly,
  purgeOldPinoInstanceExportLogs,
  purgeOldPinoInstanceExportArchives,
} = runtimeLoggerService.asExports();
```

## Rotation usage (bootstrap / cron)

```ts
import { logger, purgeOldPinoInstanceExportArchives, purgeOldPinoInstanceExportLogs } from "../services/logger.service";

// Keep only fresh entries in the live log file.
purgeOldPinoInstanceExportLogs({
  MAX_AGE_MS: 24 * 60 * 60 * 1000,
  keptOldLogs: true,
});

// Remove old archived files.
purgeOldPinoInstanceExportArchives({
  MAX_AGE_MS: 30 * 24 * 60 * 60 * 1000,
});

logger.info("rotation done");
```

## Request error logging usage

```ts
import type { NextFunction, Request, Response } from "express";
import { logInternalError } from "../services/logger.service";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  logInternalError(req, err, { feature: "http-error-handler" });
  res.status(500).json({ ok: false });
}
```

## Fatal lifecycle usage

```ts
import { logFatalError } from "../services/logger.service";

process.on("uncaughtException", (error) => {
  logFatalError(error, { source: "uncaughtException" });
  process.exit(1);
});
```

## Master-only usage (PM2)

```ts
import { logMasterOnly, loggerMasterOnly } from "../services/logger.service";

logMasterOnly("Boot banner from master process only", "info");
loggerMasterOnly("Master-only structured info", "info");
```

## Basic logger usage

```ts
import { logger } from "../services/logger.service";

logger.info({ module: "bootstrap" }, "bootstrap started");
logger.warn("degraded mode enabled");
```
