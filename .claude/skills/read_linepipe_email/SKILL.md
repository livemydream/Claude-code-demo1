---
name: read_linepipe_email
description: "分析客户邮件，提取 BOM 订单规格并与 linepipe 参考数据进行匹配。TRIGGER when: 用户请求分析邮件中的 linepipe/钢管 订单规格、BOM 数据匹配、或需要从邮件附件提取订单信息。"
---

# 读取 Linepipe 邮件

## 步骤 1 — 获取邮件

用户只提供邮件 ID（如 `q5291`），一条命令完成获取+提取：

```bash
node .claude/skills/read_linepipe_email/scripts/fetch-email.js <email_id>
```

输出 `.md` 文件路径，直接读取该文件。

## 步骤 2 — 下载附件

- 搜索 `.md` 中的 `/assistant/attachments/` 链接
- 只下载 下单信息相关的文件（`.xlsx`、`.xls`、`.pdf`）
- URL 前缀：`https://tools.precisepipe.com`
- 每次重新下载，不使用缓存

## 步骤 3 — 提取并匹配

从邮件+附件中提取每行 BOM，按 `quick-match.md` 规则匹配。

### 核心原则

1. **每个字段只能填对应参考数据中的精确匹配值**，匹配不到留空
2. **Non-AML 是 AML 字段，不是 Spec** — 网站表头的 AML 下拉框会自动设为 Non-AML，不要把 Non-AML 写入 Excel 的 Spec 列
3. **禁止猜测或模糊匹配** — 没有命中参考数据的值一律留空字符串 `""`

### AML 处理（表头级，非每行 BOM）

AML 是整个 Quote 的表头字段，由 `order.ts` 的 `selectNonAML()` 自动处理。常见关键词：
- `No AML restrictions` / `No restrictions on AML` / `Non-AML` / `No AML` → 自动选 Non-AML
- `Caterpillar` / `Shell` / `CNRL` 等客户名 → 对应 AML 客户规格

**不要将 AML 相关内容写入 Excel 的 Spec 列。**

### 字段匹配规则

| 字段 | 规则 | 参考文件 |
|------|------|------|
| **Mill** | < 2" → Hengyang, ≥ 2" → MSL（客户指定则按邮件原文） | references/mill.md (70+项) |
| **Spec** | 只能是参考数据中的精确值，多选用 `\|` 连接 | references/spec.md (203项) |
| **Size** | `NPS {nps} {schedule}`，必须精确匹配 | references/size.md (305项) |
| **Qty/Unit** | 直接从邮件提取 | 邮件原文 |
| **Length** | 必须精确匹配 | references/length.md (9项) |
| **End** | 必须精确匹配 | references/end.md (45项) |
| **Make** | 必须精确匹配 | references/make.md (11项) |
| **Min Length** | 直接从邮件提取 | 邮件原文 没有空着 `""`|
| **Max Length** | 直接从邮件提取 | 邮件原文 没有空着 `""`|
| **Fixed Length** | 直接从邮件提取 | 邮件原文 没有空着 `""`|

## 步骤 4 — 写入 Excel

写入 `demo2.xlsx` 的 **Sheet2**（保留 Sheet1）：

```javascript
const XLSX = require('xlsx');
const wb = XLSX.readFile('demo2.xlsx');
const headers = ['Mill', 'Spec', 'Size', 'Qty', 'Unit', 'Length', 'End', 'Make'];
const rows = [headers, ...items.map(i => [i.mill, i.spec, i.size, i.qty, i.unit, i.length, i.end, i.make])];
const ws = XLSX.utils.aoa_to_sheet(rows);
wb.Sheets['Sheet2'] = ws;
if (!wb.SheetNames.includes('Sheet2')) wb.SheetNames.push('Sheet2');
XLSX.writeFile(wb, 'demo2.xlsx');
```

**注意**：
- Spec 多选用 `|` 隔开，但**只能包含 Spec 参考列表中的精确值**，不含 AML 内容
- 匹配不到时写空字符串 `""`，不要用近似值填充
- 每次写入清空旧 Sheet2 数据

## 步骤 5 — 清理 & 执行

```bash
rm -rf .claude/skills/read_linepipe_email/scripts/emailHtml/<email_id>
```
## 步骤 6 自动下单
```bash
npm run order
```

## 异常处理

- 任何步骤失败不阻塞，跳过并继续，最后汇总报告失败项
- 匹配不到时输出空字符串
- 邮件有多个回复时，找到原始 BOM 附件
