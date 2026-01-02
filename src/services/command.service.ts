import { type Command, commands, Roles } from "../databases/role.constants";

export class CommandService {
  static get_commands_roles(roles: string[]): Command[] {
    const pre_commands: Command[] = [];
    const keys = Object.keys(commands) as (keyof typeof Roles)[];
    for (const key of keys) {
      if (roles.includes(key)) pre_commands.push(...commands[key]);
    }
    return pre_commands;
  }
}
