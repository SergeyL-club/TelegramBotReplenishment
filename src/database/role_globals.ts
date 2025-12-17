export enum Roles {
  CLIENT = "client",
  TRADER = "trader",
  ADMIN = "admin",
}
export type RolesValue = (typeof Roles)[keyof typeof Roles];
export type RolesKeys = keyof typeof Roles;

export type MenuButton = { text: string; positions: [row: number, col: number] };
export type Command = { command: string; description: string };

export const client_commands: Command[] = [{ command: "/code", description: "Активировать роль по токену" }] as const;

export const client_menu_buttons: MenuButton[] = [{ text: "Тест", positions: [0, 0] }] as const;
export const trader_menu_buttons: MenuButton[] = [] as const;
export const admin_menu_buttons: MenuButton[] = [] as const;

export const menu_buttons: (MenuButton & { role: RolesValue })[] = [
  ...client_menu_buttons.map((el) => ({ role: Roles.CLIENT, ...el })),
  ...trader_menu_buttons.map((el) => ({ role: Roles.TRADER, ...el })),
  ...admin_menu_buttons.map((el) => ({ role: Roles.ADMIN, ...el })),
];

export function fragmentation_menu(menus: MenuButton[]): string[][] {
  const menu_commands: string[][] = [];
  for (const menu_command of menus) {
    let row = menu_command.positions[0];
    const col = menu_command.positions[1];
    while (menu_commands.length <= row) {
      menu_commands.push([]);
    }
    while (menu_commands[row]?.[col]) {
      row++;
      if (!menu_commands[row]) menu_commands[row] = [];
    }
    menu_commands[row]![col] = menu_command.text;
  }
  return menu_commands;
}

export function menu_roles(roles: RolesValue[]): MenuButton[] {
  return menu_buttons.filter((el) => roles.includes(el.role));
}

export function command_roles(): Command[] {
  return client_commands;
}
