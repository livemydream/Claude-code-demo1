# PrecisePipe 自动化下单流程记录

## 网站地址
```
https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html
```

---

## 登录流程（2步）

### 第1步：图形验证码登录
- **Sales 下拉框**：`textbox[name="Please select Sales"]` → 点击选择姓名
- **图形验证码**：`spinbutton` → 填入固定码（快速通道：`240501`）
- **点击 Next**：`button[name="Next"]`

### 第2步：Slack 验证码
- **验证码输入**：页面出现 `input[type="text"]` → 填入 Slack 收到的验证码
  - 快速通道固定码：`PP8STD`（一次性，每次使用需更新）
- **点击 Login**：`button[name="Login", exact: true]`
  - ⚠️ 注意：页面同时存在 "Email login" 和 "Login" 两个按钮，必须用 `exact: true`

### 登录成功标志
- URL 跳转至 `**/quote_Line_Pipe.html`
- 右上角显示 `Hi, {Sales Name}`

---

## 订单页面结构

### 表头字段
| 字段 | 选择器 | 说明 |
|------|--------|------|
| Incoterm | `textbox[name="Select Incoterm"]` | 下拉框，如 DDP |
| Port | `textbox[name="Select Port"]` | 下拉框，如 Edmonton (Canada) |
| Currency | `text=USD` / `text=CAD` | 单选按钮 |

### 尺寸选择表格
- **表头列**：`ul#schName li.th`（共17列：NPS, OD, S10, S20, S30, STD, S40, XS, S60, S80, S100, S120, S140, XXS, S160, X）
- **数据行容器**：`div#tableList`（子元素为 `ul.tr_ul`，每行代表一个 NPS 尺寸）
- **行结构**：
  ```
  ul.tr_ul
  ├── li[data-index="0"]          → NPS 值（如 "1/8", "1/4", "2 1/2"）
  ├── li[data-index="10"]         → OD 值（如 "0.405\""）
  └── li[data-sch="s_STD"]        → 对应 Schedule 的壁厚值，点击打开弹窗
  ```
- **点击方式**（通过 JS evaluate）：
  ```js
  // 找到 NPS 行，点击对应 Schedule 列
  const row = rows.find(ul => ul.querySelector('li[data-index="0"]').textContent.trim() === nps);
  row.querySelector(`li[data-sch="s_${schedule}"]`).click();
  ```

---

## 弹窗（Item Modal）结构

点击尺寸单元格后，出现 **layui 弹窗**，内容在 iframe 中：

- **iframe ID**：`#layui-layer-iframe2`
- **iframe src**：`/quote/components/itemView.html`

### 弹窗字段
| 字段 | 选择器（在 iframe contentDocument 内） | 说明 |
|------|---------------------------------------|------|
| Length | `.el-select__input` (第1个) | 下拉，如 DRL |
| Min Length | `.el-input__inner` (第1个) | 文本输入 |
| Max Length | `.el-input__inner` (第2个) | 文本输入 |
| Finishing | `.el-select__input` | 下拉 |
| End | `.el-select__input` | 下拉 |
| Exterior Surface | `.el-select__input` | 多选标签 |
| Internal Surface | `.el-select__input` | 多选标签 |
| **Quantity** | `.footer .footer_li .el-input__inner` | **核心字段** |
| Unit | `.footer .el-select__input` | 下拉，如 ft |
| Add to Quote | `button.footer_li_btn` | 提交按钮 |

### 填写数量（Vue 响应式输入）
```js
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
).set;
nativeInputValueSetter.call(qtyInput, String(qty));
qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
```
> ⚠️ 必须用原生 setter + dispatch 事件，直接赋值 `.value = x` 不会触发 Vue 更新

### 关闭弹窗
- 点击 "Add to Quote" 后 iframe 自动消失
- 等待：`waitForSelector('#layui-layer-iframe2', { state: 'hidden' })`

---

## Excel 数据格式（demo.xlsx）

### 列定义
| 列名 | 说明 | 示例 |
|------|------|------|
| Incoterm | 贸易条款 | DDP |
| Currency | 货币 | USD / CAD |
| Destination | 目的地/港口 | Edmonton |
| Spec | 材料规格 | API5L 46th Edition B PSL 1 |
| Size | NPS + Schedule | NPS 1/8 STD |
| Qty | 数量 | 100 |
| Unit | 单位 | ft |

### 解析规则
- **Size 格式**：`NPS {nps} {schedule}`
  - `NPS 1/8 STD` → nps=`1/8`, schedule=`STD`
  - `NPS 2 1/2 XS` → nps=`2 1/2`, schedule=`XS`
- **继承规则**：Incoterm/Currency/Destination/Spec 为空时沿用上一行的值
- **跳过规则**：Size 或 Qty 为空的行跳过

### Schedule 映射
| Excel 写法 | 表格列 class |
|-----------|-------------|
| STD | `s_STD` |
| XS | `s_XS` |
| S10 | `s_S10` |
| S20 | `s_S20` |
| XXS | `s_XXS` |

---

## 已知问题 & 注意事项

1. **Slack 验证码一次性**：每次运行前需要在 `CONFIG.slackCode` 填入最新验证码，或留空后从控制台手动输入
2. **图形验证码固定**：`240501` 是快速通道固定码，无需识别图片
3. **iframe 输入需用原生 setter**：Vue 组件的 input 必须触发 input/change 事件才能更新
4. **Login 按钮需 exact**：页面同时存在 "Email login"，需要 `exact: true` 精确匹配
5. **数据加载需等待**：登录后需等待 `#tableList` 渲染完成（约 3 秒）

---

## 运行方式

```bash
# 更新 src/order.ts 中的 slackCode，然后：
npm run order
```

### 配置项（src/order.ts 顶部）
```typescript
const CONFIG = {
  captchaCode: '240501',   // 图形验证码（固定）
  slackCode: '',           // Slack 验证码（留空则运行时手动输入）
  salesName: 'Alex Chow',
  excelFile: './demo.xlsx',
  headless: false,
};
```
