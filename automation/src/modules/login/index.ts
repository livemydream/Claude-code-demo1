import { Page } from 'playwright';
import { Logger } from '../../utils/logger';
import selectors from '../../../config/selectors';

export interface LoginOptions {
  salesName: string;
  slackCodeTimeout?: number;
  captchaCode?: string;
  slackCode?: string;
}

export class LoginModule {
  private page: Page;
  private logger: Logger;
  private slackCodeTimeout: number;
  private captchaCode: string;
  private slackCode: string;

  constructor(
    page: Page,
    logger: Logger,
    slackCodeTimeout: number = 120000,
    captchaCode?: string,
    slackCode?: string
  ) {
    this.page = page;
    this.logger = logger;
    this.slackCodeTimeout = slackCodeTimeout;
    this.captchaCode = captchaCode || process.env.PRECISEPIPE_CAPTCHA_CODE || '';
    this.slackCode = slackCode || process.env.PRECISEPIPE_SLACK_CODE || '';
  }

  /**
   * 执行完整登录流程
   */
  async login(options: LoginOptions): Promise<boolean> {
    try {
      this.logger.info('开始登录流程...');
      this.logger.separator('-', 40);

      // 步骤 1: 计算 captcha (1+2=3)
      await this.solveCaptcha();

      // 步骤 2: 选择 Sales
      await this.selectSales(options.salesName);

      // 步骤 3: 点击 Email Login
      await this.clickEmailLogin();

      // 步骤 4: 输入 Slack 验证码
      const slackCode = await this.getSlackCodeFromConsole();
      await this.enterSlackCode(slackCode);

      // 步骤 5: 验证登录成功
      const isLoggedIn = await this.verifyLoginSuccess();

      this.logger.separator('-', 40);

      if (isLoggedIn) {
        this.logger.info('✓ 登录成功');
        return true;
      } else {
        this.logger.error('✗ 登录验证失败');
        return false;
      }
    } catch (error) {
      this.logger.error('登录过程出错', error);
      throw error;
    }
  }

  /**
   * 输入固定 captcha 验证码
   */
  private async solveCaptcha(): Promise<void> {
    this.logger.debug(`输入固定 captcha 验证码: ${this.captchaCode}`);

    try {
      // 等待页面加载
      await this.page.waitForLoadState('networkidle');

      // 输入固定验证码
      const captchaInput = await this.page.$('input[type="number"]');
      if (captchaInput) {
        await captchaInput.fill(this.captchaCode);
        this.logger.info(`已输入图形验证码: ${this.captchaCode}`);
      } else {
        throw new Error('未找到图形验证码输入框');
      }
    } catch (error) {
      this.logger.error('Captcha 输入失败', error);
      throw error;
    }
  }

  /**
   * 选择 Sales 人员
   */
  private async selectSales(salesName: string): Promise<void> {
    this.logger.debug(`选择 Sales: ${salesName}`);

    // 等待页面完全加载
    await this.page.waitForLoadState('domcontentloaded');

    // 点击下拉框 - 尝试多种选择器
    const dropdownSelectors = [
      selectors.login.salesDropdown,
      'input[placeholder*="Sales"]',
      '.ant-select-selector',
      '[role="combobox"]'
    ];

    let dropdown = null;
    for (const selector of dropdownSelectors) {
      dropdown = await this.page.$(selector);
      if (dropdown) {
        this.logger.debug(`找到下拉框: ${selector}`);
        break;
      }
    }

    if (!dropdown) {
      throw new Error('未找到 Sales 下拉框');
    }

    await dropdown.click();

    // 选择指定的 Sales - 支持 layui 和 ant-design
    const optionSelectors = [
      selectors.login.salesOption(salesName),
      `text="${salesName}"`,
      `.layui-form-select dd:has-text("${salesName}")`,
      `.ant-select-item:has-text("${salesName}")`,
      `[title="${salesName}"]`
    ];

    let option = null;
    for (const selector of optionSelectors) {
      try {
        option = await this.page.waitForSelector(selector, { timeout: 2000 });
        if (option) {
          this.logger.debug(`找到选项: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!option) {
      // 列出可用的 Sales - 支持 layui 和 ant-design 两种框架
      const allOptions = await this.page.$$('.layui-form-select dd, .ant-select-item, [role="option"]');
      const availableNames: string[] = [];
      for (const opt of allOptions) {
        const text = await opt.textContent();
        if (text && text.trim() && !text.includes('Please select')) {
          availableNames.push(text.trim());
        }
      }
      throw new Error(`未找到 Sales "${salesName}"，可选: ${availableNames.join(', ')}`);
    }

    await option.click();

    this.logger.info(`已选择 Sales: ${salesName}`);
  }

  /**
   * 点击 Email Login 按钮
   */
  private async clickEmailLogin(): Promise<void> {
    this.logger.debug('点击 Email Login 按钮...');

    const btn = await this.page.$(selectors.login.emailLoginBtn);
    if (!btn) {
      throw new Error('未找到 Email Login 按钮');
    }

    await btn.click();
    this.logger.info('已点击 Email Login，请查收 Slack 验证码');
  }

  /**
   * 获取固定的 Slack 验证码
   */
  private getSlackCodeFromConsole(): Promise<string> {
    this.logger.info(`使用固定 Slack 验证码: ${this.slackCode}`);
    return Promise.resolve(this.slackCode);
  }

  /**
   * 输入 Slack 验证码
   */
  private async enterSlackCode(code: string): Promise<void> {
    this.logger.debug('输入 Slack 验证码...');

    // 等待验证码输入框出现
    await this.page.waitForSelector(selectors.login.slackCodeInput, {
      timeout: this.slackCodeTimeout,
    });

    // 输入验证码
    await this.page.fill(selectors.login.slackCodeInput, code);

    // 点击登录按钮
    const loginBtn = await this.page.$(selectors.login.loginBtn);
    if (loginBtn) {
      await loginBtn.click();
    }

    this.logger.debug('已提交验证码');
  }

  /**
   * 验证登录是否成功
   */
  private async verifyLoginSuccess(): Promise<boolean> {
    this.logger.debug('验证登录状态...');

    try {
      // 等待页面跳转或显示用户信息
      await this.page.waitForURL(/quote_Line_Pipe/, { timeout: 10000 });
      await this.page.waitForLoadState('networkidle');

      // 检查是否显示了用户名
      const userName = await this.page.$(selectors.login.userName);
      if (userName) {
        const name = await userName.textContent();
        this.logger.debug(`检测到用户: ${name}`);
        return true;
      }

      // 检查是否在报价页面
      const currentUrl = this.page.url();
      if (currentUrl.includes('quote_Line_Pipe')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 检查是否已登录
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const currentUrl = this.page.url();
      if (currentUrl.includes('login')) {
        return false;
      }

      const indicator = await this.page.$(selectors.login.userProfile);
      return indicator !== null;
    } catch {
      return false;
    }
  }
}

export default LoginModule;
