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
├── layouts/      # 全局布局
├── locales/      # 国际化语言文件
├── models/       # 数据模型（可选）
├── services/     # API 服务（可选）
└── global.less   # 全局样式
```

## 注意事项

- 包管理器: npm
- `src/.umi/` 为自动生成目录，请勿编辑
