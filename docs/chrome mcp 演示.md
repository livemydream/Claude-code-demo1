# PP 下单流程自动化测试指南
# 页面链接 http://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html

## 登录凭证
- 通用验证码：240501
- 密码：PP8STD

## ⚠️ 关键注意事项
1. **Mill 工厂选择**: 只选择一个工厂，不要使用 "select all"
2. **页面加载**: 每次操作后等待页面稳定
3. **快照更新**: 每次操作前必须获取最新快照获取最新 UID

---

## 页面结构概览（快速参考）

### 第一页：报价表单
- **基本信息**: Incoterm, Port, Currency（通常自动填充）
- **规格选择**: Spec（必选）, AML（全选）, Mill（⚠️ 选一个）
- **产品选择**: 点击规格表格 → 填数量 → Add to Quote
- **操作按钮**: Next

### 第二页：报价汇总
- **显示内容**: 报价单汇总表
- **操作按钮**: Next Step

### 第三页：提交信息
- **必填字段**: Company, Buyer, Email, Sell From
- **自动填充**: Phone, Address, Invoicing Units, Deposit, Net
- **操作按钮**: Submit（可选）

---

## 页面层级结构分析（详细版）

### 1. 顶部导航区域 (Header)
- **Logo 区域**
  - PrecisePipe Logo 链接 (https://precisepipe.com/)
  - 用户信息显示: "Hi, Alex Chow"
  - 登录状态图标

### 2. 主表单区域 (Main Form)

#### 2.1 操作按钮区 (Action Buttons)
- **Back 按钮** - 返回上一页
- **Start Over 按钮** - 重新开始报价流程

#### 2.2 表单标题
- **主标题**: "Request For Quote (Line Pipe)"

#### 2.3 基本信息区 (Basic Information)
- **Default Incoterm** - 默认国际贸易术语选择
- **Destination Country** - 目的国家下拉选择器
- **Destination Port** - 目的港下拉选择器
- **Currency** - 货币类型选择

#### 2.4 日期信息区 (Date Information)
- **Same Quote ROS Date For All** - 统一报价日期开关
- **Submission Deadline** - 提交截止日期 (示例: Mar 06,2026 14:00)
- **Expected Award Date** - 预期授予日期 (示例: Mar 27,2026)
- **Quote Required On-Site Date** - 要求现场日期 (示例: Jul 05,2026)
- **Required ex-mills** - 出厂要求天数 (示例: 100)

#### 2.5 规格信息区 (Specification)
- **Spec** - 规格选择
  - "Same spec across all items" 开关
  - 规格下拉选择器
- **Make** - 制造商标识

#### 2.6 AML 和 Mill 区 (Manufacturer & Mill)
- **AML (Approved Manufacturer List)** - 批准制造商列表
  - AML 下拉选择器
- **Mill** - 工厂选择
  - "Same mill across all items" 开关
  - 工厂下拉选择器 (⚠️ 只选择一个工厂)

#### 2.7 化学和机械属性区 (Properties)
- **Chemical Composition** - 化学成分
  - "Same Chemical across all items" 开关
  - Chemical 按钮 (打开详细配置)
- **Mechanical Property** - 机械属性
  - "Same Mechanical across all items" 开关
  - Mechanical 按钮 (打开详细配置)

#### 2.8 备注区域 (Comments)
- **Client Requirements for the entire quote** - 客户整体需求
  - Editor 按钮 (富文本编辑器)
- **Sales Comments for the entire quote** - 销售整体备注
  - Editor 按钮 (富文本编辑器)
- **Client Comments for the entire quote** - 客户整体备注
  - Editor 按钮 (富文本编辑器)

### 3. 规格和数量选择区 (Size & Quantity)

#### 3.1 标题和控制
- **标题**: "Select Size and Quantity"
- **单位切换**: Imperial (英制) / Metric (公制)
- **显示选项**: Show All (显示全部) / Show Popular (显示常用)

#### 3.2 数量选择
- **Qty Requested** - 请求的数量
  - 500 ft
  - 1000 ft

#### 3.3 规格列表
- **动态列表区域** - 用于显示具体的管道规格选项

#### 3.4 下一步操作
- **Next 按钮** - 提交并进入下一步

### 4. 加载状态提示
- 加载提示信息: "We are working hard to load your data, please wait."

---

## UI 元素 UID 映射表

| 元素名称 | UID | 类型 | 说明 |
|---------|-----|------|------|
| RootWebArea | 2_0 | 根节点 | 主页面容器 |
| Logo 链接 | 2_7 | link | PrecisePipe 主页链接 |
| 用户名显示 | 2_14 | text | 当前登录用户名 |
| Back 按钮 | 2_18 | link | 返回按钮 |
| Start Over | 2_23 | button | 重新开始按钮 |
| Incoterm 选择 | 2_50 | textbox | 国际贸易术语选择 |
| Destination Country | 2_63 | textbox | 目的国家选择 |
| Destination Port | 2_75 | textbox | 目的港选择 |
| Submission Deadline | 2_104 | textbox | 提交截止日期 |
| Expected Award Date | 2_115 | textbox | 预期授予日期 |
| On-Site Date | 2_128 | textbox | 要求现场日期 |
| Required ex-mills | 2_137 | textbox | 出厂要求天数 |
| Spec 选择 | 2_159 | ignored | 规格选择器 |
| AML 选择 | 2_186 | ignored | AML选择器 |
| Mill 选择 | 2_213 | ignored | 工厂选择器 |
| Chemical 按钮 | 2_236 | button | 化学成分配置 |
| Mechanical 按钮 | 2_248 | button | 机械属性配置 |
| Client Requirements | 2_255 | button | 客户需求编辑器 |
| Sales Comments | 2_262 | button | 销售备注编辑器 |
| Client Comments | 2_269 | button | 客户备注编辑器 |
| Next 按钮 | 2_307 | image | 下一步按钮 |

---

## 快速下单流程（3步）

### 第一步：填写表单 → Next
1. **自动登录** - 访问页面自动完成
2. **选择规格** (3项)
   - Spec: 选择第一个可用规格
   - AML: 点击 "select all"
   - Mill: ⚠️ 只选择第一个工厂
3. **选择产品并添加**
   - 点击任意规格单元格
   - 输入数量 (如: 500)
   - 点击 "Add to Quote"
4. **确认** - 点击 "Double Checked and Next"
5. **下一步** - 点击 "Next"

### 第二步：查看汇总 → Next Step
- 自动显示报价汇总
- 点击 "Next Step"

### 第三步：填写提交信息 → Submit (可选)
- Company/Buyer: 从下拉选择
- Email/Phone: 自动填充或手动输入
- Sell From/Vertical: 选择第一个选项
- 点击 "Submit" 提交

---

## 详细步骤说明

### 第一页 - 报价表单填写

#### 步骤 1: 自动登录
- 访问页面: `http://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html`
- 系统自动完成登录（已保存凭证）
- ✅ 登录成功标志：显示用户名

#### 步骤 2: 选择规格配置（3个必选项）

**2.1 选择 Spec**
```
操作：点击 Spec 下拉框 → 选择第一个可用规格
示例：API5L 46th Edition X42 PSL 1
```

**2.2 选择 AML**
```
操作：点击 AML 下拉框 → 点击 "select all"
结果：选中所有 AML 选项
```

**2.3 选择 Mill（⚠️ 关键）**
```
操作：点击 Mill 下拉框 → 选择第一个工厂
示例：AJMAL Steel,UAE
⚠️ 注意：只选择一个工厂，不要点击 "select all"
```

#### 步骤 3: 添加产品到报价单

**3.1 选择管道规格**
```
操作：点击规格表格中的任意单元格
示例：NPS 1/8 XS (OD: 0.405", WT: 0.095")
```

**3.2 填写数量**
```
操作：在弹出窗口中输入数量
示例：500 ft (使用默认单位)
```

**3.3 添加到报价**
```
操作：点击 "Add to Quote" 按钮
```

#### 步骤 4: 确认并进入下一页

**4.1 确认详情**
```
操作：在 Double Checking 窗口点击 "Double Checked and Next"
```

**4.2 进入第二步**
```
操作：点击页面底部 "Next" 按钮
```

---

### 第二页 - 报价汇总页

#### 页面信息
- URL: `https://precisepipe-api.activatortube.com/quote/quote.html`
- 自动显示报价汇总表
- Total: 显示 "To be quoted"

#### 操作步骤
```
操作：点击 "Next Step" 按钮
等待：页面跳转到第三页
```

---

### 第三页 - 提交页面（可选）

#### 页面信息
- URL: `https://precisepipe-api.activatortube.com/quote/quote_submit.html?use=linePipe`

#### 快速填写策略

**必填字段（4个）**:
1. **Company**: 从下拉列表选择第一个可用公司
2. **Buyer**: 从下拉列表选择（自动关联 Company）
3. **Email**: 手动输入或使用自动填充的邮箱
4. **Sell From**: 选择第一个可用选项

**自动填充字段（6个）**:
- Phone: 选择 Buyer 后自动填充
- Business Address: 选择 Company 后自动填充
- Invoicing Units: 系统自动设置
- Deposit: 默认 20%
- Net: 默认 30
- Installment: 默认 1

**可选字段（2个）**:
- Vertical: 可选择 "skip" 或第一个选项
- Additional Display Units: 可留空

#### 提交流程
```
操作：点击 "Submit" 按钮
⚠️ 注意：仅用于测试，实际使用时不要提交真实订单
```

---

## Chrome DevTools MCP 工具使用总结

### 核心工具列表（按使用频率排序）
1. **take_snapshot** - 获取页面当前状态（最常用）
2. **click** - 点击元素
3. **fill** - 填充输入框
4. **wait_for** - 等待元素出现
5. **new_page** - 打开新页面
6. **press_key** - 按键操作（如 Escape 关闭弹窗）

### 通用操作模式

#### 模式 1: 下拉框选择
```
1. take_snapshot() - 获取当前页面
2. click(dropdown_uid) - 点击下拉框
3. take_snapshot() - 获取下拉选项
4. click(option_uid) - 选择选项
5. press_key("Escape") - 关闭下拉框（如需要）
```

#### 模式 2: 表单填写
```
1. take_snapshot() - 获取当前页面
2. fill(input_uid, value) - 填充输入框
3. click(submit_button_uid) - 提交表单
```

#### 模式 3: 弹窗处理
```
1. take_snapshot() - 检测弹窗
2. wait_for(["确认文本"]) - 等待弹窗出现
3. click(confirm_button_uid) - 确认操作
```

### 常见问题及解决方案

#### 问题 1: 元素 UID 变化
- **原因**: 页面刷新或动态更新导致 UID 改变
- **解决**: 每次操作前使用 `take_snapshot()` 获取最新 UID
- **预防**: 不要硬编码 UID，始终从最新快照获取

#### 问题 2: 下拉框选择失败
- **原因**: 选项元素未及时加载
- **解决**: 点击下拉框后等待，再次获取快照
- **技巧**: 使用 `wait_for()` 等待下拉选项出现

#### 问题 3: 表单验证失败
- **原因**: 必填字段未填写
- **解决**: 使用 `take_snapshot()` 检查所有必填字段（标记 * 的字段）
- **快速定位**: 查找 "Please Select" 或空值的必填字段

#### 问题 4: 页面加载缓慢
- **原因**: 网络延迟或服务器响应慢
- **解决**: 使用 `wait_for()` 等待关键元素出现
- **超时设置**: 默认等待 5-10 秒，必要时增加超时时间

#### 问题 5: 弹窗未关闭
- **原因**: 操作未完成或需要额外确认
- **解决**: 使用 `press_key("Escape")` 关闭弹窗
- **备选**: 点击弹窗外的区域或关闭按钮

### 最佳实践

#### 1. 快速执行原则
- **始终使用最新快照**: 每次操作前获取最新页面状态
- **最小化等待时间**: 只在必要时使用 wait_for
- **批量操作**: 使用 fill_form 一次性填充多个字段
- **优先级操作**: 先完成必填项，可选项按需填写

#### 2. 准确性保障
- **验证操作结果**: 操作后检查是否成功
- **元素定位**: 使用最新的 UID，避免使用过期的元素引用
- **错误处理**: 捕获异常并重试（最多 3 次）

#### 3. 效率优化
- **跳过非必要步骤**: 自动填充的字段不要手动填写
- **使用默认值**: 能用默认值的字段不要修改
- **并行操作**: 多个独立操作可以并行执行

#### 4. 特殊注意事项
- **⚠️ Mill 选择**: 只选择一个工厂，避免使用 "select all" 导致数据过多
- **页面等待**: 在页面跳转后等待新页面加载完成
- **弹窗处理**: 及时关闭不必要的弹窗

---

## 测试数据参考

### 登录凭证
- 验证码: `240501`
- 密码: `PP8STD`
- 预期用户: Alex Chow（或其他已配置用户）

### 推荐测试数据

#### 产品配置
- **Spec**: 第一个可用规格（如: API5L 46th Edition X42 PSL 1）
- **AML**: 选择所有（点击 select all）
- **Mill**: 第一个工厂（如: AJMAL Steel,UAE）⚠️ 只选一个
- **产品规格**: 任意可用规格（如: NPS 1/8 XS）
- **数量**: 500 ft（或任意有效数量）

#### 提交信息
- **Company**: 第一个可用公司
- **Buyer**: 关联 Buyer（自动填充）
- **Email**: 自动填充或测试邮箱
- **Sell From**: 第一个可用选项
- **Vertical**: 可选或第一个选项

### 验证检查点

#### 第一页检查点
- ✅ 用户名显示正确
- ✅ Spec/AML/Mill 已选择
- ✅ 产品已添加到报价单
- ✅ 进入第二页

#### 第二页检查点
- ✅ 报价汇总表显示
- ✅ 产品信息正确
- ✅ 进入第三页

#### 第三页检查点
- ✅ 表单字段已填充
- ✅ 必填字段无错误提示
- ✅ 可提交（如需要）

## 性能指标

### 预期执行时间
- **第一页**: 30-60 秒（取决于页面加载速度）
- **第二页**: 5-10 秒
- **第三页**: 15-30 秒（取决于表单填写）
- **总计**: 约 1-2 分钟

### 优化建议
1. 使用快速网络连接
2. 关闭不必要的浏览器标签页
3. 避免在高峰期测试
4. 使用自动化脚本减少人工操作时间

---

*文档版本: v2.0*
*更新时间: 2026-03-04*
*适用场景: PrecisePipe 自动化测试*
*特点: 通用、准确、快速*
