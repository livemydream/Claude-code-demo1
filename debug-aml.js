const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html');
    await page.waitForLoadState('networkidle');

    console.log('🔍 开始检查 AML 选项...');

    // 方法1: 查找所有包含 "aml" 的元素
    console.log('\n📋 方法1: 查找所有包含 "aml" 的元素');
    const amlElements = await page.$$eval('*', elements =>
      Array.from(elements).filter(el => {
        if (!el.tagName) return false;
        const id = el.id || '';
        const name = el.name || '';
        const text = el.textContent || '';
        return id.toLowerCase().includes('aml') ||
               name.toLowerCase().includes('aml') ||
               text.toLowerCase().includes('aml');
      }).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        text: el.textContent?.trim() || '',
        htmlFor: el.htmlFor,
        className: el.className
      }))
    );

    if (amlElements.length > 0) {
      console.log('找到 AML 相关元素:');
      amlElements.forEach(el => console.log(JSON.stringify(el, null, 2)));
    } else {
      console.log('未找到包含 "aml" 的元素');
    }

    // 方法2: 查找所有 radio 按钮
    console.log('\n📋 方法2: 查找所有 radio 按钮');
    const radios = await page.$$eval('input[type="radio"]', inputs =>
      inputs.map(input => ({
        id: input.id,
        name: input.name,
        value: input.value,
        checked: input.checked,
        label: document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ||
               input.closest('label')?.textContent?.trim() || ''
      }))
    );

    if (radios.length > 0) {
      console.log('找到 Radio 按钮:');
      radios.forEach(radio => console.log(JSON.stringify(radio, null, 2)));
    } else {
      console.log('未找到 Radio 按钮');
    }

    // 方法3: 截图
    console.log('\n📸 保存页面截图');
    await page.screenshot({ path: 'screenshots/debug-aml.png', fullPage: true });

    console.log('\n⏳ 等待 30 秒，请手动查看页面...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('错误:', error);
    await page.screenshot({ path: 'screenshots/debug-error.png' });
  } finally {
    await browser.close();
  }
})();