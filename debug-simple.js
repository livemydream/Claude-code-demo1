const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html');

    // 等待登录完成
    await page.waitForLoadState('networkidle');
    console.log('✅ 页面已加载完成');

    // 等待几秒让用户手动登录
    console.log('⏳ 请手动登录，然后按回车继续...');
    await new Promise(resolve => {
      process.stdin.resume();
      process.stdin.on('data', resolve);
    });

    // 查找所有相关的元素
    console.log('\n🔍 查找所有 radio 按钮:');
    const radios = await page.evaluate(() => {
      const allRadios = document.querySelectorAll('input[type="radio"]');
      return Array.from(allRadios).map(radio => ({
        id: radio.id,
        name: radio.name,
        value: radio.value,
        checked: radio.checked,
        label: document.querySelector(`label[for="${radio.id}"]`)?.textContent?.trim() ||
               radio.closest('label')?.textContent?.trim() || ''
      }));
    });

    radios.forEach((radio, i) => {
      console.log(`\nRadio ${i + 1}:`);
      console.log(`  ID: ${radio.id}`);
      console.log(`  Name: ${radio.name}`);
      console.log(`  Value: ${radio.value}`);
      console.log(`  Checked: ${radio.checked}`);
      console.log(`  Label: "${radio.label}"`);
    });

    // 查找包含 AML 的文本
    console.log('\n🔍 查找包含 AML 的文本:');
    const amlTexts = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const results = [];

      allElements.forEach(el => {
        const text = el.textContent || '';
        if (text.toLowerCase().includes('aml')) {
          results.push({
            tag: el.tagName,
            id: el.id,
            class: el.className,
            text: text.trim()
          });
        }
      });

      return results;
    });

    amlTexts.forEach((item, i) => {
      console.log(`\nAML 相关 ${i + 1}:`);
      console.log(`  标签: ${item.tag}`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Class: ${item.class}`);
      console.log(`  文本: "${item.text}"`);
    });

    // 截图
    await page.screenshot({ path: 'screenshots/debug-full.png', fullPage: true });
    console.log('\n📸 已保存截图到 screenshots/debug-full.png');

    console.log('\n⏳ 等待 60 秒供检查...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('错误:', error);
    await page.screenshot({ path: 'screenshots/debug-error.png' });
  } finally {
    await browser.close();
  }
})();