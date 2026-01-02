import dotenv from "dotenv";
dotenv.config({ debug: false });

import { default_logger } from "./core/logger";

// database
import Redis from "ioredis";
const redis_database = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

// telegraf
import { Telegraf } from "telegraf";
import type { DefaultContext } from "./core/telegram.types";
const telegraf = new Telegraf<DefaultContext>(process.env.BOT_TOKEN ?? "");

// telegram adapter
import { DefaultTelegramAdapter } from "./core/telegram.adapter";
const telegram_adapter = new DefaultTelegramAdapter();

// user context adapter
import { RedisUserContextAdapter } from "./databases/user.context";
const user_context = new RedisUserContextAdapter(redis_database, "tg_trader:flow_contex:");

// role database adapter
import { RedisRoleDatabaseAdapter } from "./databases/role.database";
const role_database = new RedisRoleDatabaseAdapter(redis_database, "tg_trader:");

// controllers
import { UserController } from "./controllers/user.controller";

async function shutdown(reason: string = "SIGINT"): Promise<void> {
  telegraf.stop(reason);
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
  default_logger.error("Unhandled Promise Rejection", reason).catch(() => {});

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

function wait_for_redis_ready(redis: Redis): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redis.status === "ready") return resolve();

    function on_ready(): void {
      cleanup();
      resolve();
    }
    function on_error(err: Error): void {
      cleanup();
      reject(err);
    }
    function cleanup(): void {
      redis.off("ready", on_ready);
      redis.off("error", on_error);
    }

    redis.on("ready", on_ready);
    redis.on("error", on_error);
  });
}

async function main(): Promise<void> {
  // redis connection is ready
  await wait_for_redis_ready(redis_database);
  await default_logger.info("Redis already");

  // global use
  telegraf.use((ctx) => {
    telegram_adapter.handle(ctx);
  });

  // routers
  telegram_adapter.registration_composer(UserController.start_registration_role(user_context));
  // telegram_adapter.registration_composer(RoleController.code_registration_role(user_context));

  // launch telegraf
  telegraf.launch(() => {
    default_logger.info("Launch Telegram Bot");
  });
}

main().catch((err: unknown) => {
  default_logger.error("Startup Error", { err }).catch(() => {});
  process.exit(1);
});
