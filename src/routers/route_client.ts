import { Roles, commands } from "../registry_base_roles";
import type { TelegramController, MessageFilterFunction } from "../core/telegram_controller";
import type { RoleManager } from "../database/role_manager";
import type { CommandManager } from "../database/command_manager";
import type { UserManager } from "../database/user_manager";
import { default_logger } from "../core/logger";
import { is_verify_command } from "./utils";

type DataCommand = [role_name: string, command_name: string];

export async function use_client(
  telegram_controller: TelegramController,
  role_manager: RoleManager,
  command_manager: CommandManager,
  user_manager: UserManager
): Promise<void> {
  const is_verify_command_client = is_verify_command.bind(null, command_manager, user_manager);

  telegram_controller.on_message(
    is_verify_command_client.bind(null, Roles.CLIENT, commands[0]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== Roles.CLIENT as string || data[1] !== commands[0]![1]) return;
      await default_logger.log(`Command ${data[0]} (${data[1]})`);
    }
  );

  telegram_controller.on_message(
    is_verify_command_client.bind(null, Roles.CLIENT, commands[1]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== Roles.CLIENT as string || data[1] !== commands[1]![1]) return;
      if (!ctx.message || !("text" in ctx.message) || ctx.from === undefined) return;
      const token = ctx.message.text.trim().split(" ")[1] ?? "";
      await default_logger.log(`Command ${data[1]} (${data[0]}) is token ${token}`);
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
      await ctx.reply(`Успешно добавлена роль ${role_name}. Меню обновлено`);
    }
  );

  await default_logger.info("Registration finally route use_client");
}
