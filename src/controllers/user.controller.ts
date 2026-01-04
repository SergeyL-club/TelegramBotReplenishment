import type { DefaultContext } from "../core/telegram.types";
import type { UserContextAdapter } from "../databases/user.context";
import type { DealDatabaseAdapter } from "../databases/deal.database";
import { command_middleware, type CommandContext } from "../middleware/commad.middleware";
import { start_middleware, type StartContext } from "../middleware/start.middleware";
import { menu_middleware, type MenuContext } from "../middleware/menu.middleware";
import { RoleService } from "../services/role.service";
import { Composer } from "../core/telegram.composer";
import { fragmentation_menu, Roles } from "../databases/role.constants";
import { UserService } from "../services/user.service";
import { CommandService } from "../services/command.service";
import { MenuService } from "../services/menu.service";
import { role_middleware } from "../middleware/role.middleware";
import { DealService } from "../services/deal.service";
import { callback_middleware } from "../middleware/callback.middleware";

export class UserController {
  static start_registration_role<Type extends DefaultContext>(
    user_context: UserContextAdapter
  ): ReturnType<Composer<Type & StartContext>["handler"]> {
    const composer = new Composer<Type>();
    return composer.use(start_middleware()).handler(async (ctx) => {
      await RoleService.registration_role(user_context, Roles.CLIENT, ctx);
      await UserService.save_user_data(user_context, ctx);
      const roles = await RoleService.get_roles(user_context, ctx);
      if (!Array.isArray(roles)) return;
      await ctx.telegram.setMyCommands(CommandService.get_commands_roles(roles), {
        scope: { type: "chat", chat_id: ctx.update.message.chat.id },
      });
      await ctx.reply("Обновление Меню", {
        reply_markup: { keyboard: fragmentation_menu(MenuService.get_menu_roles(roles)), resize_keyboard: true },
      });
    });
  }

  static menu_refresh_role<Type extends DefaultContext>(
    user_context: UserContextAdapter
  ): ReturnType<Composer<Type & CommandContext>["handler"]> {
    const composer = new Composer<Type>();
    return composer
      .use(role_middleware(user_context, Roles.CLIENT))
      .use(command_middleware("/menu"))
      .handler(async (ctx) => {
        const roles = await RoleService.get_roles(user_context, ctx);
        if (!Array.isArray(roles)) return;
        await ctx.telegram.setMyCommands(CommandService.get_commands_roles(roles), {
          scope: { type: "chat", chat_id: ctx.update.message.chat.id },
        });
        await ctx.reply("Обновление Меню", {
          reply_markup: { keyboard: fragmentation_menu(MenuService.get_menu_roles(roles)), resize_keyboard: true },
        });
      });
  }

  static code_registration_role<Type extends DefaultContext>(
    user_context: UserContextAdapter
  ): ReturnType<Composer<Type & CommandContext>["handler"]> {
    const composer = new Composer<Type>();
    return composer
      .use(role_middleware(user_context, Roles.CLIENT))
      .use(command_middleware("/code"))
      .handler(async (ctx) => {
        const [token] = ctx.update.message.text.trim().split(" ").slice(1);
        if (typeof token !== "string") {
          await ctx.reply(`Неверный токен (${token})`);
          return;
        }
        const role = await RoleService.verification_token(token);
        if (typeof role !== "string") {
          await ctx.reply(`Неверный токен (${token})`);
          return;
        }
        await RoleService.registration_role(user_context, role, ctx);
        const roles = await RoleService.get_roles(user_context, ctx);
        if (!Array.isArray(roles)) {
          await ctx.reply(`Неверный токен (${token})`);
          return;
        }
        await ctx.telegram.setMyCommands(CommandService.get_commands_roles(roles), {
          scope: { type: "chat", chat_id: ctx.update.message.chat.id },
        });
        await ctx.reply("Обновление Меню", {
          reply_markup: { keyboard: fragmentation_menu(MenuService.get_menu_roles(roles)), resize_keyboard: true },
        });
      });
  }

  // Режим сделок у trader
  static trader_deal_ready<Type extends DefaultContext>(
    user_context: UserContextAdapter,
    deal_database: DealDatabaseAdapter
  ): ReturnType<Composer<Type & MenuContext>["handler"]> {
    const composer = new Composer<Type>();
    return composer.use(menu_middleware("Режим Сделок")).handler(async (ctx) => {
      const ready = await DealService.trader_ready(deal_database, ctx);
      const is = await ctx.reply(`Режим сделок: ${ready ? "Включен" : "Выключен"}`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Включить", callback_data: "trader_ready:1" },
              { text: "Выключить", callback_data: "trader_ready:0" },
            ],
          ],
        },
      });
      UserService.save_update_message(user_context, "trader_ready", [{ id: is.message_id, date: is.date }], ctx);
    });
  }

  static trader_deal_ready_callback<Type extends DefaultContext>(user_context: UserContextAdapter, deal_database: DealDatabaseAdapter) {
    const composer = new Composer<Type>();
    return composer.use(callback_middleware("trader_ready")).handler(async (ctx) => {
      await ctx.answerCbQuery();
      const ready = Boolean(Number(ctx.update.callback_query.data.split(":").slice(1)));
      if (ready) DealService.add_trader_ready(deal_database, ctx);
      else DealService.delete_trader_ready(deal_database, ctx);
      const messages: { id: number; date: number }[] | null = await UserService.get_update_message<{ id: number; date: number }[]>(
        user_context,
        "trader_ready",
        ctx
      );
      if (messages === null) return;
      const chat_id = ctx.update.callback_query
        ? ctx.update.callback_query.message.chat.id
        : ctx.update.message
          ? ctx.update.message.chat.id
          : ctx.chat?.id;
      if (typeof chat_id === "undefined") return;
      const delta = Date.now() + 1 * 60 * 1000;

      const deleted: { id: number; date: number }[] = [];
      for (const message of messages.map(({ id, date }) => {
        if (id === ctx.update.callback_query.message.message_id) date = delta;
        return { id, date };
      })) {
        if (message.date > delta) {
          deleted.push(message);
          continue;
        }
        try {
          await ctx.telegram.editMessageText(chat_id, message.id, undefined, `Режим сделок: ${ready ? "Включен" : "Выключен"}`, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Включить", callback_data: "trader_ready:1" },
                  { text: "Выключить", callback_data: "trader_ready:0" },
                ],
              ],
            },
          });
        } catch (e: any) {
          if (e?.description?.includes("message is not modified")) {
            continue;
          }
          throw e;
        }
      }
      if (deleted.length > 0) {
        await UserService.save_update_message(user_context, "trader_ready", undefined, ctx);
        const deletedIds = new Set(deleted.map(({ id }) => id));
        await UserService.save_update_message(
          user_context,
          "trader_ready",
          messages.filter(({ id }) => !deletedIds.has(id)),
          ctx
        );
      }
    });
  }

  // Уведомления сделок admin

  // Методы оплаты для admin
}
