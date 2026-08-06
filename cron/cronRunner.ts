import dotenv from "dotenv";
import { loadLocalEnv } from "../config/load-local-env";

if (!loadLocalEnv()) {
    dotenv.config({ quiet: true });
}

import "@/app/cron/cronJobs";

console.log("Cron runner запущен");
