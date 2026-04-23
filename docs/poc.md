# POC

Run the local Express POC:

```bash
cd poc
npm i
npm run dev
```

Endpoints:

- `GET /` health + `logger.info(...)`
- `GET /error` triggers `logInternalError(...)`
- `GET /master` tests `logMasterOnly(...)` + `loggerMasterOnly(...)`

The POC service exports the same logger API as `api-starter-template` logger file.
