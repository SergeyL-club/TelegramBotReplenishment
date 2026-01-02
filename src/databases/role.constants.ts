export enum Roles {
  CLIENT = "CLIENT",
  TRADER = "TRADER",
  ADMIN = "ADMIN",
}

export const role_codes: { [key in Roles]: string } = {
  [Roles.CLIENT]: process.env[`${Roles.CLIENT}_TOKEN`] ?? "",
  [Roles.TRADER]: process.env[`${Roles.TRADER}_TOKEN`] ?? "",
  [Roles.ADMIN]: process.env[`${Roles.ADMIN}_TOKEN`] ?? "",
} as const;

export type Command = { command: string; description: string };
export const commands: { [key in Roles]: Command[] } = {
  [Roles.CLIENT]: [{ command: "/code", description: "получить доступ к функциям по токену" }],
  [Roles.TRADER]: [],
  [Roles.ADMIN]: [],
} as const;

export type MenuButton = { text: string; positions: [x: number, y: number] };
export const menus: { [key in Roles]: MenuButton[] } = {
  [Roles.CLIENT]: [],
  [Roles.TRADER]: [],
  [Roles.ADMIN]: [],
} as const;

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
