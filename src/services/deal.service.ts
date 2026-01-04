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
}
