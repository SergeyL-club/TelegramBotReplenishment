import dotenv from "dotenv";
dotenv.config({ debug: false });

import Redis from "ioredis";
import { default_logger } from "./core/logger";

// database
import { UserManager } from "./database/user_manager";
import { DealManager } from "./database/deal_manager";

const redis_database = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const user_manager = new UserManager(redis_database);
const deal_manager = new DealManager(redis_database);

// routes
import { use_start } from "./routes/start.route";
import { use_code } from "./routes/code.route";
import { use_menu } from "./routes/menu.route";
import { use_method } from "./routes/method.route";
import { use_method_add } from "./routes/method_add.route";
import { use_method_del } from "./routes/method_del.route";
import { use_toggle_trader } from "./routes/trader_toggle.route";
import { use_toggle_trader_on } from "./routes/trader_toggle_on.route";
import { use_toggle_trader_off } from "./routes/trader_toggle_off.route";

// telegram controller
import { TelegramController } from "./core/telegram_controller";

const telegram_controller = new TelegramController(process.env.BOT_TOKEN ?? "", redis_database);

async function shutdown(reason: string = "SIGINT"): Promise<void> {
  telegram_controller.stop_timeout_delete_binds();
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

  // use routes
  await use_start(telegram_controller, user_manager);
  await use_code(telegram_controller, user_manager);
  await use_menu(telegram_controller, user_manager);
  await use_method(telegram_controller, deal_manager);
  await use_method_add(telegram_controller, deal_manager);
  await use_method_del(telegram_controller, deal_manager);
  await use_toggle_trader(telegram_controller, user_manager);
  await use_toggle_trader_on(telegram_controller, user_manager);
  await use_toggle_trader_off(telegram_controller, user_manager);

  // start telegram events
  telegram_controller.start_handler.call(telegram_controller);
  telegram_controller.message_handler.call(telegram_controller);
  telegram_controller.callback_handler.call(telegram_controller);
  telegram_controller.start_timeout_delete_binds();
  await telegram_controller.start();
}

main().catch((err: unknown) => {
  default_logger.error("Startup Error", { err }).catch(() => {});
  process.exit(1);
});
