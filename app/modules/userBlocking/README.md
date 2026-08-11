# User blocking module

This directory is the single ownership boundary for user-blocking behavior.

- `components/` contains the client-side access boundary and blocking popup.
- `server/blockUser.ts` is the only entry point that reason detectors should use
  to block a user. It delegates to the domain service, while the repository
  atomically writes `blocked`, `blocked_reason`, and `blocked_at`.
- `server/` also contains database access, state checks, and the status route
  handler.
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

To add a blocking trigger, add its stable code to
`USER_BLOCK_REASON_CODES`, then call:

```ts
import { blockUser } from "@/app/modules/userBlocking/server";
import { USER_BLOCK_REASON_CODES } from "@/app/modules/userBlocking";

await blockUser({
    userId,
    reason: USER_BLOCK_REASON_CODES.EXCESSIVE_REQUESTS,
});
```

The root-level guard checks the status when it mounts, when the tab becomes
active, and immediately after an application request reports a possible block.
A once-per-minute fallback poll (paused while the tab is hidden) also covers
block state changes made outside the current tab. It locks the page and displays
the warning popup whenever the stored `blocked` flag is set. The current
authorization flow does not contain blocking logic.