# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

仓库包含两个独立子项目：
1. **UmiJS 前端应用** (`src/`) - React 18 + UmiJS 4 + TypeScript + Ant Design 5
2. **PrecisePipe 自动化工具** (`automation/`) - 基于 Playwright 的网站自动下单工具

两个子项目各自有独立的 `package.json` 和 `node_modules`。根目录 `package.json` 存放 Playwright 测试的共享依赖。

## 常用命令

### 根目录 Playwright 测试
```bash
npm install
npx playwright install --with-deps
npx playwright test                        # 运行所有测试
npx playwright test tests/example.spec.ts  # 运行单个测试文件
npx playwright test --project=chromium     # 指定浏览器
```

### 自动化工具（需在 `automation/` 目录下运行）
```bash
cd automation
npm install
npx playwright install chromium

# 执行自动化下单
npm run start -- run -f ./data/orders.json -s "Alex Chow"
npm run start -- run -v              # 详细日志
npm run start -- run --headless      # 无头模式

# 验证订单文件
npm run start -- validate ./data/orders.json

# 构建 TypeScript
npm run build
```

## 架构

### 自动化工具流程
`CLI (commander)` → `PrecisePipeAutomation` 编排器 → 顺序执行管线：
1. `FileReaderUtil` 读取 JSON/CSV 订单数据
2. `BrowserManager` 启动 Playwright Chromium 浏览器
3. `LoginModule` 处理 Sales 选择 + Slack 验证码（需手动输入）
4. `OrderModule` 循环处理订单：在表格中选择规格 → 在 iframe 中填写参数 → 添加到报价单
5. 结果汇总为 `ExecutionSummary`

关键设计决策：
- 订单详情面板在 **iframe** 中加载 — `OrderModule` 必须通过 `contentFrame()` 获取 `Frame` 对象操作，而非直接操作 `Page`
- 规格选择通过查找 NPS 行与 Schedule 列的交叉单元格实现
- 登录需要**手动输入 Slack 验证码**（默认超时 120 秒，可在 `config/index.ts` 中配置）
- 所有页面选择器集中在 `config/selectors.ts` — 目标网站变更时在此更新
- 错误截图自动保存到 `automation/screenshots/`，日志保存到 `automation/logs/`

### 前端应用 (src/)
基于 UmiJS 的 React 应用。源码在 `src/` 下，`.umi/` 为自动生成的路由和配置（不要手动编辑 `.umi/` 中的文件）。

## CI
GitHub Actions 工作流（`.github/workflows/playwright.yml`）在 push/PR 到 main 时运行根目录的 Playwright 测试，**不会**运行自动化工具。

## 订单文件格式
```json
{
  "batchName": "批次名称",
  "config": { "delayBetweenOrders": 2000, "maxRetries": 3 },
  "orders": [
    {
      "id": "ORD-001",
      "spec": { "nps": "1/2", "schedule": "STD" },
      "quantity": 1000,
      "unit": "FT",
      "remark": "备注信息"
    }
  ]
}
```
每个订单的必填字段：`spec.nps`、`spec.schedule`、`quantity`。`unit` 默认为 `FT`。也支持 CSV 格式。
