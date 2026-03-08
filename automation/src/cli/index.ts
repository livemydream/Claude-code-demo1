#!/usr/bin/env node

import { program } from 'commander';
import PrecisePipeAutomation from '../index';
import { Logger } from '../utils/logger';

const logger = new Logger('info');

program
  .name('precisepipe-automation')
  .description('PrecisePipe 网站自动化下单工具')
  .version('1.0.0');

program
  .command('run')
  .description('执行自动化下单')
  .option('-f, --file <path>', '订单数据文件路径', './data/orders.json')
  .option('-s, --sales <name>', 'Sales 名称', 'Alex Chow')
  .option('-H, --headless', '使用无头模式运行', false)
  .option('-v, --verbose', '显示详细日志', false)
  .action(async (options) => {
    try {
      const automation = new PrecisePipeAutomation(
        options.verbose ? 'debug' : 'info'
      );

      const summary = await automation.run({
        dataFilePath: options.file,
        salesName: options.sales,
        headless: options.headless,
      });

      // 输出最终结果
      console.log('\n');
      console.log('========================================');
      console.log('            执行结果汇总                ');
      console.log('========================================');
      console.log(`批次名称: ${summary.batchName}`);
      console.log(`开始时间: ${summary.startTime}`);
      console.log(`结束时间: ${summary.endTime}`);
      console.log(`总订单数: ${summary.totalOrders}`);
      console.log(`成功数量: ${summary.successCount}`);
      console.log(`失败数量: ${summary.failedCount}`);
      console.log('========================================');

      if (summary.failedCount > 0) {
        console.log('\n失败订单详情:');
        summary.results
          .filter((r) => r.status === 'failed')
          .forEach((r) => {
            console.log(`  - ${r.orderId}: ${r.error}`);
          });
      }

      process.exit(summary.failedCount > 0 ? 1 : 0);

    } catch (error) {
      logger.error('执行失败', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('验证订单数据文件格式')
  .argument('<file>', '订单数据文件路径')
  .action(async (file) => {
    const automation = new PrecisePipeAutomation('debug');

    try {
      const isValid = await automation.validateOrders(file);

      if (isValid) {
        console.log('✓ 订单文件验证通过');
        process.exit(0);
      } else {
        console.log('✗ 订单文件验证失败');
        process.exit(1);
      }
    } catch (error) {
      console.error('验证失败:', error);
      process.exit(1);
    }
  });

program.parse();
