# @naskot/node-pino-runtime-logger

A lightweight, framework-agnostic pino runtime logger.

This package is designed so you can keep the same export surface as `api-starter-template/src/libs/logger.ts`:

- `pinoGenericLogger`
- `logger`
- `logInternalError`
- `logFatalError`
- `logMasterOnly`
- `loggerMasterOnly`
- `purgeOldPinoInstanceExportLogs`
- `purgeOldPinoInstanceExportArchives`

The only addition is a singleton service to instantiate once with your runtime config.

## Install

```bash
npm i @naskot/node-pino-runtime-logger
```

## Usage

Implementation samples are intentionally documented in framework guides:

- [docs/express.md](./docs/express.md)
- [docs/nestjs.md](./docs/nestjs.md)

## Proof of concept

- [docs/poc.md](./docs/poc.md)
