import { BrowserManager } from './core/browser';
import { LoginModule } from './modules/login';
import { OrderModule } from './modules/order';
import { FileReaderUtil } from './utils/file-reader';
import { Logger } from './utils/logger';
import { ScreenshotUtil } from './utils/screenshot';
import { retry, sleep } from './utils/retry';
import { OrderResult, ExecutionSummary, OrderBatch } from './types/order';
import config from '../config';

export interface RunOptions {
  dataFilePath?: string;
  salesName?: string;
  headless?: boolean;
}

export class PrecisePipeAutomation {
  private logger: Logger;
  private browserManager: BrowserManager | null = null;
  private results: OrderResult[] = [];

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = config.logLevel) {
    this.logger = new Logger(logLevel, config.logDir);
  }

  /**
   * 运行自动化流程
   */
  async run(options: RunOptions = {}): Promise<ExecutionSummary> {
    const startTime = new Date();
    const filePath = options.dataFilePath || config.dataFilePath;

    this.logger.separator();
    this.logger.info('   PrecisePipe 自动化下单工具');
    this.logger.info(`   启动时间: ${startTime.toLocaleString()}`);
    this.logger.separator();

    try {
      // 1. 读取订单数据
      this.logger.info('步骤 1: 读取订单数据');
      const fileReader = new FileReaderUtil(this.logger);
      const orderBatch = await fileReader.readOrders(filePath);

      if (orderBatch.orders.length === 0) {
        throw new Error('订单文件中没有订单数据');
      }

      // 2. 启动浏览器
      this.logger.info('步骤 2: 启动浏览器');
      const browserConfig = {
        ...config.browser,
        headless: options.headless ?? config.browser.headless,
      };
      this.browserManager = new BrowserManager(browserConfig, this.logger);
      const page = await this.browserManager.launch();

      // 3. 导航到网站
      this.logger.info('步骤 3: 导航到网站');
      await this.browserManager.navigate(config.baseUrl + '/quote/quote_Line_Pipe.html');

      // 4. 登录
      this.logger.info('步骤 4: 执行登录');
      const loginModule = new LoginModule(page, this.logger, config.login.slackCodeTimeout);

      const salesName = options.salesName || 'Alex Chow'; // 默认使用 Alex Chow
      const loginSuccess = await loginModule.login({ salesName });

      if (!loginSuccess) {
        throw new Error('登录失败');
      }

      // 5. 处理订单
      this.logger.info('步骤 5: 开始处理订单');
      const screenshotUtil = new ScreenshotUtil(page, this.logger, config.screenshotDir);
      const orderModule = new OrderModule(page, this.logger, screenshotUtil);

      const maxRetries = orderBatch.config?.maxRetries || 1;
      const screenshotOnError = orderBatch.config?.screenshotOnError ?? true;

      for (let i = 0; i < orderBatch.orders.length; i++) {
        const order = orderBatch.orders[i];
        this.logger.info(`处理订单 ${i + 1}/${orderBatch.orders.length}`);

        let result: OrderResult;
        if (maxRetries > 1) {
          result = await retry(
            () => orderModule.executeOrder(order),
            { maxAttempts: maxRetries, delayMs: 2000 },
            this.logger
          );
        } else {
          result = await orderModule.executeOrder(order);
        }

        if (result.status === 'failed' && screenshotOnError && !result.screenshotPath) {
          result.screenshotPath = await screenshotUtil.captureError(order.id);
        }

        this.results.push(result);

        // 订单间延迟
        const delay = orderBatch.config?.delayBetweenOrders || 2000;
        if (i < orderBatch.orders.length - 1) {
          this.logger.debug(`等待 ${delay}ms 后处理下一个订单...`);
          await sleep(delay);
        }
      }

      // 6. 输出结果汇总
      const summary = this.generateSummary(orderBatch, startTime);

      this.logger.separator();
      this.logger.info('   执行结果汇总');
      this.logger.separator();
      this.logger.info(`总订单数: ${summary.totalOrders}`);
      this.logger.info(`成功: ${summary.successCount}`);
      this.logger.info(`失败: ${summary.failedCount}`);
      this.logger.separator();

      return summary;

    } catch (error) {
      this.logger.error('自动化流程执行失败', error);
      throw error;
    } finally {
      // 关闭浏览器
      if (this.browserManager) {
        this.logger.info('关闭浏览器...');
        await this.browserManager.close();
      }

      this.logger.info(`执行结束时间: ${new Date().toLocaleString()}`);
    }
  }

  /**
   * 生成执行结果汇总
   */
  private generateSummary(batch: OrderBatch, startTime: Date): ExecutionSummary {
    const endTime = new Date();
    const successCount = this.results.filter((r) => r.status === 'success').length;
    const failedCount = this.results.filter((r) => r.status === 'failed').length;

    return {
      batchName: batch.batchName,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalOrders: this.results.length,
      successCount,
      failedCount,
      results: this.results,
    };
  }

  /**
   * 仅验证订单文件
   */
  async validateOrders(filePath: string): Promise<boolean> {
    const fileReader = new FileReaderUtil(this.logger);

    try {
      const batch = await fileReader.readOrders(filePath);
      this.logger.info(`验证通过: ${batch.orders.length} 个订单`);
      return true;
    } catch (error) {
      this.logger.error('验证失败', error);
      return false;
    }
  }
}

export default PrecisePipeAutomation;
