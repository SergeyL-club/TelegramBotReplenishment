import type { DefaultContext } from "../core/telegram.types";
import type { UserContextAdapter } from "../databases/user.context";
import { start_middleware, type StartContext } from "../middleware/start.middleware";
import { RoleService } from "../services/role.service";
import { Composer } from "../core/telegram.composer";
import { Roles } from "../databases/role.constants";

export class UserController {
  static start_registration_role<Type extends DefaultContext>(
    user_context: UserContextAdapter
  ): ReturnType<Composer<Type & StartContext>["handler"]> {
    const composer = new Composer<Type>();
    return composer.use(start_middleware()).handler(async (ctx) => {
      await RoleService.registration_role(user_context, Roles.CLIENT, ctx);
    });
  }
}
