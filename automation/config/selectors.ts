/**
 * 页面元素选择器配置
 * 根据实际网站结构定义
 */
export const selectors = {
  // ==================== 登录页面 ====================
  login: {
    // Sales 选择相关
    salesDropdown: 'input[placeholder="Please select Sales"]',
    salesOption: (name: string) => `text=${name}`,

    // 人机验证
    captchaInput: 'input[type="number"]',

    // Email 登录
    emailLoginBtn: 'button:has-text("Email login")',

    // Slack 验证
    slackCodeInput: 'input[type="text"], input:not([type="number"])',

    // 登录按钮
    loginBtn: 'button:has-text("Login")',

    // 登录成功标识
    userProfile: '.user-profile',
    userName: '.user-name',
  },

  // ==================== 订单面板 ====================
  orderPanel: {
    // 面板容器（iframe）
    panel: 'iframe',

    // 规格标题
    specTitle: 'h1:has-text("NPS")',

    // 长度选择
    lengthDropdown: 'select, [role="combobox"]',
    lengthOption: (value: string) => `option:has-text("${value}")`,

    // 最小长度
    minLengthInput: 'input[placeholder*="Min"]',

    // 最大长度
    maxLengthInput: 'input[placeholder*="Max"]',

    // 数量输入
    quantityInput: 'input[type="number"], input[placeholder*="Quantity"]',

    // 单位选择
    unitDropdown: 'select',

    // 添加到报价单按钮
    addToQuoteBtn: 'button:has-text("Add to Quote")',

    // 返回按钮
    backBtn: 'button:has-text("Back"), .back-btn',
  },

  // ==================== 报价流程 ====================
  quote: {
    // 下一步按钮
    nextBtn: 'button:has-text("Next"), text=Next',

    // 提交按钮
    submitBtn: 'button:has-text("Submit")',

    // 确认对话框
    confirmDialog: '.confirm-dialog',

    // 报价单号
    quoteNumberDisplay: '.quote-number',

    // 成功消息
    successMessage: '.success-message',
  },

  // ==================== 通用元素 ====================
  common: {
    // 加载中
    loadingSpinner: '.loading, .spinner',

    // 错误消息
    errorMessage: '.error-message, .alert-error',

    // 警告消息
    warningMessage: '.warning, .alert-warning',

    // 成功消息
    successAlert: '.success, .alert-success',

    // 关闭按钮
    closeBtn: '.close, .close-btn',

    // 模态框
    modal: '.modal, .dialog',
  },
};

export default selectors;
