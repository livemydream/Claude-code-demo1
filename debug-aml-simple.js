// 简化的 AML 调试脚本
const { chromium } = require('playwright');

(async () => {
  console.log('🔍 简化 AML 调试...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // 导航并登录（使用已有的会话）
    await page.goto('https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html');
    await page.waitForLoadState('networkidle');

    console.log('✅ 已在订单页面');

    // 等待一下
    await sleep(2000);

    // 直接检查页面内容
    console.log('\n🔍 检查页面 AML 相关内容...');

    // 获取页面所有文本
    const pageText = await page.textContent('body');
    const hasAML = pageText.toLowerCase().includes('aml');

    console.log(`页面包含 AML 文本: ${hasAML}`);

    if (hasAML) {
      // 查找 AML 相关元素
      const elements = await page.$$eval('*', (elements) => {
        return Array.from(elements).filter(el => {
          const text = el.textContent || '';
          return text.toLowerCase().includes('aml');
        }).map(el => ({
          tag: el.tagName,
          id: el.id || '',
          classes: el.className || '',
          text: text.substring(0, 100).trim()
        }));
      });

      console.log('\n找到的 AML 元素:');
      elements.forEach((el, i) => {
        console.log(`[${i + 1}] <${el.tag}> ID: ${el.id}`);
        console.log(`     类名: ${el.classes}`);
        console.log(`     文本: "${el.text}"`);
      });

      // 查找所有 select
      const selects = await page.$$eval('select', (els) => {
        return els.map(el => ({
          id: el.id,
          name: el.name,
          options: Array.from(el.options).map(opt => ({
            value: opt.value,
            text: opt.textContent?.trim()
          }))
        }));
      });

      console.log('\n页面上的 select 元素:');
      selects.forEach((sel, i) => {
        console.log(`[${i + 1}] ID: ${sel.id}, Name: ${sel.name}`);
        if (sel.options.some(opt => opt.text?.toLowerCase().includes('aml'))) {
          console.log('   ✅ 包含 AML 选项!');
          sel.options.forEach(opt => {
            if (opt.text?.toLowerCase().includes('aml')) {
              console.log(`      - ${opt.text}`);
            }
          });
        }
      });
    }

    // 截图
    await page.screenshot({
      path: 'screenshots/aml-simple-debug.png',
      fullPage: true
    });
    console.log('\n📸 截图已保存');

    // 等待查看
    console.log('\n⏳ 请查看页面和截图，30秒后关闭...');
    await sleep(30000);

  } catch (err) {
    console.error('❌ 出错:', err);
    await page.screenshot({
      path: 'screenshots/aml-simple-error.png',
      fullPage: true
    }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
})();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}