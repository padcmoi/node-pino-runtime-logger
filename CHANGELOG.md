# CHANGELOG

## [Unreleased] - yyyy-mm-dd

- Feat(logger): extract runtime pino logger from starter-template with the same public exports/signatures (`pinoGenericLogger`, `logger`, `logInternalError`, `logFatalError`, `logMasterOnly`, `loggerMasterOnly`, purge helpers).
- Feat(service): add singleton-friendly instantiation via `RuntimePinoLoggerService.singleton(...)` and export mapping via `.asExports()` for drop-in `logger.service.ts` usage.
- Feat(pm2): keep PM2-aware formatting/behavior (master/worker context, master-only console/logger helpers) without exposing PM2 fields in the logger facade.
- Feat(rotation): add log rotation helpers for live export log purge and archive cleanup.
- Test: add unit tests for PM2 context, export shape compatibility, singleton behavior, and rotation/archive flows.
- Chore(poc): add minimal Express POC showing health route, internal error logging, and master-only logging.
- Docs: keep README framework-agnostic and move service integration examples to Express/Nest docs only.
- Docs(express,nest): synchronize usage sections with rotation, internal/fatal logging, master-only patterns, and practical service examples.
