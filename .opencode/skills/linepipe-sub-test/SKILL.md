---
name: linepipe-sub-test
description: Automate Line Pipe product order testing on PrecisePipe system using Chrome DevTools MCP
license: MIT
compatibility: opencode
metadata:
  category: testing
  workflow: automation
  tools: chrome-devtools
---

# Line Pipe 自动化下单测试流程

## 概述
此 skill 用于自动化测试 PrecisePipe 系统的 Line Pipe 产品下单流程。

## ⚠️ 必需参数

**在执行测试前，必须向用户询问以下参数：**

- **URLID** (格式: `rec` + 数字/字母，如 `rec001`, `recABC`)
  - 用途: 测试记录标识符，用于构建测试 URL
  - 示例: `rec001`, `rec123`, `rec9ab`, `recXYZ`
  - 验证: 正则表达式 `^rec[a-zA-Z0-9]+$`

**询问用户：**
> 请提供测试记录 ID（格式: rec + 数字/字母，例如: rec001 或 recABC）：

## 页面信息
- **起始 URL**: `http://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html?id={URLID}`
  > 将 `{URLID}` 替换为用户提供的测试记录 ID
- **登录凭证**:
  - 验证码: 240501
  - 密码: PP8STD

## 关键注意事项
1. **Mill 工厂选择**: 只选择一个工厂，不要使用 "select all"
2. **页面加载**: 每次操作后等待页面稳定
3. **快照更新**: 每次操作前必须使用 `chrome-devtools_take_snapshot` 获取最新 UID

## 执行流程

### 阶段 0: 参数验证（⚠️ 必须首先执行）
1. **询问用户** URL ID 参数
   - 使用提示: "请提供测试记录 ID（格式: rec + 数字/字母，例如: rec001）"
2. **验证参数格式**
   - 检查格式是否符合 `rec` + 数字/字母
   - 如格式错误，提示用户重新输入
3. **记录参数**
   - 保存 URL ID 用于后续测试记录和报告生成

### 阶段 1: 打开页面并登录
1. 使用 `chrome-devtools_new_page` 打开页面:
   - URL: `http://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html?id={URLID}`
2. 系统会自动完成登录（已保存凭证）
3. 使用 `chrome-devtools_wait_for` 等待用户名显示（登录成功标志）

### 阶段 2: 填写报价表单

#### 2.1 填写提交信息（⚠️ 新流程：提前到第一页）

**如果提前到了第一页**
1. `chrome-devtools_click` 点击 'X'关闭按钮  最后在填写

**填写步骤:**
1. `chrome-devtools_take_snapshot` 获取提交信息区域
2. `chrome-devtools_click` 点击 Company 下拉框
3. `chrome-devtools_take_snapshot` 获取选项
4. `chrome-devtools_click` 选择第一个公司
5. 重复上述步骤填写 Buyer, Email, Sell From
6. 其他字段（Phone, Address 等）会自动填充

#### 2.2 选择规格 (3个必选项)

**选择 Spec:**
1. 使用 `chrome-devtools_take_snapshot` 获取页面快照
2. 使用 `chrome-devtools_click` 点击 Spec 下拉框
3. 再次 `chrome-devtools_take_snapshot` 获取下拉选项
4. 使用 `chrome-devtools_click` 选择第一个可用规格
5. 使用 `chrome-devtools_press_key` 按 "Escape" 关闭下拉框（如需要）

**选择 AML:**
1. `chrome-devtools_take_snapshot` 获取页面
2. `chrome-devtools_click` 点击 AML 下拉框
3. `chrome-devtools_take_snapshot` 获取选项
4. `chrome-devtools_click` 点击 "select all" 选项
5. `chrome-devtools_press_key` 按 "Escape"（如需要）

**选择 Mill (⚠️ 关键):**
1. `chrome-devtools_take_snapshot` 获取页面
2. `chrome-devtools_click` 点击 Mill 下拉框
3. `chrome-devtools_take_snapshot` 获取选项
4. `chrome-devtools_click` 选择第一个工厂（⚠️ 不要选择 "select all"）
5. `chrome-devtools_press_key` 按 "Escape"（如需要）

#### 2.3 添加产品到报价单

**选择管道规格:**
1. `chrome-devtools_take_snapshot` 获取页面
2. `chrome-devtools_click` 点击规格表格中的任意单元格
3. 等待弹出窗口出现


**填写数量:**
1. `chrome-devtools_take_snapshot` 获取弹出窗口
2. 使用 `chrome-devtools_fill` 在数量输入框中输入 "500"
3. `chrome-devtools_click` 点击 "Add to Quote" 按钮

**下一步:**
1. `chrome-devtools_click` 点击 "Next" 按钮

**确认添加:**
1. `chrome-devtools_wait_for` 等待 "Double Checked and Next" 按钮出现
2. `chrome-devtools_take_snapshot` 获取确认窗口
3. `chrome-devtools_click` 点击确认按钮
4. `chrome-devtools_click` 点击 "Double Checked and Next"

#### 2.4 进入下一页
1. `chrome-devtools_take_snapshot` 获取页面底部
2. `chrome-devtools_click` 点击 "Next" 按钮
3. `chrome-devtools_wait_for` 等待新页面加载

### 阶段 3: 报价汇总页

**操作步骤:**
1. `chrome-devtools_take_snapshot` 获取汇总页面
2. 验证报价汇总表已显示
3. `chrome-devtools_click` 点击 "Next Step" 按钮
4. `chrome-devtools_wait_for` 等待第三页加载

### 阶段 4: 提交确认页
1. **Company**: 从下拉列表选择第一个可用公司
2. **Buyer**: 从下拉列表选择（自动关联 Company）
3. **Email**: 手动输入或使用自动填充的邮箱
 **Sell From**: 选择第一个可用选项

**验证步骤:**
1. `chrome-devtools_take_snapshot` 获取提交确认页面
2. 验证之前填写的 Company/Buyer/Email/Sell From 信息正确显示
3. 如有缺失字段，按需补充

**提交 (仅测试用):**
1. `chrome-devtools_take_snapshot` 获取提交按钮
2. `chrome-devtools_click` 点击 "Submit" 按钮

## 验证检查点

### 参数验证检查点（阶段 0）
- ✅ URL ID 参数已获取
- ✅ URL ID 格式正确（rec + 数字/字母）
- ✅ 参数已记录用于测试报告

### 第一页检查点
- ✅ 用户名显示正确
- ✅ 提交信息已填写（Company/Buyer/Email/Sell From）
- ✅ Spec/AML/Mill 已选择
- ✅ 产品已添加到报价单
- ✅ 成功进入第二页

### 第二页检查点
- ✅ 报价汇总表显示
- ✅ 产品信息正确
- ✅ 成功进入第三页

### 第三页检查点（提交确认页）
- ✅ 提交信息与第一页填写一致
- ✅ 必填字段无错误提示
- ✅ 可提交（如需要）

## 常见问题处理

### 问题 1: 元素 UID 变化
- **原因**: 页面刷新或动态更新
- **解决**: 每次操作前使用 `chrome-devtools_take_snapshot` 获取最新 UID

### 问题 2: 下拉框选择失败
- **原因**: 选项未及时加载
- **解决**: 点击下拉框后等待，再次获取快照

### 问题 3: 页面加载缓慢
- **原因**: 网络延迟
- **解决**: 使用 `chrome-devtools_wait_for` 等待关键元素出现

## 性能指标
- **第一页**: 45-90 秒（含提交信息填写）
- **第二页**: 5-10 秒
- **第三页**: 5-15 秒（仅确认）
- **总计**: 约 1-2 分钟

## 最佳实践
1. **参数优先**: 执行任何操作前，必须先获取并验证 URL ID 参数
2. **始终使用最新快照**: 每次操作前获取最新页面状态
3. **最小化等待时间**: 只在必要时使用 wait_for
4. **优先级操作**: 先完成必填项，可选项按需填写
5. **错误处理**: 捕获异常并重试（最多 3 次）

## 工具使用总结

### 核心工具（按使用频率排序）
1. `chrome-devtools_take_snapshot` - 获取页面当前状态（最常用）
2. `chrome-devtools_click` - 点击元素
3. `chrome-devtools_fill` - 填充输入框
4. `chrome-devtools_wait_for` - 等待元素出现
5. `chrome-devtools_new_page` - 打开新页面
6. `chrome-devtools_press_key` - 按键操作（如 Escape）

### 通用操作模式

**模式 1: 下拉框选择**
```
1. take_snapshot() - 获取当前页面
2. click(dropdown_uid) - 点击下拉框
3. take_snapshot() - 获取下拉选项
4. click(option_uid) - 选择选项
5. press_key("Escape") - 关闭下拉框（如需要）
```

**模式 2: 表单填写**
```
1. take_snapshot() - 获取当前页面
2. fill(input_uid, value) - 填充输入框
3. click(submit_button_uid) - 提交表单
```

**模式 3: 弹窗处理**
```
1. take_snapshot() - 检测弹窗
2. wait_for(["确认文本"]) - 等待弹窗出现
3. click(confirm_button_uid) - 确认操作
```

## 测试数据参考

### 必需参数
- **URL ID**: 格式 `recxxx`（例如: rec001, rec123）- **必需**

### 推荐配置
- **Spec**: 第一个可用规格（如: API5L 46th Edition X42 PSL 1）
- **AML**: 选择所有（点击 select all）
- **Mill**: 第一个工厂（如: AJMAL Steel,UAE）⚠️ 只选一个
- **产品规格**: 任意可用规格（如: NPS 1/8 XS）
- **数量**: 500 ft（或任意有效数量）

### 提交信息
- **Company**: 第一个可用公司
- **Buyer**: 关联 Buyer（自动填充）
- **Email**: 自动填充或测试邮箱
- **Sell From**: 第一个可用选项
