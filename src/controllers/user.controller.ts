import type { DefaultContext } from "../core/telegram.types";
import type { UserContextAdapter } from "../databases/user.context";
import { command_middleware, type CommandContext } from "../middleware/commad.middleware";
import { start_middleware, type StartContext } from "../middleware/start.middleware";
import { RoleService } from "../services/role.service";
import { Composer } from "../core/telegram.composer";
import { fragmentation_menu, Roles } from "../databases/role.constants";
import { UserService } from "../services/user.service";
import { CommandService } from "../services/command.service";
import { MenuService } from "../services/menu.service";

export class UserController {
  static start_registration_role<Type extends DefaultContext>(
    user_context: UserContextAdapter
  ): ReturnType<Composer<Type & StartContext>["handler"]> {
    const composer = new Composer<Type>();
    return composer.use(start_middleware()).handler(async (ctx) => {
      await RoleService.registration_role(user_context, Roles.CLIENT, ctx);
      await UserService.save_user_data(user_context, ctx);
      console.log(1);
      const roles = await RoleService.get_roles(user_context, ctx);
      console.log(2, roles);
      if (!Array.isArray(roles)) return;
      await ctx.telegram.setMyCommands(CommandService.get_commands_roles(roles), {
        scope: { type: "chat", chat_id: ctx.update.message.chat.id },
      });
      await ctx.reply("Обновление Меню", { reply_markup: { keyboard: fragmentation_menu(MenuService.get_menu_roles(roles)) } });
    });
  }

  static code_registration_role<Type extends DefaultContext>(
    user_context: UserContextAdapter
  ): ReturnType<Composer<Type & CommandContext>["handler"]> {
    const composer = new Composer<Type>();
    return composer.use(command_middleware("/code")).handler(async (ctx) => {
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
      await ctx.reply("Обновление Меню", { reply_markup: { keyboard: fragmentation_menu(MenuService.get_menu_roles(roles)) } });
    });
  }
}
