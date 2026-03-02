# 登录页面功能流程与测试文档

## 概述

本文档记录登录页面的功能流程、实现细节和测试步骤。登录页面支持多种登录方式，并根据用户输入的账号类型（邮箱或手机号）自动重定向到相应的验证页面。

---

## 功能流程

### 页面状态

登录页面包含以下 6 种状态（Tab）：

| 状态 | 说明 | 触发条件 |
|------|------|---------|
| `password` | 密码登录（默认） | 初始进入页面 |
| `qrcode` | 扫码登录 | 点击 "Scan Code Login" Tab |
| `email` | 邮箱验证 | 密码登录时输入邮箱 |
| `sms` | SMS 验证 | 密码登录时输入手机号 |
| `forgot` | 忘记密码 | 点击 "Forgot Password ?" 链接 |
| `getCode` | 获取验证码 | 验证页面点击 "Get Code" |

### 登录重定向逻辑

```
用户输入账号 → 判断输入类型
    │
    ├── 包含 "@" → 识别为邮箱 → 跳转到邮箱验证页面 (email)
    │
    └── 全为数字 → 识别为手机号 → 跳转到 SMS 验证页面 (sms)
```

### 核心代码逻辑

```typescript
// 判断输入类型：邮箱还是手机号
const getInputType = (value: string): 'email' | 'phone' | null => {
  if (!value) return null;
  if (value.includes('@')) return 'email';
  if (/^\d+$/.test(value)) return 'phone';
  return null;
};

// 登录提交处理
const handleLogin = () => {
  setSubmitted(true);
  if (activeTab === 'password') {
    if (!formData.email) {
      setErrors({ email: 'Please enter email or phone number' });
      return;
    }
    if (!formData.password) {
      setErrors({ password: 'Please enter password' });
      return;
    }
    const inputType = getInputType(formData.email);
    if (inputType === 'email') {
      setActiveTab('email');  // 跳转到邮箱验证
    } else if (inputType === 'phone') {
      setFormData((prev) => ({ ...prev, phone: prev.email }));
      setActiveTab('sms');    // 跳转到 SMS 验证
    } else {
      setErrors({ email: 'Please enter a valid email or phone number' });
    }
    return;
  }
  // 其他状态的处理...
};
```

---

## 文件结构

```
src/
├── pages/
│   └── login/
│       ├── index.tsx           # 登录页面主组件
│       └── index.less          # 登录页面样式
├── assets/
│   ├── images/
│   │   ├── login-bg.jpg        # 左侧背景图
│   │   └── qr-code.png         # 二维码图片
│   └── icons/
│       ├── back-arrow.svg      # 返回箭头图标
│       ├── check.svg           # 勾选图标
│       └── line.svg            # 装饰线条
└── layouts/
    └── index.tsx               # 全局布局（登录页隐藏 Header/Footer）
```

---

## 测试步骤

### 前置条件

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 确保服务器运行在 `http://localhost:8000`

3. 打开浏览器访问登录页面：`http://localhost:8000/login`

---

### 测试用例 1：邮箱登录重定向

**目的**：验证输入邮箱后能正确跳转到邮箱验证页面

**步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 访问 `http://localhost:8000/login` | 显示密码登录页面 |
| 2 | 在 "E-mail or Phone #" 输入框输入 `user@example.com` | 输入框显示邮箱 |
| 3 | 在 "Password" 输入框输入 `test123456` | 输入框显示密码（掩码） |
| 4 | 点击 "Login" 按钮 | 页面切换到邮箱验证页面 |
| 5 | 验证页面元素 | Tab 显示 "Verify E-mail" / "SMS Login"，显示验证码输入框 |

**实际结果**：✅ 通过

---

### 测试用例 2：手机号登录重定向

**目的**：验证输入手机号后能正确跳转到 SMS 验证页面

**步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 访问 `http://localhost:8000/login` | 显示密码登录页面 |
| 2 | 在 "E-mail or Phone #" 输入框输入 `13812345678` | 输入框显示手机号 |
| 3 | 在 "Password" 输入框输入 `test123456` | 输入框显示密码（掩码） |
| 4 | 点击 "Login" 按钮 | 页面切换到 SMS 验证页面 |
| 5 | 验证页面元素 | Tab 显示 "Verify E-mail" / "SMS Login"，手机号自动填充，显示验证码输入框 |

**实际结果**：✅ 通过

---

### 测试用例 3：Tab 切换功能

**目的**：验证 Tab 切换功能正常

**步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 在密码登录页面点击 "Scan Code Login" | 显示二维码登录界面 |
| 2 | 点击 "Password Login" | 返回密码登录界面 |
| 3 | 点击 "Forgot Password ?" | 显示忘记密码表单 |

---

### 测试用例 4：表单验证

**目的**：验证表单必填项验证

**步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 不填写任何内容，点击 "Login" | 显示错误提示 "Please enter email or phone number" |
| 2 | 只填写账号，不填写密码，点击 "Login" | 显示错误提示 "Please enter password" |

---

## 测试结果汇总

| 测试场景 | 输入 | 预期结果 | 实际结果 |
|---------|------|---------|---------|
| 邮箱登录 | `user@example.com` + 密码 | 重定向到邮箱验证页 | ✅ 通过 |
| 手机号登录 | `13812345678` + 密码 | 重定向到 SMS 验证页 | ✅ 通过 |
| Tab 切换 | 点击不同 Tab | 切换登录方式 | ✅ 通过 |
| 表单验证 | 空表单提交 | 显示错误提示 | ✅ 通过 |

---

## 注意事项

1. **布局隔离**：登录页面使用独立的全屏布局，不显示默认的 Header 和 Footer。通过在 `src/layouts/index.tsx` 中检测路径实现：

   ```typescript
   const isLoginPage = location.pathname === '/login';
   if (isLoginPage) {
     return <Outlet />;
   }
   ```

2. **输入类型判断**：
   - 包含 `@` 符号 → 识别为邮箱
   - 全为数字 → 识别为手机号
   - 其他格式 → 显示错误提示

3. **数据传递**：手机号登录时，会将输入的账号值自动填充到手机号字段：

   ```typescript
   setFormData((prev) => ({ ...prev, phone: prev.email }));
   ```

---

## 相关文件

- [src/pages/login/index.tsx](../src/pages/login/index.tsx) - 登录页面主组件
- [src/pages/login/index.less](../src/pages/login/index.less) - 登录页面样式
- [src/layouts/index.tsx](../src/layouts/index.tsx) - 全局布局配置
- [src/assets/images/](../src/assets/images/) - 图片资源目录

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-03-02 | 1.0.0 | 初始版本，完成登录重定向功能测试 |
