import type { LevelWithSilent, Logger } from "pino";

export type LogLevel = "info" | "warn" | "error" | "debug" | "trace" | "fatal";

export type RequestLike = {
  method?: string;
  originalUrl?: string;
  url?: string;
  id?: string | number;
};

export type Pm2Input = {
  nodeAppInstance?: string;
};

export type Pm2Context = {
  nodeAppInstance?: string;
  pm2Id: number;
  isMaster: boolean;
  isWorker: boolean;
};

export type RuntimePinoLoggerServiceOptions = {
  logLevel: LevelWithSilent;
  exportLogPath?: string;
  pm2?: Pm2Input;
};

export type RuntimeLoggerFacade = Pick<Logger, LogLevel>;

export type RuntimePinoLoggerExports = {
  pinoGenericLogger: Logger;
  logger: RuntimeLoggerFacade;
  logInternalError: (req: RequestLike | undefined, err: unknown, context?: Record<string, unknown>) => void;
  logFatalError: (err: unknown, context?: Record<string, unknown>) => void;
  logMasterOnly: (message: string, type?: "info" | "warn" | "error") => false | void;
  loggerMasterOnly: (message: string, type?: LogLevel) => void;
  purgeOldPinoInstanceExportLogs: (input: { MAX_AGE_MS: number; keptOldLogs?: boolean }) => void;
  purgeOldPinoInstanceExportArchives: (input: { MAX_AGE_MS: number }) => void;
};
