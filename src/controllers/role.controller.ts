import type { DefaultContext } from "../core/telegram.types";
import type { UserContextAdapter } from "../databases/user.context";
import { Composer } from "../core/telegram.composer";
import { RoleService } from "../services/role.service";
import { user_middleware, type UserContext } from "../middleware/user.middleware";
import { start_middleware, type StartContext } from "../middleware/start.middleware";
import { UserService } from "../services/user.service";
import { Roles } from "../databases/role.constants";

export class RoleController {
  static start_registration_role<Type extends DefaultContext>(
    user_context: UserContextAdapter
  ): ReturnType<Composer<Type & StartContext & UserContext>["handler"]> {
    const composer: Composer<Type> = new Composer();
    return composer
      .use(start_middleware())
      .use(user_middleware())
      .use(UserService.modify_user_middleware(user_context))
      .handler(async (ctx) => {
        await RoleService.registration_role(user_context, Roles.CLIENT, ctx);
        await ctx.telegram.setMyCommands(await RoleService.get_command(user_context, ctx.user.id), {
          scope: { type: "chat", chat_id: ctx.user.chat_id },
        });
        await ctx.reply("Обновление меню", { reply_markup: { keyboard: await RoleService.get_menu_command(user_context, ctx.user.id) } });
      });
  }
}
