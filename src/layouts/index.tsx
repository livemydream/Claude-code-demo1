import { Outlet, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import styles from './index.less';

const { Header, Content, Footer } = Layout;

const menuItems: MenuProps['items'] = [
  { key: 'home', label: '首页' },
  { key: 'about', label: '关于' },
];

export default function Layouts() {
  const location = useLocation();

  // 登录页不需要默认布局
  const isLoginPage = location.pathname === '/login';

  // 登录页直接渲染内容
  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>Claude Code Demo</div>
        <Menu
          theme="dark"
          mode="horizontal"
          items={menuItems}
          defaultSelectedKeys={['home']}
          className={styles.menu}
        />
      </Header>
      <Content className={styles.content}>
        <Outlet />
      </Content>
      <Footer className={styles.footer}>
        Claude Code Demo ©{new Date().getFullYear()} Created with Umi + Antd + Vite
      </Footer>
    </Layout>
  );
}
