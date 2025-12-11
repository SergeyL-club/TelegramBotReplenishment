import dotenv from "dotenv";
dotenv.config({ debug: false });

import { default_logger } from "./core/logger";
import { TelegramController } from "./core/telegram_controller";

const telegram_controller = new TelegramController(process.env.BOT_TOKEN ?? "");

async function shutdown(reason: string = "SIGINT"): Promise<void> {
  telegram_controller.reply_timer_stop();
  await telegram_controller.stop(reason);
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

async function main(): Promise<void> {
  telegram_controller.reply_timer_start();
  await telegram_controller.start();
}

main().catch((err: unknown) => {
  default_logger.error("Startup Error", { err }).catch(() => {});
  process.exit(1);
});
