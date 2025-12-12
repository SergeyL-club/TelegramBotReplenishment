import type { Context } from "telegraf";
import type { CommandManager } from "../database/command_manager";
import { UserManager } from "../database/user_manager";
import { MenuManager, Positions } from "../database/menu_manager";

type ReturnVerifyCommand = [is_filter: boolean, next: () => unknown[]];

export type DataCommand = [role_name: string, command_name: string];

export async function update_menu(
  user_id: number,
  menu_manager: MenuManager,
  user_manager: UserManager
): Promise<{ keyboard: string[][]; resize_keyboard: boolean }> {
  const result_menus = await get_menus(menu_manager, user_manager, user_id);
  return { keyboard: fragmentation_menu(result_menus), resize_keyboard: true };
}

export async function get_commands_menu(
  command_manager: CommandManager,
  user_manager: UserManager,
  user_id: number
): Promise<[command: string, description: string][]> {
  const user_roles = await user_manager.user_priority_roles(user_id);
  const command_names = await command_manager.command_names();
  return await Promise.all(
    command_names
      .filter((el) => user_roles.includes(el[0]))
      .map(async (el) => [el[1], (await command_manager.command_descriptions(el[0], el[1]))!])
  );
}

export async function get_menus(
  menu_manager: MenuManager,
  user_manager: UserManager,
  user_id: number
): Promise<[name: string, positions: Positions][]> {
  const user_roles = await user_manager.user_priority_roles(user_id);
  const menu_names = await menu_manager.menu_names();
  return await Promise.all(
    menu_names.filter((el) => user_roles.includes(el[0])).map(async (el) => [el[1], (await menu_manager.menu_positions(el[0], el[1]))!])
  );
}

export function fragmentation_menu(menus: [name: string, positions: Positions][]): string[][] {
  const menu_commands: string[][] = [];
  for (const menu_command of menus) {
    let row = menu_command[1][0];
    const col = menu_command[1][1];
    while (menu_commands.length <= row) {
      menu_commands.push([]);
    }
    while (menu_commands[row]?.[col]) {
      row++;
      if (!menu_commands[row]) menu_commands[row] = [];
    }
    menu_commands[row]![col] = menu_command[0];
  }
  return menu_commands;
}

export async function is_verify_command(
  menu_manager: MenuManager,
  command_manager: CommandManager,
  user_manager: UserManager,
  is_menu: boolean,
  role_name: string,
  command_name: string,
  ctx: Context
): Promise<ReturnVerifyCommand> {
  if (!ctx.message || !("text" in ctx.message)) return [false, (() => []) as ReturnVerifyCommand["1"]];
  if (!is_menu) {
    if (!ctx.message || !("entities" in ctx.message)) return [false, (() => []) as ReturnVerifyCommand["1"]];
    if (ctx.message.entities[0]?.type !== "bot_command") return [false, (() => []) as ReturnVerifyCommand["1"]];
  }

  const command_name_ctx = is_menu ? ctx.message.text.trim() : ctx.message.text.trim().split(" ")[0]!;
  if (ctx.from === undefined || (!is_menu && command_name_ctx !== command_name)) return [false, (() => []) as ReturnVerifyCommand["1"]];

  const user_id = ctx.from.id;

  const roles = await user_manager.user_priority_roles(user_id); // ordered roles (0 = highest)
  const commands = is_menu ? await menu_manager.menu_names() : await command_manager.command_names(); // [role, command]

  // Находим, к какой роли вообще привязана эта команда
  const command_role_name = roles.find((el) => commands.findIndex((cel) => cel[0] === el && cel[1] === command_name_ctx) !== -1);
  if (!command_role_name) return [false, (() => []) as ReturnVerifyCommand["1"]];

  // Находим индексы в массиве приоритетов
  const user_role_index = roles.indexOf(role_name);
  const command_role_index = roles.indexOf(command_role_name);

  // Если роли нет у пользователя — отказ
  if (user_role_index === -1) return [false, (() => []) as ReturnVerifyCommand["1"]];

  // Если команда принадлежит роли выше по приоритету, чем role_name — отказ
  if (command_role_index !== -1 && command_role_index < user_role_index) return [false, (() => []) as ReturnVerifyCommand["1"]];

  // Если роль совпадает и команда доступна — ок
  if (role_name === command_role_name) return [true, (() => [role_name, command_name]) as ReturnVerifyCommand["1"]];

  return [false, (() => []) as ReturnVerifyCommand["1"]];
}
