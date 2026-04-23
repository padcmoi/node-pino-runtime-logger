import { describe, expect, it } from "vitest";
import { resolvePm2Context } from "../src/index.js";

describe("resolvePm2Context", () => {
  it("marks undefined instance as master", () => {
    const ctx = resolvePm2Context({});
    expect(ctx.isMaster).toBe(true);
    expect(ctx.isWorker).toBe(false);
    expect(ctx.pm2Id).toBe(0);
  });

  it("marks instance 1 as worker", () => {
    const ctx = resolvePm2Context({ nodeAppInstance: "1" });
    expect(ctx.isMaster).toBe(false);
    expect(ctx.isWorker).toBe(true);
    expect(ctx.pm2Id).toBe(1);
  });
});
