# NestJS Integration

## Service provider

### `src/logger/logger.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { createRuntimePinoLoggerExports } from "@naskot/node-pino-runtime-logger";

@Injectable()
export class LoggerService {
  private readonly runtime = createRuntimePinoLoggerExports({
    logLevel: "info",
    exportLogPath: "data/logs/runtime.log",
    pm2: {
      nodeAppInstance: process.env.NODE_APP_INSTANCE,
    },
  });

  public readonly pinoGenericLogger = this.runtime.pinoGenericLogger;
  public readonly logger = this.runtime.logger;
  public readonly logInternalError = this.runtime.logInternalError;
  public readonly logFatalError = this.runtime.logFatalError;
  public readonly logMasterOnly = this.runtime.logMasterOnly;
  public readonly loggerMasterOnly = this.runtime.loggerMasterOnly;
  public readonly purgeOldPinoInstanceExportLogs = this.runtime.purgeOldPinoInstanceExportLogs;
  public readonly purgeOldPinoInstanceExportArchives = this.runtime.purgeOldPinoInstanceExportArchives;
}
```

Alternative with singleton service:

```ts
import { Injectable } from "@nestjs/common";
import { RuntimePinoLoggerService } from "@naskot/node-pino-runtime-logger";

@Injectable()
export class LoggerService {
  private readonly runtimeLoggerService = RuntimePinoLoggerService.singleton({
    logLevel: process.env.LOG_LEVEL === "debug" ? "debug" : "info",
    exportLogPath: process.env.PINO_INSTANCE_EXPORT_LOG,
    pm2: {
      nodeAppInstance: process.env.NODE_APP_INSTANCE,
    },
  });

  public readonly pinoGenericLogger = this.runtimeLoggerService.pinoGenericLogger;
  public readonly logger = this.runtimeLoggerService.logger;
  public readonly logInternalError = this.runtimeLoggerService.logInternalError.bind(this.runtimeLoggerService);
  public readonly logFatalError = this.runtimeLoggerService.logFatalError.bind(this.runtimeLoggerService);
  public readonly logMasterOnly = this.runtimeLoggerService.logMasterOnly.bind(this.runtimeLoggerService);
  public readonly loggerMasterOnly = this.runtimeLoggerService.loggerMasterOnly.bind(this.runtimeLoggerService);
  public readonly purgeOldPinoInstanceExportLogs = this.runtimeLoggerService.purgeOldPinoInstanceExportLogs.bind(
    this.runtimeLoggerService
  );
  public readonly purgeOldPinoInstanceExportArchives = this.runtimeLoggerService.purgeOldPinoInstanceExportArchives.bind(
    this.runtimeLoggerService
  );
}
```

## Rotation usage (bootstrap / cron)

```ts
import { Injectable } from "@nestjs/common";
import { LoggerService } from "../logger/logger.service";

@Injectable()
export class AuditRotationService {
  constructor(private readonly loggerService: LoggerService) {}

  runDailyRotation() {
    this.loggerService.purgeOldPinoInstanceExportLogs({
      MAX_AGE_MS: 24 * 60 * 60 * 1000,
      keptOldLogs: true,
    });

    this.loggerService.purgeOldPinoInstanceExportArchives({
      MAX_AGE_MS: 30 * 24 * 60 * 60 * 1000,
    });

    this.loggerService.logger.info("rotation done");
  }
}
```

## Internal error logging usage

```ts
import { Injectable } from "@nestjs/common";
import { LoggerService } from "../logger/logger.service";

@Injectable()
export class UsersService {
  constructor(private readonly loggerService: LoggerService) {}

  listUsers(req: { method?: string; url?: string; id?: string }) {
    try {
      throw new Error("example");
    } catch (error) {
      this.loggerService.logInternalError(req, error, { feature: "users-service" });
    }

    this.loggerService.logger.info("list users");
    return [];
  }
}
```

## Fatal lifecycle usage

```ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { LoggerService } from "../logger/logger.service";

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private readonly loggerService: LoggerService) {}

  onModuleInit() {
    try {
      // startup checks...
    } catch (error) {
      this.loggerService.logFatalError(error, { source: "onModuleInit" });
      process.exit(1);
    }
  }
}
```

## Master-only usage (PM2)

```ts
import { Injectable } from "@nestjs/common";
import { LoggerService } from "../logger/logger.service";

@Injectable()
export class BannerService {
  constructor(private readonly loggerService: LoggerService) {}

  showBootBanner() {
    this.loggerService.logMasterOnly("Boot banner from master process only", "info");
    this.loggerService.loggerMasterOnly("Master-only structured info", "info");
  }
}
```
