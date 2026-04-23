import { RuntimePinoLoggerService } from "@naskot/node-pino-runtime-logger";

export const runtimeLoggerService = RuntimePinoLoggerService.singleton({
  logLevel: "info",
  exportLogPath: "poc-logs/runtime.log",
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
