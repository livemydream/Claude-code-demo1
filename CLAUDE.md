# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 技术栈

- **框架**: Umi 4 (@umijs/max)
- **UI 组件库**: Antd 5
- **构建工具**: Vite (MFSU 已禁用)
- **语言**: TypeScript
- **样式**: Less

## 常用命令

```bash
npm run dev      # 启动开发服务器 http://localhost:8000
npm run build    # 生产构建，输出到 dist/
npm run preview  # 预览生产构建
```

## 架构说明

### 路由

使用约定式路由，在 `src/pages/` 目录下创建文件自动生成路由：
- `src/pages/index.tsx` → `/`
- `src/pages/about.tsx` → `/about`
- `src/pages/users/[id].tsx` → `/users/:id`

### 国际化

语言文件位于 `src/locales/`：
- `zh-CN.ts` - 中文（默认）
- `en-US.ts` - 英文

在组件中使用：
```tsx
import { useIntl, FormattedMessage } from '@umijs/max';

// Hook 方式
const intl = useIntl();
intl.formatMessage({ id: 'key' });

// 组件方式
<FormattedMessage id="key" />
```

切换语言：
```tsx
import { setLocale } from '@umijs/max';
setLocale('en-US', false);
```

### 布局

全局布局位于 `src/layouts/index.tsx`，包裹所有页面。使用 Antd Layout 组件，包含 Header、Content、Footer。

### 插件

在 `.umirc.ts` 中配置：
- **antd**: Antd 组件库
- **locale**: 国际化支持
- **model**: 数据流（类 dva）
- **request**: 网络请求工具

### 样式

- 全局样式: `src/global.less`
- 组件样式: 同目录 `.less` 文件（如 `index.tsx` + `index.less`）
- CSS Modules: 导入为 `styles.className`

## 目录约定

```
src/
├── pages/        # 页面（自动生成路由）
│   └── login/    # 登录页面（5种登录方式）
├── layouts/      # 全局布局
├── locales/      # 国际化语言文件
├── assets/       # 静态资源
│   ├── images/   # 图片资源
│   └── icons/    # 图标资源
├── models/       # 数据模型（可选）
├── services/     # API 服务（可选）
└── global.less   # 全局样式
```

## 登录页面

### 功能概述

登录页面支持 5 种登录方式：
1. **密码登录** - 输入邮箱/手机号 + 密码（默认）
2. **扫码登录** - 扫描二维码登录
3. **邮箱验证** - 邮箱 + 验证码
4. **SMS 登录** - 手机号 + 验证码
5. **忘记密码** - 重置密码流程

### 登录重定向逻辑

```
用户输入账号 → 判断输入类型
    │
    ├── 包含 "@" → 识别为邮箱 → 跳转到邮箱验证页面
    │
    └── 全为数字 → 识别为手机号 → 跳转到 SMS 验证页面
```

### 布局隔离

登录页面使用全屏布局，不显示默认的 Header 和 Footer。在 `src/layouts/index.tsx` 中通过路径检测实现：

```typescript
const isLoginPage = location.pathname === '/login';
if (isLoginPage) {
  return <Outlet />;
}
```

### 设计规范

```less
// 颜色
@primary-color: #135EA8;      // 主色（蓝色）
@text-primary: #1C1F34;       // 主要文字
@text-secondary: #90A3BF;     // 辅助文字
@text-muted: #6C757D;         // 次要文字

// 尺寸
@login-left-width: 812px;     // 左侧背景图宽度
@login-right-width: 520px;    // 右侧表单宽度
@input-height: 60px;          // 输入框高度
@button-height: 60px;         // 按钮高度
```

### 相关文件

- `src/pages/login/index.tsx` - 登录页面主组件
- `src/pages/login/index.less` - 登录页面样式
- `src/layouts/index.tsx` - 全局布局（登录页隔离）
- `testt/login-flow-test.md` - 功能流程与测试文档

## 注意事项

- 包管理器: npm
- `src/.umi/` 为自动生成目录，请勿编辑
- 导入 `Outlet` 和 `useLocation` 时使用 `react-router-dom`，而非 `@umijs/max`
