---
name: read_linepipe_email
description: "分析客户邮件，提取 BOM 订单规格并与 linepipe 参考数据进行匹配。TRIGGER when: 用户请求分析邮件中的 linepipe/钢管 订单规格、BOM 数据匹配、或需要从邮件附件提取订单信息。"
---

# 读取 Linepipe 邮件

分析客户邮件，提取 BOM 订单规格并与 linepipe 参考数据进行匹配。

## 执行步骤

### 1. 获取邮件内容
用户只需提供邮件 ID（如 `q5291`），执行以下命令获取邮件 HTML：

```bash
node .claude/skills/read_linepipe_email/scripts/fetch-email.js <email_id>
```

脚本会自动：
- 从 `tools.precisepipe.com` 获取邮件内容
- 将 HTML 保存到 `.claude/skills/read_linepipe_email/scripts/emailHtml/<email_id>/` 目录

获取成功后，读取生成的 HTML 文件进行分析

### 2. 提取附件信息
- 在邮件中搜索附件链接（`/assistant/attachments/` 路径）
- 使用 `https://tools.precisepipe.com` 拼接附件 URL
- 用 curl 下载 Excel/PDF 附件（每次都要重新下载）
- 读取 Excel BOM 内容

### 3. 分析客户需求
从邮件内容中提取：
- 客户信息
- Mill 要求（如：小于 2" 用 Hengyang，2" 及以上用 MSL）
- Spec 规格要求
- 其他特殊要求

### 4. 匹配规格数据
参考 `references/linepipe_reference.md` 进行匹配：

| 字段 | 匹配规则 |
|------|----------|
| **Mill** | 按客户要求或默认规则（< 2" → Hengyang, ≥ 2" → MSL） |
| **Spec** | 从 BOM 描述提取规格代码，匹配最相近的结果 |
| **Size** | 格式：`NPS {尺寸} {壁厚}`，如 `NPS 1/2 XXS` |
| **Qty** | 从 BOM 提取数量 |
| **Unit** | 从 BOM 提取单位（通常为 ft） |
| **Length** | SRL/DRL/TRL/R1/R2/R3 等 |
| **End** | Plain End Square Cut / Beveled / Threaded 等 |
| **Make** | Seamless / Welded / ERW 等 |

### 5. 规格匹配对照表

#### Spec 映射
| BOM 描述关键词 | 匹配 Spec |
|---------------|-----------|
| A/SA333-6 GR 359 CAT 2 / CSA GR 359 CAT 2 | CSAZ245.1:2022 359 Cat II |
| A/SA333-6 GR 359 CAT 3 / CSA GR 359 CAT 3 | CSAZ245.1:2022 359 Cat III |


#### Size 映射
| BOM 描述 | Size 格式 |
|----------|-----------|
| 1/2" XXS | NPS 1/2 XXS |
| 3/4" XS | NPS 3/4 XS |


#### End 映射
| BOM 描述 | End |
|----------|-----|
| PLAIN END | Plain End Square Cut |
| BEVELED END / BE | Beveled |
| THREADED | Threaded |
| T&C | Threaded and Coupled |

#### Length 映射
| BOM 描述 | Length |
|----------|--------|
| SRL | SRL |
| DRL | DRL |
| TRL | TRL |

#### Make 映射
| BOM 描述 | Make |
|----------|------|
| SMLS / SEAMLESS | Seamless |
| ERW | ERW |
| WELDED | Welded |

### 6. 输出格式

将匹配结果写入 `demo2.xlsx` 的 **Sheet2**（保留 Sheet1 不变）。

使用 `xlsx` 库写入，示例代码：
```javascript
const XLSX = require('xlsx');
const wb = XLSX.readFile('demo2.xlsx');

// 构建 Sheet2 数据（含表头）
const headers = ['Mill', 'Spec', 'Size', 'Qty', 'Unit', 'Length', 'End', 'Make'];
const rows = [headers, ...items.map(item => [item.mill, item.spec, item.size, item.qty, item.unit, item.length, item.end, item.make])];
const ws = XLSX.utils.aoa_to_sheet(rows);

// 替换 Sheet2
wb.Sheets['Sheet2'] = ws;
if (!wb.SheetNames.includes('Sheet2')) wb.SheetNames.push('Sheet2');

XLSX.writeFile(wb, 'demo2.xlsx');
```

**列定义**：

| 列 | 内容 |
|----|------|
| A | Mill |
| B | Spec（多个用 `\|` 隔开） |
| C | Size |
| D | Qty |
| E | Unit |
| F | Length |
| G | End |
| H | Make |

**注意**：
- Spec 如果有多个用 `|` 隔开
- 每次写入前清空 Sheet2 旧数据，重新写入
- 写入完成后在终端输出确认信息和行数

### 7. 匹配规则
- 精确匹配优先
- 匹配不到时匹配最相近的结果
- 都匹配不到输出空字符串

## 示例

**输入**：邮件 ID `q5291`

**输出**：写入 `demo2.xlsx` Sheet2，内容如下：

| Mill | Spec | Size | Qty | Unit | Length | End | Make |
|------|------|------|-----|------|--------|-----|------|
| Hengyang | CSAZ245.1:2022 359 Cat II\|ASTM/ASME106-19 B | NPS 1/2 XXS | 1000 | ft | SRL | Plain End Square Cut | Seamless |
| Hengyang | CSAZ245.1:2022 359 Cat II\|ASTM/ASME106-19 B | NPS 3/4 XS | 4000 | ft | SRL | Plain End Square Cut | Seamless |
| ... | | | | | | | |

终端输出：`已写入 demo2.xlsx Sheet2，共 16 行数据`

## 依赖文件

- `docs/linepipe.md` - 规格参考数据
- `docs/linepipe_reference.md` - 规格参考数据（完整版）

### 8. 清理临时文件
分析完成后，删除第一步下载的邮件 HTML 文件：

```bash
rm -rf .claude/skills/read_linepipe_email/scripts/emailHtml/<email_id>
```

## 注意事项

1. 每次分析都要重新下载附件，不要使用缓存
2. 邮件可能包含多个回复，注意找到原始 BOM 附件
3. Mill 要求通常在邮件正文中说明
4. Spec 可能有多个标准组合，用 `|` 分隔
5. 分析完成后务必清理临时文件
