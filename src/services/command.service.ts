import type { DefaultContext } from "../core/telegram.types";
import { type Command, commands, Roles } from "../databases/role.constants";

export class CommandService {
  public static get_commands_for_roles(roles: (keyof typeof Roles)[]): Command[] {
    const result: Command[] = [];
    for (const role_name of roles) {
      if (commands[role_name].length > 0) result.push(...commands[role_name]);
    }
    return result;
  }

  public static apply_for_chat(ctx: DefaultContext, chat_id: number, roles: (keyof typeof Roles)[]): Promise<true> {
    return ctx.telegram.setMyCommands(CommandService.get_commands_for_roles(roles), { scope: { type: "chat", chat_id: chat_id } });
  }
}
