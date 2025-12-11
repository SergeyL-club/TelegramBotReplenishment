import type { RoleManager } from "./database/role_manager";
import type { CommandManager } from "./database/command_manager";
import { default_logger } from "./core/logger";

export enum Roles {
  CLIENT = "client",
  DEALER = "dealer",
  ADMIN = "admin",
}

export type CommandData = Parameters<CommandManager["create_command"]>;

function get_role_key(value: string): keyof typeof Roles {
  return (Object.keys(Roles) as Array<keyof typeof Roles>).find((key) => Roles[key] as string === value) as keyof typeof Roles;
}

export const commands: CommandData[] = [
  [Roles.CLIENT, "/codes", "Отдает список всех команд доступных пользователю"],
  [Roles.CLIENT, "/code", "Команда для открытия доп функций (требует через пробел ключ функций)"],
  [Roles.ADMIN, "/codes", "Отдает список всех команд"],
] as const;

export async function registry_roles(role_manager: RoleManager, command_manager: CommandManager): Promise<void> {
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
}
