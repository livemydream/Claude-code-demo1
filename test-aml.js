const { chromium } = require('playwright');

(async () => {
  console.log('🔍 测试 AML 选择器...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // 导航到订单页面（假设已经登录）
    await page.goto('https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html');
    await page.waitForLoadState('networkidle');
    console.log('✅ 页面加载完成');

    // 等待 AML 选择器出现
    console.log('\n🎯 等待 AML 选择器...');
    await page.waitForSelector('input[name="AML"]', { timeout: 10000 });
    console.log('✅ 找到 AML 选择器');

    // 获取 AML 选择器信息
    const amlInfo = await page.evaluate(() => {
      const amlInput = document.querySelector('input[name="AML"]');
      if (!amlInput) return { found: false };

      const parent = amlInput.parentElement;
      const siblings = Array.from(parent?.children || []);

      return {
        found: true,
        parentTag: parent?.tagName,
        parentClasses: parent?.className,
        siblings: siblings.map(sib => ({
          tag: sib.tagName,
          text: sib.textContent?.trim(),
          isInput: sib.tagName === 'INPUT'
        }))
      };
    });

    console.log('\n📊 AML 选择器结构:');
    console.log(JSON.stringify(amlInfo, null, 2));

    // 点击 AML 选择器
    console.log('\n🖱️ 点击 AML 选择器...');
    await page.locator('input[name="AML"]').click();
    await sleep(1000);

    // 检查下拉选项
    console.log('\n📋 检查下拉选项...');
    const options = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      return divs.filter(div => {
        const text = div.textContent || '';
        return text.includes('Non-AML') || text.includes('select all') || text.includes('clear');
      }).map(div => ({
        text: div.textContent?.trim(),
        tag: div.tagName,
        parentTag: div.parentElement?.tagName,
        classes: div.className
      }));
    });

    console.log('找到的选项:');
    options.forEach((opt, i) => {
      console.log(`[${i + 1}] ${opt.text}`);
    });

    // 查找并点击 Non-AML 选项
    console.log('\n🎯 查找 Non-AML 选项...');
    const nonAmlOption = await page.locator('div').filter({ hasText: 'Non-AML' }).first();
    if (await nonAmlOption.count() > 0) {
      console.log('✅ 找到 Non-AML 选项');

      // 获取选项详情
      const optionDetails = await nonAmlOption.evaluate((el) => {
        return {
          text: el.textContent?.trim(),
          parent: el.parentElement?.tagName,
          grandParent: el.parentElement?.parentElement?.tagName,
          isVisible: el.offsetParent !== null
        };
      });
      console.log('选项详情:', optionDetails);

      // 点击选项
      await nonAmlOption.click();
      console.log('✅ 已点击 Non-AML');

      // 验证结果
      await sleep(500);
      const aValue = await page.locator('input[name="AML"]').inputValue();
      console.log(`\n📊 验证结果 - AML 输入框值: "${aValue}"`);

      if (aValue.toLowerCase().includes('non-aml')) {
        console.log('✅ Non-AML 选择成功!');
      } else {
        console.log('⚠ AML 值未更新，可能需要其他操作');
      }
    } else {
      console.log('❌ 未找到 Non-AML 选项');
    }

    // 截图
    await page.screenshot({
      path: 'screenshots/test-aml.png',
      fullPage: true
    });
    console.log('\n📸 截图已保存');

    // 等待查看
    console.log('\n⏳ 请查看页面和截图，30秒后关闭...');
    await sleep(30000);

  } catch (err) {
    console.error('❌ 出错:', err);
    await page.screenshot({
      path: 'screenshots/test-aml-error.png',
      fullPage: true
    }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
    console.log('\n🔧 浏览器已关闭');
  }
})();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}