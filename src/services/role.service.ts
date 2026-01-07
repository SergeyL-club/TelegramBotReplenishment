import type { UserContextAdapter } from "../databases/user.context";
import { Roles } from "../databases/role.constants";

export class RoleService {
  constructor(private readonly user_adapter: UserContextAdapter) {}

  public async ensure_role(user_id: number, role: keyof typeof Roles) {
    await this.user_adapter.set(user_id, { roles: [role] });
  }

  public async get_roles(user_id: number): Promise<(keyof typeof Roles)[]> {
    const data = await this.user_adapter.get<{ roles: (keyof typeof Roles)[] }>(user_id);
    return data?.roles ?? [];
  }
}
