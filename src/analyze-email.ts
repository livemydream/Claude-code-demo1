import { chromium } from 'playwright';

async function main() {
  console.log('启动浏览器...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 设置更长的超时时间
  page.setDefaultTimeout(60000);

  console.log('正在打开页面...');
  await page.goto('https://tools.precisepipe.com/assistant/email/q5291', { timeout: 60000 });
  console.log('页面已打开:', page.url());

  console.log('\n⏳ 检查登录状态...');

  // 循环检查登录状态和localStorage
  let isLoggedIn = false;
  let checkCount = 0;
  const maxChecks = 30; // 最多检查30次，每次2秒，总共1分钟

  while (!isLoggedIn && checkCount < maxChecks) {
    checkCount++;
    console.log(`\n🔄 第 ${checkCount} 次检查...`);

    // 获取当前 localStorage 中的所有 key
    const allKeys = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i) || '');
      }
      return keys;
    });
    console.log('当前 localStorage keys:', allKeys);

    // 检查 LinePipe_loginVerify 是否有值
    const loginVerify = await page.evaluate(() => {
      return localStorage.getItem('LinePipe_loginVerify');
    });

    if (loginVerify) {
      isLoggedIn = true;
      console.log('✅ 检测到 LinePipe_loginVerify 有值，登录成功！');
      console.log('LinePipe_loginVerify 值:', loginVerify);
      console.log('🔄 正在刷新页面...');
      await page.reload({ waitUntil: 'networkidle' });
      console.log('✅ 页面刷新完成！');
    } else {
      console.log('❌ LinePipe_loginVerify 为空，请在浏览器中完成登录...');
      if (checkCount < maxChecks) {
        console.log(`等待 2 秒后再次检查... (剩余 ${maxChecks - checkCount} 次检查)`);
        await page.waitForTimeout(2000);
      }
    }
  }

  if (!isLoggedIn) {
    console.log(`⏰ 已达到最大检查次数 (${maxChecks})，登录可能仍未完成。`);
  }

  console.log('\n✅ 检测到登录成功！');
  console.log('\n🔍 开始分析页面...');

  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const url = page.url();
  const title = await page.title();
  console.log('\n=== 页面基本信息 ===');
  console.log('URL:', url);
  console.log('标题:', title);

  // 获取页面文本内容
  const bodyText = await page.locator('body').innerText();
  console.log('\n=== 页面文本内容 ===');
  console.log(bodyText);

  // 分析表单元素
  console.log('\n=== 表单元素 ===');

  const inputs = await page.locator('input:not([type="hidden"])').all();
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const type = await input.getAttribute('type') || 'text';
    const name = await input.getAttribute('name') || await input.getAttribute('placeholder') || '';
    const id = await input.getAttribute('id') || '';
    console.log(`Input ${i + 1}: type=${type}, name=${name}, id=${id}`);
  }

  const selects = await page.locator('select').all();
  for (let i = 0; i < selects.length; i++) {
    const select = selects[i];
    const name = await select.getAttribute('name') || '';
    const id = await select.getAttribute('id') || '';
    console.log(`Select ${i + 1}: name=${name}, id=${id}`);
  }

  const textareas = await page.locator('textarea').all();
  for (let i = 0; i < textareas.length; i++) {
    const ta = textareas[i];
    const name = await ta.getAttribute('name') || await ta.getAttribute('placeholder') || '';
    const id = await ta.getAttribute('id') || '';
    console.log(`Textarea ${i + 1}: name=${name}, id=${id}`);
  }

  const buttons = await page.locator('button').all();
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const text = await btn.innerText();
    console.log(`Button ${i + 1}: "${text}"`);
  }

  // 截图
  await page.screenshot({ path: 'screenshots/email-page.png', fullPage: true });
  console.log('\n📸 截图已保存到 screenshots/email-page.png');

  console.log('\n⏳ 浏览器保持打开状态，你可以手动查看。');
  console.log('关闭此终端或按 Ctrl+C 可退出。');

  // 保持浏览器打开
  await new Promise(() => {}); // 永远等待
}

main().catch(console.error);
