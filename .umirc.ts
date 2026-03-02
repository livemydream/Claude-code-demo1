import { defineConfig } from '@umijs/max';

export default defineConfig({
  // 启用插件
  plugins: [
    '@umijs/plugins/dist/antd',
    '@umijs/plugins/dist/locale',
    '@umijs/plugins/dist/model',
    '@umijs/plugins/dist/request',
  ],

  // Antd 配置
  antd: {},

  // 国际化配置
  locale: {
    default: 'zh-CN',
    baseSeparator: '-',
  },

  // 数据流配置
  model: {},

  // 网络请求配置
  request: {},

  // 路由历史模式
  history: { type: 'browser' },

  // 约定式路由（基于 pages 目录自动生成）
  conventionRoutes: {},

  // 关闭 MFSU 以使用 Vite
  mfsu: false,
});
