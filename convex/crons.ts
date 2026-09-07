import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval(
  "purge expired client diagnosis recordings",
  { hours: 1 },
  internal.clientDiagnoses.purgeExpiredRecordings,
);

export default crons;
