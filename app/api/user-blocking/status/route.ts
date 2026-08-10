// App Router requires the HTTP entry point here; its implementation belongs to
// the isolated user-blocking module.
export { getUserBlockingStatus as GET } from "../../../modules/userBlocking/server/statusRoute";