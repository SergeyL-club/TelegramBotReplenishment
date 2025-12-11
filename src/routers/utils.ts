import type { Context } from "telegraf";
import type { MessageFilterFunction } from "../core/telegram_controller";
import type { CommandManager } from "../database/command_manager";
import type { UserManager } from "../database/user_manager";

export async function is_verify_command(
  command_manager: CommandManager,
  user_manager: UserManager,
  role_name: string,
  command_name: string,
  ctx: Context
): Promise<ReturnType<MessageFilterFunction>> {
  if (!ctx.message || !("entities" in ctx.message)) return [false, () => null];
  if (ctx.message.entities[0]?.type !== "bot_command") return [false, () => null];

  const command_name_ctx = ctx.message.text.trim().split(" ")[0]!;
  if (ctx.from === undefined || command_name_ctx !== command_name) return [false, () => null];

  const user_id = ctx.from.id;

  const roles = await user_manager.user_priority_roles(user_id); // ordered roles (0 = highest)
  const commands = await command_manager.command_names(); // [role, command]
  
  // Находим, к какой роли вообще привязана эта команда
  const command_role_name = roles.find((el) => commands.findIndex((cel) => cel[0] === el) !== -1);
  if (!command_role_name) return [false, () => null];
  
  // Находим индексы в массиве приоритетов
  const user_role_index = roles.indexOf(role_name);
  const command_role_index = roles.indexOf(command_role_name);

  // Если роли нет у пользователя — отказ
  if (user_role_index === -1) return [false, () => null];

  // Если команда принадлежит роли выше по приоритету, чем role_name — отказ
  if (command_role_index !== -1 && command_role_index < user_role_index) return [false, () => null];

  // Если роль совпадает и команда доступна — ок
  if (role_name === command_role_name) return [true, () => ({ role_name, command_name })];

  return [false, () => null];
}
