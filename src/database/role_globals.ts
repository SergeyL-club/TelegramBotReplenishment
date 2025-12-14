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

export const menu_buttons: (MenuButton & { role: RolesValue })[] = [
  ...client_menu_buttons.map((el) => ({ role: Roles.CLIENT, ...el })),
  ...trader_menu_buttons.map((el) => ({ role: Roles.TRADER, ...el })),
  ...admin_menu_buttons.map((el) => ({ role: Roles.ADMIN, ...el })),
];
