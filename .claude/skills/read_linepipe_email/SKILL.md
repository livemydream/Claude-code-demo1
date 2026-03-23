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

以 Markdown 表格格式输出：

| Mill | Spec | Size | Qty | Unit | Length | End | Make |
|------|------|------|-----|------|--------|-----|------|
| {Mill} | {Spec} | {Size} | {Qty} | {unit} | {Length} | {End} | {Make} |
| {Mill} | {Spec} | {Size} | {Qty} | {unit} | {Length} | {End} | {Make} |

**注意**：Spec 如果有多个用 `|` 隔开

### 7. 匹配规则
- 精确匹配优先
- 匹配不到时匹配最相近的结果
- 都匹配不到输出空字符串

## 示例

**输入**：邮件文件 `email-q5291-2026-03-23T02-34-31.html`

**输出**：
```
item 1：Hengyang CSAZ245.1:2022 359 Cat II|ASTM/ASME106-19 B NPS 1/2 XXS 1000 ft SRL Plain End Square Cut Seamless
item 2：Hengyang CSAZ245.1:2022 359 Cat II|ASTM/ASME106-19 B NPS 3/4 XS 4000 ft SRL Plain End Square Cut Seamless
...
```

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
