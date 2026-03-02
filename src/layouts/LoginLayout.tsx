import { Outlet } from '@umijs/max';
import styles from './LoginLayout.less';

export default function LoginLayout() {
  return (
    <div className={styles.loginLayout}>
      <Outlet />
    </div>
  );
}
