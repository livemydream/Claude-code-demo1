import { AutomationConfig } from '../src/types/config';

export const config: AutomationConfig = {
  baseUrl: 'http://precisepipe-api.activatortube.com',

  browser: {
    headless: false, // 手动触发时使用有头模式，便于观察
    viewportWidth: 1920,
    viewportHeight: 1080,
    timeout: 30000,
    slowMo: 100, // 稍微放慢操作，便于调试
  },

  login: {
    slackCodeTimeout: 120000, // 2分钟等待 Slack 验证码
  },

  dataFilePath: './data/orders.json',
  logLevel: 'info',
  logDir: './logs',
  screenshotDir: './screenshots',
};

export default config;
