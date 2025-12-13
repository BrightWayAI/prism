import { Worker } from "bullmq";
import IORedis from "ioredis";
import { handleEmailFetch } from "./jobs/email-fetch.js";
import { handleInvoiceParse } from "./jobs/invoice-parse.js";
import { handleAlertGeneration } from "./jobs/alert-generation.js";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

console.log("Starting Prism worker...");

const emailWorker = new Worker(
  "email-fetch",
  async (job) => {
    console.log(`Processing email-fetch job ${job.id}`);
    await handleEmailFetch(job.data);
  },
  { connection }
);

const parseWorker = new Worker(
  "invoice-parse",
  async (job) => {
    console.log(`Processing invoice-parse job ${job.id}`);
    await handleInvoiceParse(job.data);
  },
  { connection, concurrency: 5 }
);

const alertWorker = new Worker(
  "alert-generation",
  async (job) => {
    console.log(`Processing alert-generation job ${job.id}`);
    await handleAlertGeneration(job.data);
  },
  { connection }
);

emailWorker.on("completed", (job) => console.log(`Email fetch job ${job.id} completed`));
emailWorker.on("failed", (job, err) => console.error(`Email fetch job ${job?.id} failed:`, err));

parseWorker.on("completed", (job) => console.log(`Parse job ${job.id} completed`));
parseWorker.on("failed", (job, err) => console.error(`Parse job ${job?.id} failed:`, err));

alertWorker.on("completed", (job) => console.log(`Alert job ${job.id} completed`));
alertWorker.on("failed", (job, err) => console.error(`Alert job ${job?.id} failed:`, err));

console.log("Worker started, listening for jobs...");

process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  await emailWorker.close();
  await parseWorker.close();
  await alertWorker.close();
  await connection.quit();
  process.exit(0);
});
