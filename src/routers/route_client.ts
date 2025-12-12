import type { TelegramController, MessageFilterFunction } from "../core/telegram_controller";
import type { RoleManager } from "../database/role_manager";
import type { CommandManager } from "../database/command_manager";
import type { UserManager } from "../database/user_manager";
import type { DataCommand } from "./utils";
import { commands } from "../registry_base_roles";
import type { MenuManager } from "../database/menu_manager";
import { default_logger } from "../core/logger";
import {get_commands_menu, is_verify_command, update_menu } from "./utils";

export async function use_client(
  telegram_controller: TelegramController,
  role_manager: RoleManager,
  command_manager: CommandManager,
  user_manager: UserManager,
  menu_manager: MenuManager
): Promise<void> {
  const is_verify_command_client = is_verify_command.bind(null, menu_manager, command_manager, user_manager, false);

  telegram_controller.on_message(
    is_verify_command_client.bind(null, commands[2]![0], commands[2]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== commands[2]![0] || data[1] !== commands[2]![1]) return;
      if (!ctx.message || !("text" in ctx.message) || ctx.from === undefined) return;
      const user_id = ctx.from.id;
      const result_commands = await get_commands_menu(command_manager, user_manager, user_id);
      await ctx.telegram.setMyCommands(
        result_commands.map((el) => ({ command: el[0], description: el[1] })),
        { scope: { type: "chat", chat_id: ctx.chat!.id } }
      );
      await ctx.reply("Команды обновлены", { reply_markup: await update_menu(user_id, menu_manager, user_manager) });
    }
  );

  telegram_controller.on_message(
    is_verify_command_client.bind(null, commands[3]![0], commands[3]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== commands[3]![0] || data[1] !== commands[3]![1]) return;
      if (!ctx.message || !("text" in ctx.message) || ctx.from === undefined) return;
      const user_id = ctx.from.id;
      const user_roles = await user_manager.user_priority_roles(user_id);
      await ctx.reply(`Вот ваш набор ролей: ${user_roles.join(", ")}`);
    }
  );

  telegram_controller.on_message(
    is_verify_command_client.bind(null, commands[0]![0], commands[0]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== commands[0]![0] || data[1] !== commands[0]![1]) return;
      if (!ctx.message || !("text" in ctx.message) || ctx.from === undefined) return;
      const user_id = ctx.from.id;
      const user_roles = await user_manager.user_priority_roles(user_id);
      const command_names = await command_manager.command_names();
      let reply_text = "Список доступных комманд:\n";
      for (let index = 0; index < user_roles.length; ++index) {
        const role_user = user_roles[index];
        reply_text += `${index + 1}. Kомманды роли ${role_user}:\n`;
        const role_commands = command_names.filter((el) => el[0] === role_user);
        const max_lenght = role_commands.reduce((max, str) => Math.max(max, str[1].length), 0);
        for (const command of role_commands) {
          const description = await command_manager.command_descriptions(command[0], command[1]);
          reply_text += `\u2003\u2003\u2003\u2003<code>${command[1]}</code>${"\u2000\u2000\u2000".repeat(max_lenght - command[1].length)} - ${description}\n`;
        }
      }
      await ctx.reply(reply_text, { parse_mode: "HTML" });
    }
  );

  telegram_controller.on_message(
    is_verify_command_client.bind(null, commands[4]![0], commands[4]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== commands[4]![0] || data[1] !== commands[4]![1]) return;
      if (!ctx.message || !("text" in ctx.message) || ctx.from === undefined) return;
      const user_id = ctx.from.id;
      const user_roles = await user_manager.user_priority_roles(user_id);
      const menu_names = await menu_manager.menu_names();
      let reply_text = "Список доступных комманд меню:\n";
      for (let index = 0; index < user_roles.length; ++index) {
        const role_user = user_roles[index];
        reply_text += `${index + 1}. Kомманды роли ${role_user}:\n`;
        const role_menus = menu_names.filter((el) => el[0] === role_user);
        const max_lenght = role_menus.reduce((max, str) => Math.max(max, str[1].length), 0);
        for (const menu of role_menus) {
          const description = await menu_manager.menu_descriptions(menu[0], menu[1]);
          reply_text += `\u2003\u2003\u2003\u2003<code>${menu[1]}</code>${"\u2000\u2000\u2000".repeat(max_lenght - menu[1].length)} - ${description}\n`;
        }
      }
      await ctx.reply(reply_text, { parse_mode: "HTML" });
    }
  );

  telegram_controller.on_message(
    is_verify_command_client.bind(null, commands[1]![0], commands[1]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== commands[1]![0] || data[1] !== commands[1]![1]) return;
      if (!ctx.message || !("text" in ctx.message) || ctx.from === undefined) return;
      const token = ctx.message.text.trim().split(" ")[1] ?? "";
      const roles = await role_manager.role_names();
      const is_verify = (await Promise.all(roles.map(async (role) => await role_manager.verify_role_token(role, token)))).findIndex(
        Boolean
      );
      if (is_verify === -1) {
        await default_logger.log(`Command ${data[1]} (${data[0]}) is'nt verify token role`);
        await ctx.reply("Неверный токен");
        return;
      } else await default_logger.log(`Command ${data[1]} (${data[0]}) is verify token role ${roles[is_verify]}`);

      const user_id = ctx.from.id;
      const user_nickname = ctx.from.username;
      if (user_nickname === undefined) return;
      const role_name = roles[is_verify]!;
      await default_logger.info(`Registration start role (${role_name}) in user ${user_nickname} (${user_id})`);
      const is_add = await user_manager.add_role_to_user(roles[is_verify]!, user_id);
      await default_logger.info(`Registration finally (${is_add}) role (${role_name}) in user ${user_nickname} (${user_id})`);

      const result_commands = await get_commands_menu(command_manager, user_manager, user_id);
      await ctx.telegram.setMyCommands(
        result_commands.map((el) => ({ command: el[0], description: el[1] })),
        { scope: { type: "chat", chat_id: ctx.chat!.id } }
      );
      await ctx.reply(`Успешно добавлена роль ${role_name}. Меню обновлено`);
    }
  );

  await default_logger.info("Registration finally route use_client");
}
