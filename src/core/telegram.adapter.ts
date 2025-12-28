import { default_logger } from "./logger";
import type { DefaultContext } from "./telegram.types";

export type TelegramHandler<Ctx extends DefaultContext = DefaultContext> = (ctx: Ctx) => void | Promise<void>;

export interface TelegramAdapter {
  registration_composer: <Ctx extends DefaultContext>(handler: TelegramHandler<Ctx>) => void;
  handle: (ctx: DefaultContext) => Promise<void>;
}

export class DefaultTelegramAdapter implements TelegramAdapter {
  private readonly handlers: TelegramHandler<any>[] = [];

  public registration_composer<Ctx extends DefaultContext>(handler: TelegramHandler<Ctx>): void {
    this.handlers.push(handler);
  }

  public async handle(ctx: DefaultContext): Promise<void> {
    const results = await Promise.allSettled(this.handlers.map((handler) => handler(ctx)));

    for (const result of results) {
      if (result.status === "rejected") {
        default_logger.error("Telegram handler error", result.reason);
      }
    }
  }
}
