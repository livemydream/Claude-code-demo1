/**
 * 浏览器配置
 */
export interface BrowserConfig {
  /** 是否使用无头模式 */
  headless: boolean;
  /** 视口宽度 */
  viewportWidth: number;
  /** 视口高度 */
  viewportHeight: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 慢动作延迟（用于调试） */
  slowMo?: number;
}

/**
 * 登录配置
 */
export interface LoginConfig {
  /** Slack 验证码等待超时（毫秒） */
  slackCodeTimeout: number;
}

/**
 * 自动化配置
 */
export interface AutomationConfig {
  /** 目标网站 URL */
  baseUrl: string;
  /** 浏览器配置 */
  browser: BrowserConfig;
  /** 登录配置 */
  login: LoginConfig;
  /** 数据文件路径 */
  dataFilePath: string;
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 日志目录 */
  logDir: string;
  /** 截图目录 */
  screenshotDir: string;
}
