/**
 * 订单规格参数
 */
export interface OrderSpec {
  /** 管道尺寸，如 "1/2", "3/4", "1" */
  nps: string;
  /** 壁厚等级，如 "STD", "XS", "S40" */
  schedule: string;
  /** 材质（可选） */
  material?: string;
  /** 长度（可选） */
  length?: string;
  /** 端部类型（可选） */
  endType?: string;
}

/**
 * 订单项
 */
export interface OrderItem {
  /** 订单ID（用于追踪） */
  id: string;
  /** 规格参数 */
  spec: OrderSpec;
  /** 数量 */
  quantity: number;
  /** 单位 */
  unit: 'FT' | 'M' | 'PC';
  /** 备注 */
  remark?: string;
  /** 优先级 */
  priority?: 'high' | 'normal' | 'low';
}

/**
 * 批次配置
 */
export interface BatchConfig {
  /** 每个订单之间的延迟（毫秒） */
  delayBetweenOrders?: number;
  /** 失败重试次数 */
  maxRetries?: number;
  /** 是否在错误时截图 */
  screenshotOnError?: boolean;
  /** 是否在提交前等待确认 */
  confirmBeforeSubmit?: boolean;
}

/**
 * 订单批次
 */
export interface OrderBatch {
  /** 批次名称 */
  batchName: string;
  /** 创建时间 */
  createdAt?: string;
  /** 订单列表 */
  orders: OrderItem[];
  /** 批次配置 */
  config?: BatchConfig;
}

/**
 * 订单执行状态
 */
export type OrderStatus = 'pending' | 'processing' | 'success' | 'failed';

/**
 * 订单执行结果
 */
export interface OrderResult {
  /** 订单ID */
  orderId: string;
  /** 执行状态 */
  status: OrderStatus;
  /** 报价单号（成功时） */
  quoteNumber?: string;
  /** 错误信息（失败时） */
  error?: string;
  /** 执行时间 */
  executedAt: string;
  /** 截图路径 */
  screenshotPath?: string;
}

/**
 * 执行结果汇总
 */
export interface ExecutionSummary {
  /** 批次名称 */
  batchName: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 总订单数 */
  totalOrders: number;
  /** 成功数 */
  successCount: number;
  /** 失败数 */
  failedCount: number;
  /** 详细结果 */
  results: OrderResult[];
}
