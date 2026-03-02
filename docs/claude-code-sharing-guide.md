# Claude Code 使用分享指南

> 本文档面向开发团队，介绍 Claude Code 的安装、配置和使用方法，帮助大家快速上手 AI 辅助编程。

---

## 目录

1. [前言](#1-前言)
2. [安装指南](#2-安装指南)
3. [配置国产 GLM-5 模型](#3-配置国产-glm-5-模型)
4. [Claude Code 常用模式与指令](#4-claude-code-常用模式与指令)
5. [MCP、Agent、Skills 和 Plugin 的区别](#5-mcpagent-skills-和-plugin-的区别)
6. [配置 GLM 相关的 MCP](#6-配置-glm-相关的-mcp)
7. [安装 Figma MCP](#7-安装-figma-mcp)
8. [安装 ChromeDevTools MCP](#8-安装-chromedevtools-mcp)
9. [演示：DevTools 插件功能](#9演示devtools-插件功能)
10. [演示：Figma 到页面实现完整流程](#10演示figma-到页面实现完整流程)
11. [总结](#11-总结)
12. [题外话：国内使用 Claude 完整指南](#12-题外话国内使用-claude-完整指南)

---

## 1. 前言

### 什么是 Claude Code？

Claude Code 是 Anthropic 官方推出的 AI 编程助手 CLI 工具，它能够：
- 理解项目上下文，进行智能代码编写
- 执行复杂的多步骤任务
- 与外部工具和服务集成（通过 MCP）
- 支持多种 AI 模型

### 分享内容概览

```
安装配置 → 基础使用 → MCP 工具 → 实战演示 → 进阶技巧
```

---

## 2. 安装指南

### ⚠️ 重要前提

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| **Node.js** | >= 22 | 运行环境 |
| **Git** | 任意版本 | Claude Code 依赖 Git 进行版本控制 |

#### Windows 用户安装 Git

1. 访问 https://git-scm.com/download/win
2. 下载并安装 Git for Windows
3. 安装时建议勾选 "Git Bash Here" 选项
4. 验证安装：
   ```bash
   git --version
   ```

### 安装步骤

```bash
# 1. 检查 Node 版本
node -v
# 输出示例: v22.11.0

# 2. 安装 Claude Code
npm install -g @anthropic-ai/claude-code

# 3. 验证安装
claude --version
```

---

## 3. 配置国产 GLM-5 模型

### 3.1 获取 API Key

1. 访问智谱 AI 开放平台：https://open.bigmodel.cn/
2. 注册/登录账号
3. 进入控制台 → API Keys → 创建新密钥

### 3.2 配置命令

```json
#使用工具快捷配置
#https://docs.bigmodel.cn/cn/coding-plan/tool/claude

#调整模型
#目录 ~/.claude/settings.json
{
  "env": {
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5"
  }
}
```

### 3.3 其他国产模型配置文档

| 模型 | 厂商 | 配置文档 |
|------|------|----------|
| 通义千问 (Qwen) | 阿里云 | https://help.aliyun.com/zh/model-studio/ |
| DeepSeek | 深度求索 | https://platform.deepseek.com/docs |
| GLM-5 | 智谱 AI | https://docs.bigmodel.cn/cn/coding-plan/overview |

---

## 4. Claude Code 常用模式与指令

### 4.1 五种编辑模式

| 模式 | 命令 | 适用场景 |
|------|------|----------|
| **交互模式** | `claude`（默认） | 日常开发，逐步确认每个操作 |
| **自动确认** | `claude --yes` | 快速执行，自动确认所有操作 |
| **打印模式** | `claude --print` | 输出到文件，支持管道操作 |
| **跳过权限** | `claude --dangerously-skip-permissions` | CI/CD 场景，完全自动化 |
| **计划模式** | `claude --plan` | 先制定计划再执行，适合复杂任务 |

#### 关于打印模式

打印模式让 Claude Code 以纯文本形式输出结果，不进入交互界面，适合自动化场景。

**核心特点**：
- 非交互式，直接输出到终端
- 支持管道操作，可与 shell 命令组合
- 输出可重定向到文件

**使用示例**：

```bash
# 基础用法 - 直接提问
claude --print "今天是几月几号"

# 输出保存到文件
claude --print "今天是星期几 用英文" > README.md
# （追加写入）
claude --print "今天是星期几 用英文" > README.md

# 从文件读取输入
claude --print "优化这段代码" < src/utils.ts

# 代码审查并保存报告
claude --print "审查 src/ 目录的代码质量" > review-report.md

# 配合 grep 过滤输出
claude --print "列出项目的所有依赖" | grep "react"

# 生成测试用例
claude --print "为 src/api.ts 生成单元测试" > tests/api.test.ts

# 组合参数使用
claude --print --yes "重构 src/legacy.js 使用 ES6 语法" > refactored.js

# 批量处理（shell 脚本）
for file in src/*.ts; do
  claude --print "为这个文件添加类型注释" < "$file" > "typed/$(basename $file)"
done

# CI/CD 场景 - 自动化代码检查
claude --print --dangerously-skip-permissions "检查代码中的安全漏洞"
```

### 4.2 常用指令

```bash
/init            # 初始化 CLAUDE.md 项目指令文件
/help            # 显示帮助信息
/clear           # 清除对话历史
/compact         # 压缩对话历史，释放上下文
/config          # 管理配置
/permissions     # 管理权限
/review          # 代码审查
/terminal-setup  # 配置终端集成
/fast            # 切换快速模式
/agents          # 查看可用的 Agent
/resume          # 恢复上一次的对话
```

### 4.3 CLAUDE.md 文件

**作用**：项目级指令文件，让 Claude 理解项目上下文和规范

**推荐结构**：

```markdown
# 项目名称

## 技术栈
- React + TypeScript
- Tailwind CSS
- Vite

## 代码规范
- 使用 ESLint + Prettier
- 组件命名：PascalCase
- 函数命名：camelCase

## 目录结构
- src/components/ - 组件目录
- src/hooks/ - 自定义 Hooks
- src/utils/ - 工具函数

## 注意事项
- 所有 API 调用需要错误处理
- 使用中文注释
```

**注意事项**：
- 文件放在项目根目录
- 保持简洁，避免过长（建议 < 200 行）
- 定期更新维护

---

## 5. MCP、Agent、Skills 和 Plugin 的区别

### 概念对比

| 概念 | 定义 | 作用 | 示例 |
|------|------|------|------|
| **MCP** | Model Context Protocol，标准化工具协议 | 连接外部工具和数据源 | Figma、Chrome DevTools |
| **Agent** | 具有特定能力的子代理 | 执行复杂多步骤任务 | Explore Agent、Plan Agent |
| **Skills** | 用户可调用的预定义技能 | 快速执行常见任务 | /commit、/review-pr |
| **Plugin** | 功能扩展插件 | 添加新功能或集成 | chrome-devtools-mcp |

### 关系图解

```
Claude Code
│
├── MCP Servers（外部能力扩展）
│   ├── Figma MCP          # 设计工具集成
│   ├── Chrome DevTools MCP # 浏览器自动化
│   └── 更多 MCP 服务器...
│
├── Agents（内置智能代理）
│   ├── Explore Agent      # 代码库探索
│   ├── Plan Agent         # 方案规划
│   └── General Agent      # 通用任务
│
└── Skills（用户技能）
    ├── /commit            # Git 提交
    ├── /review-pr         # PR 审查
    └── 自定义技能...
```

### 官方文档链接

| 类型 | 链接 |
|------|------|
| **MCP 官方文档** | https://modelcontextprotocol.io/ |
| **MCP GitHub** | https://github.com/modelcontextprotocol |
| **MCP Servers 列表** | https://github.com/modelcontextprotocol/servers |
| **Claude Code 文档** | https://code.claude.com/docs/en/mcp |

---

## 6. 配置 GLM 相关的 MCP

### 6.1 安装配置

编辑 `.claude/settings.json`：

```json
{
  "mcpServers": {
    "zhipu": {
      "command": "npx",
      "args": ["-y", "@zhipu/mcp-server"],
      "env": {
        "ZHIPU_API_KEY": "your_api_key"
      }
    }
  }
}
```

### 6.2 可用功能

- 智谱 AI 模型调用
- 知识库检索
- 向量搜索
- 图像理解

---

## 7. 安装 Figma MCP

### 7.1 安装步骤

```bash
# 添加 Figma MCP
claude mcp add figma
```

或手动配置 `.claude/settings.json`：

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/figma-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_token"
      }
    }
  }
}
```

### 7.2 获取 Figma Token

1. 访问 https://www.figma.com/developers/api
2. 点击 "Get personal access token"
3. 生成并复制 Token
4. 配置到 settings.json

### 7.3 主要功能

| 功能 | 说明 |
|------|------|
| `get_design_context` | 获取设计上下文和代码 |
| `get_screenshot` | 获取设计截图 |
| `get_metadata` | 获取节点元数据 |
| `generate_diagram` | 在 FigJam 生成流程图 |
| `generate_figma_design` | 网页转 Figma 设计 |

---

## 8. 安装 ChromeDevTools MCP

### 8.1 安装步骤

```bash
# 安装 Chrome DevTools MCP
claude mcp add @anthropic-ai/chrome-devtools-mcp
```

或手动配置：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/chrome-devtools-mcp"]
    }
  }
}
```

### 8.2 安装 Chrome 扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 启用「开发者模式」
4. 安装相关扩展

---

## 9. 演示：DevTools 插件功能

### 9.1 页面快照

```
take_snapshot  # 获取页面可访问性树快照
```

返回页面元素及其唯一标识符 (uid)，用于后续交互。

### 9.2 元素交互

| 操作 | 命令 | 说明 |
|------|------|------|
| 点击 | `click` | 点击指定元素 |
| 填写 | `fill` | 填写表单 |
| 悬停 | `hover` | 鼠标悬停 |
| 键盘 | `press_key` | 按键操作 |
| 拖拽 | `drag` | 拖拽元素 |

### 9.3 网络监控

```
list_network_requests    # 列出所有网络请求
get_network_request      # 获取请求详情
```

### 9.4 控制台

```
list_console_messages    # 查看控制台日志
evaluate_script          # 执行 JavaScript
```

### 9.5 性能分析

```
performance_start_trace  # 开始性能追踪
performance_stop_trace   # 停止追踪并分析
```

---

## 10. 演示：Figma 到页面实现完整流程

### 完整工作流

```
┌─────────────────┐
│  1. Figma 设计  │
└────────┬────────┘
         ↓
┌─────────────────────────┐
│  2. get_design_context  │  ← 获取设计上下文
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│  3. Claude 生成代码     │  ← React/Vue/HTML
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│  4. 本地运行项目        │  ← npm run dev
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│  5. Chrome DevTools     │  ← 调试验证
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│  6. 完成！               │
└─────────────────────────┘
```

### 演示步骤

1. **打开 Figma 设计链接**
   ```
   https://www.figma.com/design/xxx/xxx?node-id=1-2
   ```

2. **获取设计上下文**
   ```
   请使用 Figma MCP 获取这个设计的代码
   ```

3. **Claude 生成代码**
   - 自动生成 React/Vue 组件
   - 包含样式和交互逻辑

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **使用 DevTools 验证**
   - 检查页面结构
   - 验证交互效果
   - 对比设计稿

---

## 11. 总结

### Claude Code 优势

- **自然语言编程**：用中文描述需求即可
- **上下文理解**：理解整个项目结构
- **工具链完整**：MCP + Agent + Skills
- **多模型支持**：支持国产模型替代

### 最佳实践

1. **写好 CLAUDE.md**：让 Claude 理解项目规范
2. **合理使用权限**：生产环境谨慎使用 `--dangerously-skip-permissions`
3. **善用 MCP**：扩展 Claude 的能力边界
4. **保持对话简洁**：适时使用 `/compact` 压缩历史

### 学习资源

| 资源 | 链接 |
|------|------|
| 官方文档 | https://docs.anthropic.com/ |
| GitHub | https://github.com/anthropics/claude-code |
| MCP 协议 | https://modelcontextprotocol.io/ |
| 社区讨论 | https://discord.gg/anthropic |

---

## 12. 题外话：国内使用 Claude 完整指南

### 12.1 获取 Claude 账号

#### 注册途径

**方式一：官网注册**
- 地址：https://claude.ai
- 需要：国外手机号验证
- 支持地区：美国、英国等

**方式二：虚拟手机号服务**

| 服务 | 地址 | 说明 |
|------|------|------|
| SMS-Activate | https://sms-activate.org/ | 付费，支持多国号码 |
| 5SIM | https://5sim.net/ | 付费，价格实惠 |
| TextNow | https://www.textnow.com/ | 免费美国号码 |

#### 注册步骤

1. 准备纯净 IP（见下节）
2. 访问 claude.ai
3. 点击 Sign Up
4. 使用虚拟手机号接收验证码
5. 完成注册

### 12.2 检查 IP 纯净度

#### 检测工具

| 工具 | 地址 | 检测内容 |
|------|------|----------|
| Ping0 | https://ping0.cc/ | IP风险评估 |
| Scamalytics | https://scamalytics.com/ip | IP 风险评分 |
| IPInfo | https://ipinfo.io | IP 基本信息 |
| WebRTC 测试 | https://browserleaks.com/webrtc | WebRTC 泄露检测 |

#### IP 质量标准

- **Scamalytics 评分 < 30**（越低越好）
- 非机房 IP、非代理 IP
- 无 WebRTC/DNS 泄露
- 时区与 IP 地区一致

### 12.3 获取纯净 IP

#### 推荐方案

**方案一：住宅代理**（推荐）

| 服务 | 地址 | 特点 |
|------|------|------|
| Bright Data | https://brightdata.com | 行业领先，价格较高 |
| IPRoyal | https://iproyal.com | 性价比高 |
| SmartProxy | https://smartproxy.com | 稳定可靠 |

**方案二：VPS + 代理**
- 购买海外 VPS（AWS、Vultr、DigitalOcean）
- 自建代理服务器（V2Ray、Clash）

**方案三：VPN 服务**
- 选择提供住宅 IP 的 VPN
- 避免使用公共/免费 VPN 节点

#### 配置建议

- 使用住宅 IP 而非机房 IP
- 固定使用同一地区的 IP
- 检查 DNS 是否泄露
- 关闭 WebRTC（浏览器设置）

### 12.4 Claude 会员充值

#### 支付方式

**方式一：虚拟信用卡**（推荐）

| 服务 | 地址 | 说明 |
|------|------|------|
| Dupay | https://dupay.one | 支持 USDT 充值 |
| WildCard | https://bewildcard.com | 国内用户友好 |
| Depay | https://depay.one | 老牌虚拟卡 |

**方式二：海外借记卡**

| 服务 | 地址 | 说明 |
|------|------|------|
| Wise | https://wise.com | 国际转账 |
| Payoneer | https://www.payoneer.com | 支持国内注册 |

#### 充值步骤

1. 注册虚拟卡服务
2. 完成实名认证（国内身份证即可）
3. 充值 USDT 或人民币
4. 在 Claude 订阅页面绑定卡片

#### 注意事项

- 充值时 IP 与注册时保持一致
- 建议使用同一张卡续费
- 保留充值记录以便申诉
- 避免频繁更换支付方式

---

## 附录：快速参考卡片

### 常用命令速查

```bash
# 安装
npm install -g @anthropic-ai/claude-code

# 启动
claude

# 模式
claude --yes          # 自动确认
claude --print        # 打印模式

# 指令
/init                 # 初始化项目
/clear               # 清除对话
/compact             # 压缩历史
/help                # 帮助
```

### MCP 配置模板

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/figma-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_token"
      }
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/chrome-devtools-mcp"]
    }
  }
}
```

---

> 文档版本：1.0
> 更新日期：2026-03-01
> 作者：Claude Code Demo Team
