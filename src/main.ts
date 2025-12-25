import dotenv from "dotenv";
dotenv.config({ debug: false });

import { default_logger } from "./core/logger";

// database
import Redis from "ioredis";
const redis_database = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

// telegraf
import { Telegraf } from "telegraf";
const telegraf = new Telegraf(process.env.BOT_TOKEN ?? "");

// telegram adapter
import { TelegramAdapter } from "./core/telegram.adapter";
const telegram_adapter = new TelegramAdapter();

// reply storage
import { RedisReplyAdapter } from "./core/reply_storage.adapter";
const reply_adapter = new RedisReplyAdapter(redis_database, "tg_trader:reply_bind:");

// event adapter
import { EventAdapter } from "./core/event.adapter";
const event_adapter = new EventAdapter(reply_adapter);

// timer reply
import { Timer } from "./core/timer";
const reply_timer = new Timer(reply_adapter.cleanup_expired.bind(reply_adapter, event_adapter), 1000);

// context storage
import { RedisContextAdapter } from "./core/user_storage.adapter";
const context_adapter = new RedisContextAdapter(redis_database, "tg_trader:flow_ctx:");

// flow engine
import { FlowEngine } from "./core/flow.engine";
const flow_engine = new FlowEngine(context_adapter);

// ui adapter
import { UIAdapter } from "./core/ui.adapter";
const ui_adapter = new UIAdapter(context_adapter, reply_adapter);

// route controller
import { RouteController } from "./core/route.controller";
const route_controller = new RouteController(telegram_adapter, event_adapter, flow_engine, ui_adapter);

// events
import { use_deal_method_mapper } from "./mappers/deal_method.mapper";

// handlers
import { use_deal_method_handler } from "./handlers/deal_method.handler";

async function shutdown(reason: string = "SIGINT"): Promise<void> {
  reply_timer.stop();
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

  // init telegraf
  telegram_adapter.init(telegraf);

  // event dispath
  route_controller.start();

  // registration events
  use_deal_method_mapper(event_adapter);

  // registration handlers
  use_deal_method_handler(flow_engine);

  // start timers
  reply_timer.start();

  // launch telegraf
  telegraf.launch(() => {
    default_logger.info("Launch Telegram Bot");
  });
}

main().catch((err: unknown) => {
  default_logger.error("Startup Error", { err }).catch(() => {});
  process.exit(1);
});
