import dotenv from "dotenv";
dotenv.config({ debug: false });

import { Redis } from "ioredis";
import { default_logger } from "./core/logger";
import { TelegramController } from "./core/telegram_controller";

// database
import { RoleManager } from "./database/role_manager";
import { CommandManager } from "./database/command_manager";
import { UserManager } from "./database/user_manager";
import { MenuManager } from "./database/menu_manager";

// registry roles, commands
import { registry_roles } from "./registry_base_roles";

// routes
import { use_start } from "./routers/route_start";
import { use_client } from "./routers/route_client";

const telegram_controller = new TelegramController(process.env.BOT_TOKEN ?? "");

// database
const redis_database = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const role_manager = new RoleManager(redis_database);
const command_manager = new CommandManager(redis_database);
const user_manager = new UserManager(redis_database);
const menu_manager = new MenuManager(redis_database);

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

  // registry roles
  await registry_roles(role_manager, command_manager, menu_manager);

  // routers
  await use_start(telegram_controller, command_manager, user_manager, menu_manager);
  await use_client(telegram_controller, role_manager, command_manager, user_manager, menu_manager);

  // start telegram events
  telegram_controller.reply_timer_start();
  await telegram_controller.start();
}

main().catch((err: unknown) => {
  default_logger.error("Startup Error", { err }).catch(() => {});
  process.exit(1);
});
