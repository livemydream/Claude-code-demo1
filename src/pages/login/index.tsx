import { useState } from 'react';
import styles from './index.less';
import loginBg from '@/assets/images/login-bg.jpg';
import qrCode from '@/assets/images/qr-code.png';
import backArrow from '@/assets/icons/back-arrow.svg';
import checkIcon from '@/assets/icons/check.svg';
import lineIcon from '@/assets/icons/line.svg';
// @ts-ignore
import logoIcon from '@/assets/icons/logo.svg';

type LoginTab = 'password' | 'qrcode' | 'email' | 'sms' | 'forgot' | 'getCode';

interface FormErrors {
  email?: string;
  password?: string;
  code?: string;
  phone?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('password');
  const [rememberMe, setRememberMe] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    code: '',
    phone: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // 表单校验
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 邮箱/手机号校验
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && !/^\d{10,}$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email or phone number';
    }

    // 密码校验
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // 验证码校验
    if (formData.code && formData.code.length < 4) {
      newErrors.code = 'Code must be at least 4 digits';
    }

    // 确认密码校验
    if (formData.confirmPassword && formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 获取验证码倒计时
  const handleGetCode = () => {
    if (countdown > 0) return;

    // 校验邮箱/手机号
    if (!formData.email && !formData.phone) {
      setErrors({ email: 'Please enter email or phone number first' });
      return;
    }

    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // 返回按钮
  const handleBack = () => {
    if (activeTab === 'forgot') {
      setActiveTab('password');
    } else if (activeTab === 'getCode') {
      setActiveTab('password');
    } else {
      window.history.back();
    }
  };

  // 判断输入类型：邮箱还是手机号
  const getInputType = (value: string): 'email' | 'phone' | null => {
    if (!value) return null;
    // 邮箱包含 @ 符号
    if (value.includes('@')) return 'email';
    // 纯数字为手机号
    if (/^\d+$/.test(value)) return 'phone';
    return null;
  };

  // 登录提交
  const handleLogin = () => {
    setSubmitted(true);

    // 密码登录页面的逻辑
    if (activeTab === 'password') {
      // 校验必填字段
      if (!formData.email) {
        setErrors({ email: 'Please enter email or phone number' });
        return;
      }
      if (!formData.password) {
        setErrors({ password: 'Please enter password' });
        return;
      }

      // 根据输入类型跳转到对应的验证页面
      const inputType = getInputType(formData.email);
      if (inputType === 'email') {
        setActiveTab('email');
      } else if (inputType === 'phone') {
        // 将邮箱值复制到手机号字段
        setFormData((prev) => ({ ...prev, phone: prev.email }));
        setActiveTab('sms');
      } else {
        setErrors({ email: 'Please enter a valid email or phone number' });
      }
      return;
    }

    // 其他页面的登录逻辑
    if (validateForm()) {
      console.log('Login with:', formData);
      // 这里可以添加实际的登录逻辑
    }
  };

  // 渲染表单输入框
  const renderInput = (
    placeholder: string,
    field: string,
    type: string = 'text',
    required: boolean = false
  ) => (
    <div className={styles.inputGroup}>
      <input
        type={type}
        className={`${styles.input} ${errors[field as keyof FormErrors] ? styles.inputError : ''}`}
        placeholder={placeholder}
        value={formData[field as keyof typeof formData]}
        onChange={(e) => handleInputChange(field, e.target.value)}
      />
      {errors[field as keyof FormErrors] && (
        <span className={styles.errorText}>{errors[field as keyof FormErrors]}</span>
      )}
    </div>
  );

  // 渲染带验证码按钮的输入框
  const renderInputWithCode = (placeholder: string, field: string) => (
    <div className={styles.inputGroup}>
      <div className={styles.inputWithButton}>
        <input
          type="text"
          className={`${styles.input} ${errors[field as keyof FormErrors] ? styles.inputError : ''}`}
          placeholder={placeholder}
          value={formData[field as keyof typeof formData]}
          onChange={(e) => handleInputChange(field, e.target.value)}
        />
        <button
          className={styles.getCodeButton}
          onClick={handleGetCode}
          disabled={countdown > 0}
        >
          {countdown > 0 ? `${countdown}s` : 'Get Code'}
        </button>
      </div>
      {errors[field as keyof FormErrors] && (
        <span className={styles.errorText}>{errors[field as keyof FormErrors]}</span>
      )}
    </div>
  );

  // 渲染密码登录表单
  const renderPasswordForm = () => (
    <div className={styles.formSection}>
      {renderInput('E-mail or Phone #', 'email', 'text', true)}
      {renderInput('Password', 'password', 'password', true)}
      <div className={styles.optionsRow}>
        <div
          className={styles.rememberMe}
          onClick={() => setRememberMe(!rememberMe)}
        >
          <div className={styles.checkbox}>
            {rememberMe && (
              <img src={checkIcon} alt="check" className={styles.checkIcon} />
            )}
          </div>
          <span className={styles.label}>Stay logged in</span>
        </div>
        <span
          className={styles.forgotPassword}
          onClick={() => setActiveTab('forgot')}
        >
          Forgot Password ?
        </span>
      </div>
      <button className={styles.loginButton} onClick={handleLogin}>Login</button>
    </div>
  );

  // 渲染扫码登录
  const renderQRCodeLogin = () => (
    <div className={styles.qrCodeSection}>
      <div className={styles.qrCodeBox}>
        <img src={qrCode} alt="QR Code" className={styles.qrCodeImage} />
      </div>
      <p className={styles.qrCodeHint}>
        <span>Open </span>
        <span className={styles.appLink}>UOOIAPP</span>
        <span> to use the scan function received it.</span>
      </p>
    </div>
  );

  // 渲染验证邮箱表单
  const renderEmailForm = () => (
    <div className={styles.formSection}>
      {renderInput('E-mail or Phone #', 'email', 'text', true)}
      {renderInputWithCode('Code', 'code')}
      {renderInput('New Password', 'newPassword', 'password')}
      <button className={styles.loginButton} onClick={handleLogin}>Login</button>
    </div>
  );

  // 渲染SMS登录表单
  const renderSMSForm = () => (
    <div className={styles.formSection}>
      {renderInput('Phone Number', 'phone', 'tel', true)}
      {renderInputWithCode('Code', 'code')}
      {renderInput('New Password', 'newPassword', 'password')}
      <button className={styles.loginButton} onClick={handleLogin}>Login</button>
    </div>
  );

  // 渲染忘记密码表单
  const renderForgotPasswordForm = () => (
    <div className={styles.formSection}>
      {renderInput('E-mail or Phone #', 'email', 'text', true)}
      {renderInputWithCode('Code', 'code')}
      {renderInput('New Password', 'newPassword', 'password', true)}
      {renderInput('Confirm Password', 'confirmPassword', 'password', true)}
      <button className={styles.loginButton} onClick={handleLogin}>Reset Password</button>
    </div>
  );

  // 渲染获取验证码页面
  const renderGetCodeForm = () => (
    <div className={styles.formSection}>
      <p className={styles.hintText}>
        Enter your email or phone number to receive a verification code
      </p>
      {renderInput('E-mail or Phone #', 'email', 'text', true)}
      <button
        className={styles.loginButton}
        onClick={() => {
          if (formData.email) {
            handleGetCode();
            setActiveTab('email');
          }
        }}
      >
        Send Code
      </button>
    </div>
  );

  // 根据tab渲染表单
  const renderForm = () => {
    switch (activeTab) {
      case 'password':
        return renderPasswordForm();
      case 'qrcode':
        return renderQRCodeLogin();
      case 'email':
        return renderEmailForm();
      case 'sms':
        return renderSMSForm();
      case 'forgot':
        return renderForgotPasswordForm();
      case 'getCode':
        return renderGetCodeForm();
      default:
        return renderPasswordForm();
    }
  };

  // 获取当前tab组的两个选项
  const getTabOptions = () => {
    if (activeTab === 'password' || activeTab === 'qrcode') {
      return [
        { key: 'password', label: 'Password Login' },
        { key: 'qrcode', label: 'Scan Code Login' },
      ];
    }
    if (activeTab === 'email' || activeTab === 'sms') {
      return [
        { key: 'email', label: 'Verify E-mail' },
        { key: 'sms', label: 'SMS Login' },
      ];
    }
    return null;
  };

  const tabOptions = getTabOptions();

  return (
    <div className={styles.loginContainer}>
      {/* 左侧面板 */}
      <div className={styles.leftPanel}>
        <div className={styles.leftPanelContent}>
          <img src={loginBg} alt="Background" className={styles.bgImage} />
          <div className={styles.bgOverlay}></div>
          <p className={styles.headerText}>Property Management</p>
          <img
            src={lineIcon}
            alt="Decorative line"
            className={styles.decorativeLine}
          />
          <div className={styles.bottomText}>
            <p className={styles.mainTitle}>Professionally</p>
            <p className={styles.subTitle}>licensed brokerage.</p>
          </div>
        </div>
      </div>

      {/* 右侧面板 */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          {/* Logo */}
          <div className={styles.logoWrapper}>
            <img src={logoIcon} alt="Logo" className={styles.formLogo} />
          </div>

          {/* 返回按钮 */}
          <button className={styles.backButton} onClick={handleBack}>
            <img src={backArrow} alt="Back" className={styles.backIcon} />
            <span>Back</span>
          </button>

          {/* 标题 */}
          <div className={styles.titleSection}>
            <h1 className={styles.formTitle}>
              {activeTab === 'forgot' ? 'Forgot Password' : ''}
              {activeTab === 'getCode' ? 'Get Verification Code' : ''}
            </h1>
          </div>

          {/* Tab 切换 */}
          {tabOptions && (
            <div className={styles.tabSection}>
              {tabOptions.map((tab) => (
                <button
                  key={tab.key}
                  className={`${styles.tabItem} ${
                    activeTab === tab.key ? styles.active : styles.tabItemInactive
                  }`}
                  onClick={() => setActiveTab(tab.key as LoginTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* 表单区域 */}
          {renderForm()}
        </div>
      </div>
    </div>
  );
}
