import dotenv from "dotenv";
dotenv.config();

import "@/app/cron/cronJobs";

console.log("Cron runner запущен");
