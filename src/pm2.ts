import type { Pm2Context, Pm2Input } from "./types.js";

export function resolvePm2Context(input: Pm2Input = {}) {
  const nodeAppInstance = input.nodeAppInstance;
  const pm2IdRaw = nodeAppInstance ?? "0";
  const parsed = Number(pm2IdRaw);
  const pm2Id = Number.isFinite(parsed) ? parsed : 0;

  const isMaster = nodeAppInstance === undefined || nodeAppInstance === "0";

  const context = {
    nodeAppInstance,
    pm2Id,
    isMaster,
    isWorker: !isMaster,
  } satisfies Pm2Context;

  return context;
}
