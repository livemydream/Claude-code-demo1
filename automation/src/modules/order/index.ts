import { Page, Frame } from 'playwright';
import { Logger } from '../../utils/logger';
import { ScreenshotUtil } from '../../utils/screenshot';
import { retry, sleep } from '../../utils/retry';
import { OrderItem, OrderResult } from '../../types/order';
import selectors from '../../../config/selectors';

export class OrderModule {
  private page: Page;
  private logger: Logger;
  private screenshotUtil: ScreenshotUtil;

  constructor(page: Page, logger: Logger, screenshotUtil: ScreenshotUtil) {
    this.page = page;
    this.logger = logger;
    this.screenshotUtil = screenshotUtil;
  }

  /**
   * 执行单个订单
   */
  async executeOrder(order: OrderItem): Promise<OrderResult> {
    const startTime = new Date();

    this.logger.info('');
    this.logger.info(`========== 处理订单: ${order.id} ==========`);
    this.logger.debug(`规格: NPS ${order.spec.nps} / ${order.spec.schedule}`);
    this.logger.debug(`数量: ${order.quantity} ${order.unit}`);

    try {
      // 步骤 1: 选择规格（点击表格单元格）
      await this.selectSpec(order.spec.nps, order.spec.schedule);

      // 步骤 2: 等待详情面板加载（iframe）
      const frame = await this.waitForDetailPanel();

      // 步骤 3: 填写订单参数
      await this.fillOrderParams(frame, order);

      // 步骤 4: 添加到报价单
      await this.addToQuote(frame);

      // 步骤 5: 关闭面板
      await this.closePanel();

      this.logger.info(`✓ 订单 ${order.id} 处理成功`);

      return {
        orderId: order.id,
        status: 'success',
        executedAt: startTime.toISOString(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const screenshotPath = await this.screenshotUtil.captureError(order.id);

      this.logger.error(`✗ 订单 ${order.id} 处理失败: ${errorMessage}`);

      return {
        orderId: order.id,
        status: 'failed',
        error: errorMessage,
        executedAt: startTime.toISOString(),
        screenshotPath,
      };
    }
  }

  /**
   * 选择规格（点击表格单元格）
   */
  private async selectSpec(nps: string, schedule: string): Promise<void> {
    this.logger.debug('选择规格...');

    // 使用 retry 包装，处理可能的点击失败
    await retry(
      async () => {
        // 构建选择器：找到 NPS 行和 Schedule 列的交叉点
        // 根据实际页面结构，NPS 在第一列，壁厚在对应列
        const npsCell = await this.page.$(`text="${nps}"`);
        if (!npsCell) {
          throw new Error(`未找到 NPS: ${nps}`);
        }

        // 找到 NPS 所在的行
        const row = await npsCell.$('xpath=ancestor::tr');
        if (!row) {
          throw new Error('未找到规格行');
        }

        // 找到对应 Schedule 的单元格
        // STD 通常是第 6 列（根据实际页面调整）
        const scheduleHeader = await this.page.$(`th:has-text("${schedule}")`);
        if (!scheduleHeader) {
          throw new Error(`未找到 Schedule: ${schedule}`);
        }

        // 获取 Schedule 列的索引
        const headerRow = await scheduleHeader.$('xpath=ancestor::tr');
        const allHeaders = await headerRow?.$$('th');
        let scheduleIndex = -1;

        if (allHeaders) {
          for (let i = 0; i < allHeaders.length; i++) {
            const text = await allHeaders[i].textContent();
            if (text?.trim() === schedule) {
              scheduleIndex = i;
              break;
            }
          }
        }

        if (scheduleIndex === -1) {
          throw new Error(`无法确定 ${schedule} 列的位置`);
        }

        // 获取该行的所有单元格
        const cells = await row.$$('td');

        // 索引需要考虑第一列是 NPS
        const targetCell = cells[scheduleIndex - 1]; // 减1因为第一列是 th 不是 td

        if (!targetCell) {
          // 如果找不到，尝试直接通过文本匹配
          const cellText = await this.page.$(`tr:has(td:has-text("${nps}")) td:has-text("0.109")`);
          if (cellText) {
            await cellText.click();
            return;
          }
          throw new Error(`未找到规格单元格: NPS=${nps}, Schedule=${schedule}`);
        }

        await targetCell.click();
      },
      { maxAttempts: 3, delayMs: 1000 },
      this.logger
    );

    this.logger.debug('规格已选择');
    await sleep(500);
  }

  /**
   * 等待详情面板加载并返回 iframe
   */
  private async waitForDetailPanel(): Promise<Frame> {
    this.logger.debug('等待详情面板加载...');

    // 等待 iframe 出现
    const iframeElement = await this.page.waitForSelector('iframe', {
      timeout: 10000,
    });

    const frame = await iframeElement.contentFrame();
    if (!frame) {
      throw new Error('无法获取 iframe 内容');
    }

    // 等待 iframe 内容加载
    await frame.waitForLoadState('networkidle');

    this.logger.debug('详情面板已加载');
    return frame;
  }

  /**
   * 填写订单参数
   */
  private async fillOrderParams(frame: Frame, order: OrderItem): Promise<void> {
    this.logger.debug('填写订单参数...');

    // 填写数量
    const quantityInput = await frame.$(selectors.orderPanel.quantityInput);
    if (quantityInput) {
      await quantityInput.fill(order.quantity.toString());
      this.logger.debug(`数量已填写: ${order.quantity}`);
    } else {
      throw new Error('未找到数量输入框');
    }

    // 选择单位（如果需要）
    if (order.unit !== 'FT') {
      const unitSelect = await frame.$(selectors.orderPanel.unitDropdown);
      if (unitSelect) {
        await unitSelect.selectOption(order.unit);
        this.logger.debug(`单位已选择: ${order.unit}`);
      }
    }

    // 填写备注（如果有）
    if (order.remark) {
      const remarkInput = await frame.$('textarea');
      if (remarkInput) {
        await remarkInput.fill(order.remark);
      }
    }

    await sleep(300);
  }

  /**
   * 添加到报价单
   */
  private async addToQuote(frame: Frame): Promise<void> {
    this.logger.debug('添加到报价单...');

    const addBtn = await frame.$(selectors.orderPanel.addToQuoteBtn);
    if (!addBtn) {
      throw new Error('未找到 "Add to Quote" 按钮');
    }

    await addBtn.click();
    this.logger.debug('已点击 Add to Quote');

    // 等待操作完成
    await sleep(1000);
  }

  /**
   * 关闭详情面板
   */
  private async closePanel(): Promise<void> {
    this.logger.debug('关闭详情面板...');

    // 点击返回按钮或关闭按钮
    const closeBtn = await this.page.$(selectors.orderPanel.backBtn);
    if (closeBtn) {
      await closeBtn.click();
    } else {
      // 尝试按 Escape 键关闭
      await this.page.keyboard.press('Escape');
    }

    await sleep(500);
  }

  /**
   * 提交所有订单
   */
  async submitAll(): Promise<string> {
    this.logger.info('提交订单...');

    // 点击 Next 按钮
    const nextBtn = await this.page.$(selectors.quote.nextBtn);
    if (nextBtn) {
      await nextBtn.click();
      await this.page.waitForLoadState('networkidle');
    }

    // 点击 Submit 按钮
    const submitBtn = await this.page.$(selectors.quote.submitBtn);
    if (submitBtn) {
      await submitBtn.click();
      await this.page.waitForLoadState('networkidle');
    }

    // 获取报价单号
    const quoteNumberEl = await this.page.$(selectors.quote.quoteNumberDisplay);
    const quoteNumber = quoteNumberEl
      ? await quoteNumberEl.textContent()
      : undefined;

    if (quoteNumber) {
      this.logger.info(`报价单号: ${quoteNumber}`);
    }

    return quoteNumber || '';
  }
}

export default OrderModule;
