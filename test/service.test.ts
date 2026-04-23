import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRuntimePinoLoggerExports, createRuntimePinoLoggerSingleton, RuntimePinoLoggerService } from "../src/index.js";

describe("Runtime pino logger exports", () => {
  afterEach(() => {
    RuntimePinoLoggerService.resetSingletonForTests();
  });

  it("matches starter-template export shape", () => {
    const runtime = createRuntimePinoLoggerExports({
      logLevel: "info",
      pm2: { nodeAppInstance: "0" },
    });

    expect(typeof runtime.logger.info).toBe("function");
    expect(typeof runtime.logger.warn).toBe("function");
    expect(typeof runtime.logger.error).toBe("function");
    expect(typeof runtime.logger.debug).toBe("function");
    expect(typeof runtime.logger.trace).toBe("function");
    expect(typeof runtime.logger.fatal).toBe("function");

    expect("pm2" in runtime).toBe(false);
    expect("pm2" in runtime.logger).toBe(false);

    runtime.logInternalError({ method: "GET", originalUrl: "/health", id: "req-1" }, new Error("boom"), { feature: "test" });
    runtime.logFatalError(new Error("fatal"), { feature: "test" });
  });

  it("supports singleton instantiation service", () => {
    const first = createRuntimePinoLoggerSingleton({
      logLevel: "info",
      pm2: { nodeAppInstance: "0" },
    });

    const second = createRuntimePinoLoggerSingleton();

    expect(first.logger).toBe(second.logger);
    expect(first.pinoGenericLogger).toBe(second.pinoGenericLogger);
  });

  it("purges old entries and archives removed lines", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pino-runtime-logger-"));
    const logPath = path.join(dir, "instance.log");

    const oldLine = "[2000-01-01 00:00:00.000 +0000] old line";
    const newLine = "[2999-01-01 00:00:00.000 +0000] new line";

    writeFileSync(logPath, `${oldLine}\n${newLine}\n`, "utf8");

    const runtime = createRuntimePinoLoggerExports({
      logLevel: "info",
      exportLogPath: logPath,
      pm2: { nodeAppInstance: "0" },
    });

    runtime.purgeOldPinoInstanceExportLogs({ MAX_AGE_MS: 1, keptOldLogs: true });

    const remaining = readFileSync(logPath, "utf8");
    expect(remaining.includes("new line")).toBe(true);
    expect(remaining.includes("old line")).toBe(false);

    const archivesDir = path.join(dir, "archives");
    const archiveFiles = readdirSync(archivesDir);
    expect(archiveFiles.length).toBe(1);

    rmSync(dir, { recursive: true, force: true });
  });
});
