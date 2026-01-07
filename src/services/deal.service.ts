import type { DealDatabaseAdapter } from "../databases/deal.database";
import type { DefaultContext } from "../core/telegram.types";

export class DealService {
  static async add_trader_ready(deal_database: DealDatabaseAdapter, ctx: DefaultContext): Promise<void> {
    const user_id = ctx.update.callback_query
      ? ctx.update.callback_query.from.id
      : ctx.update.message
        ? ctx.update.message.from.id
        : ctx.from?.id;
    if (typeof user_id === "undefined") return;
    await deal_database.add_trader_ready(user_id);
  }

  static async delete_trader_ready(deal_database: DealDatabaseAdapter, ctx: DefaultContext): Promise<void> {
    const user_id = ctx.update.callback_query
      ? ctx.update.callback_query.from.id
      : ctx.update.message
        ? ctx.update.message.from.id
        : ctx.from?.id;
    if (typeof user_id === "undefined") return;
    await deal_database.delete_trader_ready(user_id);
  }

  static async trader_ready(deal_database: DealDatabaseAdapter, ctx: DefaultContext): Promise<boolean> {
    const user_id = ctx.update.callback_query
      ? ctx.update.callback_query.from.id
      : ctx.update.message
        ? ctx.update.message.from.id
        : ctx.from?.id;
    if (typeof user_id === "undefined") return false;
    return await deal_database.trader_ready(user_id);
  }

  static async add_admin_ready(deal_database: DealDatabaseAdapter, ctx: DefaultContext): Promise<void> {
    const user_id = ctx.update.callback_query
      ? ctx.update.callback_query.from.id
      : ctx.update.message
        ? ctx.update.message.from.id
        : ctx.from?.id;
    if (typeof user_id === "undefined") return;
    await deal_database.add_admin_ready(user_id);
  }

  static async delete_admin_ready(deal_database: DealDatabaseAdapter, ctx: DefaultContext): Promise<void> {
    const user_id = ctx.update.callback_query
      ? ctx.update.callback_query.from.id
      : ctx.update.message
        ? ctx.update.message.from.id
        : ctx.from?.id;
    if (typeof user_id === "undefined") return;
    await deal_database.delete_admin_ready(user_id);
  }

  static async admin_ready(deal_database: DealDatabaseAdapter, ctx: DefaultContext): Promise<boolean> {
    const user_id = ctx.update.callback_query
      ? ctx.update.callback_query.from.id
      : ctx.update.message
        ? ctx.update.message.from.id
        : ctx.from?.id;
    if (typeof user_id === "undefined") return false;
    return await deal_database.admin_ready(user_id);
  }

  static async create_deal(deal_database: DealDatabaseAdapter, data: { create_at: number }): Promise<number | null> {
    return await deal_database.create_deal(data);
  }

  static async deal_info(deal_database: DealDatabaseAdapter, deal_id: number, history = false): Promise<string | null> {
    const deal_info = await deal_database.get_deal(deal_id);
    if (deal_info === null) return null;
    let str = `Сделка #${deal_info.id}\n`;
    str += `Создано: ${new Date(deal_info.create_at).toUTCString()}`;
    if (history)
      for (const el_history of deal_info.history) {
        if ("id" in el_history && "create_at" in el_history)
          str += `[${new Date(el_history.info_at).toUTCString()}] Создана заявка под номером #${el_history.id}`;
      }
    return str;
  }
}
