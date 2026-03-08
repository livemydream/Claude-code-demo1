import * as fs from 'fs';
import * as path from 'path';
import { Page } from 'playwright';
import { Logger } from './logger';

export class ScreenshotUtil {
  private page: Page;
  private logger: Logger;
  private screenshotDir: string;

  constructor(page: Page, logger: Logger, screenshotDir: string = './screenshots') {
    this.page = page;
    this.logger = logger;
    this.screenshotDir = screenshotDir;

    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  }

  /**
   * 生成文件名
   */
  private generateFilename(prefix: string, id?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const idPart = id ? `-${id}` : '';
    return `${prefix}${idPart}-${timestamp}.png`;
  }

  /**
   * 捕获错误截图
   */
  async captureError(orderId: string): Promise<string> {
    const filename = this.generateFilename('error', orderId);
    const filePath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({
      path: filePath,
      fullPage: true,
    });

    this.logger.debug(`错误截图已保存: ${filePath}`);
    return filePath;
  }

  /**
   * 捕获成功截图
   */
  async captureSuccess(orderId: string): Promise<string> {
    const filename = this.generateFilename('success', orderId);
    const filePath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({
      path: filePath,
      fullPage: true,
    });

    this.logger.debug(`成功截图已保存: ${filePath}`);
    return filePath;
  }

  /**
   * 捕获步骤截图（用于调试）
   */
  async captureStep(stepName: string): Promise<string> {
    const filename = this.generateFilename('step', stepName);
    const filePath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({
      path: filePath,
    });

    return filePath;
  }

  /**
   * 捕获当前页面截图
   */
  async capture(filename?: string): Promise<string> {
    const filePath = path.join(this.screenshotDir, filename || this.generateFilename('capture'));

    await this.page.screenshot({
      path: filePath,
      fullPage: true,
    });

    return filePath;
  }
}

export default ScreenshotUtil;
