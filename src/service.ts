import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import pino, { type Logger, multistream } from "pino";
import pretty from "pino-pretty";
import { resolvePm2Context } from "./pm2.js";
import type {
  LogLevel,
  RequestLike,
  RuntimeLoggerFacade,
  RuntimePinoLoggerExports,
  RuntimePinoLoggerServiceOptions,
} from "./types.js";

function dateNowMs() {
  return Date.now();
}

function dateISO(t = dateNowMs()) {
  return new Date(t).toISOString();
}

function loggerFacadeFrom(raw: Logger) {
  return Object.fromEntries(
    (["info", "warn", "error", "debug", "trace", "fatal"] as const).map((level) => [level, raw[level].bind(raw)])
  ) as RuntimeLoggerFacade;
}

function parseEntryTimestampMs(line: string) {
  const headerRe = /^\[(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d{3})?) ([+-]\d{4})\]/u;
  const m = headerRe.exec(line);

  if (!m) return null;

  const d = m[1];
  const t = m[2];
  const off = m[3];
  const tz = `${off.slice(0, 3)}:${off.slice(3)}`;
  const iso = `${d}T${t}${tz}`;
  const ts = Date.parse(iso);

  return Number.isNaN(ts) ? null : ts;
}

export class RuntimePinoLoggerService {
  private static singletonInstance: RuntimePinoLoggerService | null = null;

  private readonly pm2;
  private readonly exportLogPath?: string;

  public readonly pinoGenericLogger: Logger;
  public readonly logger: RuntimeLoggerFacade;

  constructor(options: RuntimePinoLoggerServiceOptions) {
    this.pm2 = resolvePm2Context(options.pm2);
    this.exportLogPath = options.exportLogPath;

    const prettyStream = pretty({
      singleLine: true,
      colorize: true,
      translateTime: "SYS:standard",
      hideObject: false,
      messageFormat: `${this.pm2.pm2Id == 0 ? `\x1b[36m[PM2: ${this.pm2.pm2Id}]` : `\x1b[35m[PM2: ${this.pm2.pm2Id}]`} \x1b[33m{levelLabel}: {msg} {props}\x1b[0m`,
    });

    const streams = multistream([
      { stream: prettyStream },
      ...(this.exportLogPath
        ? [
            {
              stream: pretty({
                singleLine: true,
                colorize: false,
                translateTime: "SYS:standard",
                hideObject: false,
                messageFormat: `[PM2: ${this.pm2.pm2Id}] {levelLabel}: {msg} {props}`,
                destination: this.exportLogPath,
                mkdir: true,
                append: true,
              }),
            },
          ]
        : []),
    ]);

    this.pinoGenericLogger = pino({ level: options.logLevel }, streams);
    this.logger = loggerFacadeFrom(this.pinoGenericLogger);
  }

  static singleton(options?: RuntimePinoLoggerServiceOptions) {
    if (!RuntimePinoLoggerService.singletonInstance) {
      if (!options) {
        throw new Error("RuntimePinoLoggerService.singleton(options) requires options on first call");
      }

      RuntimePinoLoggerService.singletonInstance = new RuntimePinoLoggerService(options);
    }

    return RuntimePinoLoggerService.singletonInstance;
  }

  static resetSingletonForTests() {
    RuntimePinoLoggerService.singletonInstance = null;
  }

  logInternalError(req: RequestLike | undefined, err: unknown, context?: Record<string, unknown>) {
    this.logger.error(
      {
        err,
        ...(req
          ? {
              method: req.method,
              url: req.originalUrl || req.url,
              requestId: req.id,
            }
          : {}),
        ...(context || {}),
      },
      "Internal application error"
    );
  }

  logFatalError(err: unknown, context?: Record<string, unknown>) {
    this.logger.fatal({ err, ...(context || {}) }, "Fatal application error");
  }

  logMasterOnly(message: string, type: "info" | "warn" | "error" = "info") {
    const colored = `${type === "warn" ? "\x1b[33m" : type === "error" ? "\x1b[31m" : ""}${message}${type === "info" ? "" : "\x1b[0m"}`;

    // eslint-disable-next-line no-console
    return this.pm2.isMaster && console[type](colored);
  }

  loggerMasterOnly(message: string, type: LogLevel = "info") {
    if (!this.pm2.isMaster) return;
    this.logger[type](message);
  }

  purgeOldPinoInstanceExportLogs({ MAX_AGE_MS, keptOldLogs }: { MAX_AGE_MS: number; keptOldLogs?: boolean }) {
    if (!this.exportLogPath) return;
    if (!existsSync(this.exportLogPath)) return;

    try {
      const data = readFileSync(this.exportLogPath, "utf8");
      if (!data.trim()) return;

      const lines = data.split("\n");
      const now = dateNowMs();

      const kept: string[] = [];
      const removed: string[] = [];

      let sawHeader = false;
      let keepCurrent = true;
      let currentEntry: string[] = [];

      function flushCurrent() {
        if (currentEntry.length === 0) return;
        const target = !sawHeader ? kept : keepCurrent ? kept : removed;
        target.push(...currentEntry);
        currentEntry = [];
      }

      for (const line of lines) {
        if (line === "") {
          currentEntry.push(line);
          continue;
        }

        const tsMs = parseEntryTimestampMs(line);

        if (tsMs !== null) {
          flushCurrent();
          sawHeader = true;
          keepCurrent = now - tsMs <= MAX_AGE_MS;
          currentEntry.push(line);
          continue;
        }

        currentEntry.push(line);
      }

      flushCurrent();

      const keptOut = kept.length ? `${kept.join("\n")}\n` : "";
      const tmpPath = `${this.exportLogPath}.tmp`;
      writeFileSync(tmpPath, keptOut);
      renameSync(tmpPath, this.exportLogPath);

      if (keptOldLogs && removed.length) {
        const today = dateISO().slice(0, 10);
        const dir = path.dirname(this.exportLogPath);
        const base = path.basename(this.exportLogPath);

        const archiveDir = path.join(dir, "archives");
        if (!existsSync(archiveDir)) {
          mkdirSync(archiveDir, { recursive: true });
        }

        const archivePath = path.join(archiveDir, `${base}.${today}.log`);
        const removedOut = `${removed.join("\n")}\n`;

        if (existsSync(archivePath)) {
          appendFileSync(archivePath, removedOut);
        } else {
          writeFileSync(archivePath, removedOut);
        }

        this.logger.info(`[pinoExport] Purged old logs, archived removed entries to ${archivePath} (${dateISO()})`);
        return;
      }

      this.logger.info(`[pinoExport] Purged old logs (${dateISO()})`);
    } catch (err) {
      this.logger.error({ error: err }, "[pinoExport] purgeOldPinoInstanceExportLogs error:");
    }
  }

  purgeOldPinoInstanceExportArchives({ MAX_AGE_MS }: { MAX_AGE_MS: number }) {
    if (!this.exportLogPath) return;

    try {
      const archiveDir = path.join(path.dirname(this.exportLogPath), "archives");
      if (!existsSync(archiveDir)) return;

      const files = readdirSync(archiveDir);

      for (const name of files) {
        const m = /^.+\.(\d{4}-\d{2}-\d{2})\.log$/u.exec(name);
        if (!m) continue;

        const day = m[1];
        const ts = Date.parse(`${day}T00:00:00.000Z`);
        if (Number.isNaN(ts)) continue;

        if (dateNowMs() - ts > MAX_AGE_MS) {
          unlinkSync(path.join(archiveDir, name));
        }
      }
    } catch (err) {
      this.logger.error({ error: err }, "[pinoExport] purgeOldPinoInstanceExportArchives error:");
    }
  }

  asExports() {
    return {
      pinoGenericLogger: this.pinoGenericLogger,
      logger: this.logger,
      logInternalError: this.logInternalError.bind(this),
      logFatalError: this.logFatalError.bind(this),
      logMasterOnly: this.logMasterOnly.bind(this),
      loggerMasterOnly: this.loggerMasterOnly.bind(this),
      purgeOldPinoInstanceExportLogs: this.purgeOldPinoInstanceExportLogs.bind(this),
      purgeOldPinoInstanceExportArchives: this.purgeOldPinoInstanceExportArchives.bind(this),
    } satisfies RuntimePinoLoggerExports;
  }
}

export function createRuntimePinoLoggerExports(options: RuntimePinoLoggerServiceOptions) {
  return new RuntimePinoLoggerService(options).asExports();
}

export function createRuntimePinoLoggerSingleton(options?: RuntimePinoLoggerServiceOptions) {
  return RuntimePinoLoggerService.singleton(options).asExports();
}
