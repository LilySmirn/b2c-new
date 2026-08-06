import { loadEnv } from "../config/load-env";

loadEnv();

import "@/app/cron/cronJobs";

console.log("Cron runner запущен");