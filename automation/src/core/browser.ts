import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BrowserConfig } from '../types/config';
import { Logger } from '../utils/logger';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserConfig;
  private logger: Logger;

  constructor(config: BrowserConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * 启动浏览器
   */
  async launch(): Promise<Page> {
    this.logger.info('正在启动浏览器...');

    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
    });

    this.context = await this.browser.newContext({
      viewport: {
        width: this.config.viewportWidth,
        height: this.config.viewportHeight,
      },
      // 设置用户代理
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    this.page = await this.context.newPage();

    // 设置默认超时
    this.page.setDefaultTimeout(this.config.timeout);
    this.page.setDefaultNavigationTimeout(this.config.timeout);

    this.logger.info('浏览器启动成功');
    return this.page;
  }

  /**
   * 导航到指定 URL
   */
  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('浏览器未启动');
    }

    this.logger.info(`导航到: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * 获取当前页面
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('页面未初始化，请先调用 launch()');
    }
    return this.page;
  }

  /**
   * 保存登录状态
   */
  async saveSession(filePath: string): Promise<void> {
    if (!this.context) {
      throw new Error('浏览器上下文未初始化');
    }
    await this.context.storageState({ path: filePath });
    this.logger.info(`登录状态已保存到: ${filePath}`);
  }

  /**
   * 加载登录状态（需在 launch 之前调用，重新创建带状态的 context）
   */
  async loadSession(filePath: string): Promise<Page> {
    this.logger.info(`从 ${filePath} 加载登录状态`);

    if (!this.browser) {
      throw new Error('浏览器未启动，请先调用 launch()');
    }

    // 关闭旧的 context
    if (this.context) {
      await this.context.close();
    }

    this.context = await this.browser.newContext({
      viewport: {
        width: this.config.viewportWidth,
        height: this.config.viewportHeight,
      },
      storageState: filePath,
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout);
    this.page.setDefaultNavigationTimeout(this.config.timeout);

    this.logger.info('登录状态已加载');
    return this.page;
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.logger.info('浏览器已关闭');
    }
  }

  /**
   * 截图
   */
  async screenshot(filePath: string, fullPage: boolean = true): Promise<void> {
    if (!this.page) {
      throw new Error('页面未初始化');
    }
    await this.page.screenshot({ path: filePath, fullPage });
    this.logger.debug(`截图已保存: ${filePath}`);
  }

  /**
   * 等待页面加载完成
   */
  async waitForLoad(): Promise<void> {
    if (!this.page) {
      throw new Error('页面未初始化');
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 检查是否有弹窗
   */
  async checkForDialog(): Promise<boolean> {
    if (!this.page) return false;

    const dialog = await this.page.$('dialog, .modal, [role="dialog"]');
    return dialog !== null;
  }
}

export default BrowserManager;
