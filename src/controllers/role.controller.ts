import type { DefaultContext } from "../core/telegram.types";
import type { UserContextAdapter } from "../databases/user.context";
import type { RoleDatabaseAdapter } from "../databases/role.database";
import { Composer } from "../core/telegram.composer";
import { RoleService } from "../services/role.service";
import { user_middleware, type UserContext } from "../middleware/user.middleware";
import { start_middleware, type StartContext } from "../middleware/start.middleware";
import { UserService } from "../services/user.service";

export class RoleController {
  static start_registration_role<Type extends DefaultContext>(
    user_context: UserContextAdapter
  ): ReturnType<Composer<Type & StartContext & UserContext>["handler"]> {
    const composer: Composer<Type> = new Composer();
    return composer
      .use(start_middleware())
      .use(user_middleware())
      .use(UserService.modify_user_middleware(user_context))
      .handler((ctx) => {
        RoleService.registration_role(user_context, "client", ctx);
      });
  }
}
