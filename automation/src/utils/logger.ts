import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private logLevel: LogLevel;
  private logDir: string;
  private logFile: string;

  constructor(logLevel: LogLevel = 'info', logDir: string = './logs') {
    this.logLevel = logLevel;
    this.logDir = logDir;
    this.logFile = path.join(logDir, `automation-${this.getDateString()}.log`);

    // 确保日志目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLogLine(level: LogLevel, message: string, data?: unknown): string {
    let formatted = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}`;
    if (data !== undefined) {
      formatted += ' ' + (typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data));
    }
    return formatted;
  }

  private writeLog(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const logLine = this.formatLogLine(level, message, data);

    // 写入文件
    fs.appendFileSync(this.logFile, logLine + '\n');

    // 控制台输出（带颜色）
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';

    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`${colors[level]}${logLine}${reset}`);
  }

  debug(message: string, data?: unknown): void {
    this.writeLog('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.writeLog('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.writeLog('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.writeLog('error', message, data);
    // 确保错误总是输出到控制台
    if (data instanceof Error) {
      console.error(`Error details: ${data.message}`);
      console.error(`Stack: ${data.stack}`);
    }
  }

  /**
   * 记录分隔线
   */
  separator(char: string = '=', length: number = 50): void {
    const line = char.repeat(length);
    this.info(line);
    console.log(line);
  }
}

// 默认 logger 实例
export const logger = new Logger('info');

export default Logger;
