# PrecisePipe 自动化下单工具

基于 Playwright 的自动化报价提交工具，从 Excel 读取订单数据并自动完成网页表单填写。

## 技术栈

| 技术 | 用途 |
|------|------|
| **TypeScript** | 主要开发语言 |
| **Playwright** | 浏览器自动化（点击、填表、等待） |
| **XLSX** | 读取 Excel 订单数据 |
| **Node.js https** | 调用远程 API 创建 Quote |

## 处理的 UI 框架

- **layui** - 第一页弹窗、下拉框
- **Element Plus** - 第三页表单（el-select, el-dialog）
- **Vue.js** - 响应式输入（需用原生 setter 触发）

## 快速开始

```bash
# 安装依赖
npm install

# 运行自动化脚本
npm run order

# 传入 Slack 验证码
npm run order -- --slack=XXXXXX
```

## 核心流程

1. **登录** - 图形验证码 + Slack 验证码
2. **第一页** - 选规格、填数量、添加商品
3. **第二页** - 点击 Next Step
4. **第三页** - 填写表单 → Submit → 填 Quote ID → Confirm

## Excel 数据格式

| 列名 | 说明 | 示例 |
|------|------|------|
| Incoterm | 贸易条款 | DDP |
| Currency | 货币 | USD / CAD |
| Destination | 目的地 | Edmonton |
| Spec | 材料规格 | API5L 46th Edition B PSL 1 |
| LoginSales | 登录账号 | Alex Chow |
| Size | NPS + Schedule | NPS 1/8 STD |
| Qty | 数量 | 100 |
| Unit | 单位 | ft |
| Company | 公司名称 | Precise Pipe |
| Sell From | 销售实体 | Precise Pipe Inc. |
| Is End User | 是否终端用户 | 1 或 0 |
| Yard Address | 收货地址 | 2155 University Ave... |

## 配置

编辑 `src/order.ts` 顶部的 CONFIG 对象：

```typescript
const CONFIG = {
  captchaCode: '240501',   // 图形验证码
  slackCode: 'PP8STD',     // Slack 验证码
  salesName: 'Alex Chow',  // 默认 Sales
  excelFile: './demo.xlsx',
  headless: false,         // 是否无头模式
  defaultMinLength: '18',  // 默认最小长度
  defaultMaxLength: '22',  // 默认最大长度
  defaultDeposit: 20,      // 默认定金比例
  defaultNet: 30,          // 默认账期
  defaultInstallment: 1,   // 默认分期数
};
```

## 文件结构

```
src/
├── order.ts          # 主自动化脚本
├── read-excel.ts     # Excel 读取工具
└── scrpit/
    └── createChannelQuote.js  # 创建 Quote API
demo.xlsx            # 订单数据
screenshots/         # 错误截图
```

## 相关文档

- [CLAUDE.md](./CLAUDE.md) - Claude Code 开发指南
- [FLOW.md](./FLOW.md) - 详细流程和选择器说明
