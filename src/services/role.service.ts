import type { UserContextAdapter } from "../databases/user.context";
import { role_codes, Roles } from "../databases/role.constants";

export class RoleService {
  constructor(private readonly user_adapter: UserContextAdapter) {}

  public static verify_token(token: string): keyof typeof Roles | null {
    const find = Object.values(role_codes).findIndex((el) => el === token);
    if (find === -1) return null;
    const role = Object.keys(role_codes)[find];
    if (typeof role === "undefined") return null;
    return role as keyof typeof Roles;
  }

  public async ensure_role(user_id: number, role: keyof typeof Roles) {
    await this.user_adapter.set(user_id, { roles: [role] });
  }

  public async get_roles(user_id: number): Promise<(keyof typeof Roles)[]> {
    const data = await this.user_adapter.get<{ roles: (keyof typeof Roles)[] }>(user_id);
    return data?.roles ?? [];
  }
}
