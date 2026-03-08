import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { OrderItem, OrderBatch } from '../types/order';
import { Logger } from './logger';

export class FileReaderUtil {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 读取 JSON 格式的订单文件
   */
  async readJsonOrders(filePath: string): Promise<OrderBatch> {
    this.logger.info(`读取 JSON 订单文件: ${filePath}`);

    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`订单文件不存在: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const batch: OrderBatch = JSON.parse(content);

    this.validateOrderBatch(batch);
    this.logger.info(`成功读取 ${batch.orders.length} 个订单`);

    return batch;
  }

  /**
   * 读取 CSV 格式的订单文件
   */
  async readCsvOrders(filePath: string): Promise<OrderBatch> {
    this.logger.info(`读取 CSV 订单文件: ${filePath}`);

    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`订单文件不存在: ${absolutePath}`);
    }

    return new Promise((resolve, reject) => {
      const orders: OrderItem[] = [];

      fs.createReadStream(absolutePath)
        .pipe(csv())
        .on('data', (row: Record<string, string>) => {
          const order = this.parseCsvRow(row);
          orders.push(order);
        })
        .on('end', () => {
          this.logger.info(`成功读取 ${orders.length} 个订单`);
          resolve({
            batchName: path.basename(filePath, '.csv'),
            createdAt: new Date().toISOString(),
            orders,
          });
        })
        .on('error', (error: Error) => {
          reject(error);
        });
    });
  }

  /**
   * 解析 CSV 行数据
   */
  private parseCsvRow(row: Record<string, string>): OrderItem {
    return {
      id: row.id || this.generateOrderId(),
      spec: {
        nps: row.nps,
        schedule: row.schedule,
        material: row.material || undefined,
        length: row.length || undefined,
        endType: row.end_type || undefined,
      },
      quantity: parseInt(row.quantity, 10),
      unit: (row.unit as 'FT' | 'M' | 'PC') || 'FT',
      remark: row.remark || undefined,
      priority: (row.priority as 'high' | 'normal' | 'low') || 'normal',
    };
  }

  /**
   * 验证订单批次
   */
  private validateOrderBatch(batch: OrderBatch): void {
    if (!batch.orders || !Array.isArray(batch.orders)) {
      throw new Error('订单文件格式错误: 缺少 orders 数组');
    }

    batch.orders.forEach((order, index) => {
      if (!order.spec || !order.spec.nps || !order.spec.schedule) {
        throw new Error(`订单 ${index + 1} 缺少必要的规格参数 (nps 或 schedule)`);
      }
      if (!order.quantity || order.quantity <= 0) {
        throw new Error(`订单 ${index + 1} 数量无效: ${order.quantity}`);
      }
    });
  }

  /**
   * 生成订单 ID
   */
  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 根据文件扩展名自动选择读取方式
   */
  async readOrders(filePath: string): Promise<OrderBatch> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.json':
        return this.readJsonOrders(filePath);
      case '.csv':
        return this.readCsvOrders(filePath);
      default:
        throw new Error(`不支持的文件格式: ${ext}，请使用 .json 或 .csv 文件`);
    }
  }
}

export default FileReaderUtil;
