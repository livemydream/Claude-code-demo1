---
name: slack-status
description: 查询 Slack 服务状态并记录。当用户问"Slack状态"、"SlackStatus"、"slack status"、"Slack是否正常"时触发。
category: monitoring
priority: 5
---

# Slack 状态查询技能

## 功能说明

查询 Slack 服务状态页面 https://slack-status.com/，获取当前各服务的运行状态并记录。

## 执行步骤

1. **获取当前北京时间**
   首先执行命令获取准确的北京时间：
   ```bash
   powershell -Command "[System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId((Get-Date), 'China Standard Time').ToString('yyyy-MM-dd HH:mm:ss')"
   ```
   使用返回的时间作为查询时间。

2. **查询 Slack 状态**
   使用 Chrome DevTools MCP 工具访问页面并获取状态：
   ```
   # 导航到 Slack 状态页面
   mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page
   type: "url"
   url: "https://slack-status.com/"

   # 获取页面快照以读取状态信息
   mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_snapshot

   # 可选：截图保存页面状态
   mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot
   ```

   从快照中提取各服务的状态信息：
   - "No issues" → ✅ Normal
   - "Something's not quite right" → ⚠️ Issue
   - "Outage" → ❌ Outage
   - "Maintenance" → 🔧 Maintenance

   同时关注页面顶部的活跃事件标题（如 "Degraded Search Performance..."）

3. **记录格式**
   将查询结果整理为以下格式，**追加**到固定文件 `slack_status/slack_status.md` 末尾：

   ```markdown
   ## Slack 状态记录 - {yyyy-MM-dd HH:mm:ss}

   | 服务名称 | 状态 | 说明 |
   |----------|------|------|
   | Messaging | ✅ Normal / ⚠️ Issue / ❌ Outage | 具体说明 |
   | Connections | ✅ Normal / ⚠️ Issue / ❌ Outage | 具体说明 |
   | ... | ... | ... |

   **查询时间**: {yyyy-MM-dd HH:mm:ss}
   **来源**: https://slack-status.com/
   ```

   **注意**: 每次查询追加到同一文件末尾，不创建新文件。

4. **状态标识**
   - ✅ Normal: 服务正常
   - ⚠️ Issue: 存在问题
   - ❌ Outage: 服务中断
   - 🔧 Maintenance: 维护中

5. **时间格式**
   - 统一使用格式: `yyyy-MM-dd HH:mm:ss`
   - 使用北京时间 (UTC+8)

## 输出确认

查询完成后告知用户：
- 当前 Slack 整体状态（正常/异常）
- 是否有服务出现问题
- 查询时间
