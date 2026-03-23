---
name: create-quote
description: "创建 Channel Quote 的 API 调用工具。TRIGGER when: 用户需要创建新的报价通道、测试 quote API、或需要生成测试用的 channel quote 数据。"
---

# 创建 Channel Quote

通过 API 创建新的 Channel Quote，用于报价流程初始化或测试。

## 执行步骤

### 1. 运行脚本

```bash
node .claude/skills/create-quote/scripts/createChannelQuote.js
```

### 2. 脚本功能

脚本会自动：
- 生成唯一的请求参数（包含时间戳）
- 调用 `precisepipe-api.activatortube.com` 的创建接口
- 返回完整的响应信息

### 3. 请求参数

脚本自动生成的参数：

| 参数 | 说明 | 示例 |
|------|------|------|
| channelName | 通道名称 | `quote-2026-03-23t10-30-00_1711185000000` |
| emailTitle | 邮件标题 | `test create channel 2026-03-23t10-30-00_1711185000000` |
| compliance | 合规人员 | `Lee` |
| sales | 销售人员 | `Lee` |
| internCompliance | 内部合规 | 空字符串 |
| buyer | 采购方 | `Justin Crawford` |

### 4. 响应信息

成功时返回：
- `success: true`
- `status: 200`
- API 返回的数据

失败时返回：
- `success: false`
- 错误信息

## 使用示例

```
用户: 创建一个 quote
```

执行命令后，输出示例：
```json
{
  "success": true,
  "timestamp": "2026-03-23T10:30:00.000Z",
  "params": {
    "channelName": "quote-2026-03-23t10-30-00_1711185000000",
    "emailTitle": "test create channel 2026-03-23t10-30-00_1711185000000",
    ...
  },
  "status": 200,
  "data": "..."
}
```

## 注意事项

1. 脚本每次运行都会生成唯一的时间戳参数
2. 默认超时时间为 30 秒
3. 如需自定义参数，需修改脚本中的 `generateUniqueParams()` 函数
4. Headers 目前被注释，如需认证需取消注释并填入有效 token
