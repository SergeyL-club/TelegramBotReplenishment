export enum Roles {
  CLIENT = "client",
  TRADER = "trader",
  ADMIN = "admin",
}
export type RolesValue = (typeof Roles)[keyof typeof Roles];

export type MenuButton = { text: string };

export const client_menu_buttons: MenuButton[] = [{ text: "Тест" }] as const;
export const trader_menu_buttons: MenuButton[] = [] as const;
export const admin_menu_buttons: MenuButton[] = [] as const;
