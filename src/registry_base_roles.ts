import type { RoleManager } from "./database/role_manager";
import type { CommandManager } from "./database/command_manager";
import type { MenuManager } from "./database/menu_manager";
import { default_logger } from "./core/logger";

export enum Roles {
  CLIENT = "client",
  DEALER = "dealer",
  ADMIN = "admin",
}

export type CommandData = Parameters<CommandManager["create_command"]>;
export type MenuData = Parameters<MenuManager["create_menu"]>;

function get_role_key(value: string): keyof typeof Roles {
  return (Object.keys(Roles) as Array<keyof typeof Roles>).find((key) => (Roles[key] as string) === value) as keyof typeof Roles;
}

export const commands: CommandData[] = [
  [Roles.CLIENT, "/codes", "Отдает список всех команд доступных пользователю"],
  [Roles.CLIENT, "/code", "Команда для открытия доп функций (требует через пробел ключ функций)"],
  [Roles.CLIENT, "/menu", "Обновить меню (испольуется если не обновилось само)"],
  [Roles.CLIENT, "/roles", "Отдает список всех ролей которые присвоены пользователю"],
  [Roles.CLIENT, "/menus", "Отдает список всех ролей которые присвоены пользователю"],
] as const;

export const menus: MenuData[] = [
  [Roles.ADMIN, "Список методов оплаты", "Отдает список методов оплаты и 2 функции по добавлени и удалению методов", [0, 0]],
  [Roles.CLIENT, "Баланс", "Дает общие данные об сделках а также отдает функции пополнения", [0, 0]],
  [Roles.DEALER, "Режим сделок", "Показывает какой сейчас режим сделок (вкл/выкл) а также отдает функции вкл/выкл режима", [0, 0]],
] as const;

export async function registry_roles(role_manager: RoleManager, command_manager: CommandManager, menu_manager: MenuManager): Promise<void> {
  await Promise.all(
    Object.values(Roles).map(async (role_name) => {
      await default_logger.log(`Registration role ${role_name} start`);
      if (!(await role_manager.has_role(role_name))) {
        const token = process.env[`${get_role_key(role_name)}_TOKEN`] ?? "";
        const is_create = await role_manager.create_role(role_name, token);
        await default_logger.log(`Registration finally (${is_create}) role ${role_name} is token ${token}`);
      } else await default_logger.log(`Role ${role_name} is already registry`);
    })
  );

  await Promise.all(
    commands.map(async ([role_name, command_name, descrtiption]) => {
      await default_logger.log(`Registration command ${command_name} (${role_name}) start`);
      if (!(await command_manager.has_command(role_name, command_name))) {
        const is_create = await command_manager.create_command(role_name, command_name, descrtiption);
        await default_logger.log(
          `Registration finally (${is_create}) command ${command_name} (${role_name}) is description ${descrtiption}`
        );
      } else await default_logger.log(`Command ${command_name} (${role_name}) is already registry`);
    })
  );

  await Promise.all(
    menus.map(async ([role_name, menu_name, descrtiption, positions]) => {
      await default_logger.log(`Registration command ${menu_name} (${role_name}) start`);
      if (!(await menu_manager.has_menu(role_name, menu_name))) {
        const is_create = await menu_manager.create_menu(role_name, menu_name, descrtiption, positions);
        await default_logger.log(
          `Registration finally (${is_create}) menu ${menu_name} (${role_name}) is description ${descrtiption} and positions ${JSON.stringify(positions)}`
        );
      } else await default_logger.log(`Command ${menu_name} (${role_name}) is already registry`);
    })
  );
}
