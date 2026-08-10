# User blocking module

This directory is the single ownership boundary for user-blocking behavior.

- `components/` contains the client-side access boundary and blocking popup.
- `server/` contains database access, domain service, and the status route handler.
- `types.ts` contains contracts shared by the client and server.
- `index.ts` is the browser-safe public entry point.

Next.js requires HTTP route files under `app/api`, so
`app/api/user-blocking/status/route.ts` is intentionally only a thin adapter to
this module. Application integration is limited to mounting the guard in the
root layout.

Server-only consumers must import from `@/app/modules/userBlocking/server`.
Client and shared consumers must import from `@/app/modules/userBlocking` or
`@/app/modules/userBlocking/types`; this prevents database dependencies from
entering the client bundle.