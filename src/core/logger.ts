import fs from "fs";
import path from "path";
import chalk from "chalk";

enum LogLevelEnum {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  LOG = "log",
}

type LogLevel = `${LogLevelEnum}`;
const log_leves: LogLevel[] = Object.values(LogLevelEnum);

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: unknown;
}

interface DateFormat {
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  seconds: string;
}

interface LoggerOptions {
  save_file_diir?: string;
}

const color_picker: Record<LogLevel, (text: string) => string> = {
  info: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  log: chalk.cyan,
} as const;

export class Logger {
  private save_file_dir: string;

  public constructor(options: LoggerOptions = {}) {
    this.save_file_dir = path.resolve(options.save_file_diir || "./logs");
    if (!fs.existsSync(this.save_file_dir)) fs.mkdirSync(this.save_file_dir, { recursive: true });
  }

  private parse_regex_format(line: string): LogEntry | null {
    const regex = /^\[([^\]]+)\]:\[([^\]]+)\]\s+([\s\S]*?)(\{.*\})?$/;
    const math = line.match(regex);
    if (!math) return null;

    const [, timestamp_raw, level_raw, message_raw, json_raw] = math;
    const timestamp = timestamp_raw ?? new Date().toISOString();
    const level = (level_raw ?? "log").toLowerCase() as LogLevel;
    let message = message_raw ?? "";
    let meta: unknown | undefined = undefined;
    if (level === "log" && message.trim() === "") return null;

    if (json_raw) {
      try {
        meta = JSON.parse(json_raw);
      } catch {
        message += " " + json_raw;
      }
    }

    return { timestamp, level, message, meta };
  }

  private async parse_log_file(file_path: string, line_count: number = 10): Promise<LogEntry[]> {
    if (!fs.existsSync(file_path)) return [];

    const size = (await fs.promises.stat(file_path)).size;
    const chunk_size = 4096;
    let position = size;
    let leftover = "";
    const lines: string[] = [];

    while (position > 0 && lines.length < line_count) {
      const start = Math.max(0, position - chunk_size);
      const length = position - start;

      const buffer = Buffer.alloc(length);
      const fd = await fs.promises.open(file_path, "r");
      await fd.read(buffer, 0, length, start);
      await fd.close();

      const chunk = buffer.toString("utf8");
      position = start;

      const parts = (chunk + leftover).split("\n");
      leftover = parts.shift() ?? "";

      for (let i = parts.length - 1; i >= 0; i--) {
        const line = parts[i];
        if (!line) continue;
        lines.push(line.trim());
        if (lines.length >= line_count) break;
      }
    }

    const parsed = lines.map((line) => this.parse_regex_format(line)).filter((x) => x !== null);

    return parsed;
  }

  private to_date_json(timestamp: string | number): DateFormat {
    const date_obj = new Date(timestamp);

    const year = date_obj.getFullYear().toString();
    const month = (date_obj.getMonth() + 1).toString().padStart(2, "0");
    const day = date_obj.getDay().toString().padStart(2, "0");
    const hours = date_obj.getHours().toString().padStart(2, "0");
    const minutes = date_obj.getMinutes().toString().padStart(2, "0");
    const seconds = date_obj.getSeconds().toString().padStart(2, "0");

    return { year, month, day, hours, minutes, seconds };
  }

  private date_folder_format(date: DateFormat): string {
    return `${date.year}-${date.month}-${date.day}`;
  }

  private to_log_level(str: string): LogLevel | undefined {
    const lower = str.toLowerCase();
    return log_leves.includes(lower as LogLevel) ? (str as LogLevel) : undefined;
  }

  private format(entry: LogEntry, for_console = false): string {
    let base = `[${entry.timestamp}]:[${for_console ? entry.level : entry.level.toUpperCase()}] ${entry.message.trim()}`;
    if (entry.meta === undefined) return base;
    if (entry.meta instanceof Error) {
      base += " " + JSON.stringify({ name: entry.meta.name, message: entry.meta.message, stack: entry.meta.stack }, undefined, 0);
    } else base += " " + JSON.stringify(entry.meta, undefined, 0);
    base = base.replace(/\r?\n/g, " | ");
    base = base.replace(/[\uD800-\uDFFF]/g, "");
    return base;
  }

  private get_color<T extends LogLevel>(level: T, text: string): T {
    return color_picker[level](this.to_log_level(text) ?? level) as T;
  }

  private get_separator(): string {
    const width = process.stdout.columns || 80;
    return "-".repeat(width);
  }

  private async write_to_file(entry: LogEntry): Promise<void> {
    const date_folder = path.join(this.save_file_dir, this.date_folder_format(this.to_date_json(entry.timestamp)));
    if (!fs.existsSync(date_folder)) fs.mkdirSync(date_folder, { recursive: true });

    const level_file = path.join(date_folder, `${entry.level}.log`);
    const all_file = path.join(date_folder, "all.log");

    const formatted_message = this.format(entry) + "\n";

    await Promise.all([fs.promises.appendFile(level_file, formatted_message), fs.promises.appendFile(all_file, formatted_message)]);
  }

  private print_block(entry: LogEntry): void {
    const separator = this.get_separator();
    const colored_level = this.get_color(entry.level, entry.level.toUpperCase());

    const modify_entry: LogEntry = { ...entry };
    modify_entry.level = colored_level;
    const formatted_message = this.format(modify_entry, true);

    console.log(separator);
    console.log(formatted_message);
  }

  private async write(level: LogLevel, message: string, meta?: unknown): Promise<void> {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = { timestamp, level, message, meta };

    this.print_block(entry);
    await this.write_to_file(entry);
  }

  public current_path_logs(level: LogLevel = "log"): { level_file: string; all_file: string } {
    const date_folder = path.join(this.save_file_dir, this.date_folder_format(this.to_date_json(new Date().toISOString())));
    const level_file = path.join(date_folder, `${level}.log`);
    const all_file = path.join(date_folder, "all.log");
    return { level_file, all_file };
  }

  public async read(file_path: string, line_count: number = 10): Promise<LogEntry[]> {
    return await this.parse_log_file(file_path, line_count);
  }

  public info(msg: string, meta?: unknown): Promise<void> {
    return this.write("info", msg, meta);
  }
  public warn(msg: string, meta?: unknown): Promise<void> {
    return this.write("warn", msg, meta);
  }
  public error(msg: string, meta?: unknown): Promise<void> {
    return this.write("error", msg, meta);
  }
  public log(msg: string, meta?: unknown): Promise<void> {
    return this.write("log", msg, meta);
  }
}

export const default_logger = new Logger();
