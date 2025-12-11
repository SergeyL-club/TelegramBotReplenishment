import dotenv from "dotenv";
dotenv.config({ debug: false });

import { Redis } from "ioredis";
import { default_logger } from "./core/logger";
import { TelegramController } from "./core/telegram_controller";
import { UserManager } from "./database/user_manager";

// routes
import { use_start } from "./routers/route_start";

const telegram_controller = new TelegramController(process.env.BOT_TOKEN ?? "");

// database
const redis_database = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const user_manager = new UserManager(redis_database);

async function shutdown(reason: string = "SIGINT"): Promise<void> {
  telegram_controller.reply_timer_stop();
  await telegram_controller.stop(reason);
  redis_database.disconnect();
}

process.on("uncaughtException", (err) => {
  default_logger
    .error("Uncaught Exception", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    })
    .catch(() => {});

  shutdown("CriticalError")
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});

process.on("unhandledRejection", (reason) => {
  default_logger.error("Unhandled Promise Rejection", { reason }).catch(() => {});

  shutdown("CriticalError")
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});

function success_exit(): void {
  shutdown("SIGINT")
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

process.once("SIGINT", success_exit);
process.once("SIGTERM", success_exit);

function waitForRedisReady(redis: Redis): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redis.status === "ready") return resolve();

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      redis.off("ready", onReady);
      redis.off("error", onError);
    };

    redis.on("ready", onReady);
    redis.on("error", onError);
  });
}

async function main(): Promise<void> {
  await waitForRedisReady(redis_database);
  default_logger.info("Redis already");

  use_start(telegram_controller, user_manager);

  telegram_controller.reply_timer_start();
  await telegram_controller.start();
}

main().catch((err: unknown) => {
  default_logger.error("Startup Error", { err }).catch(() => {});
  process.exit(1);
});
