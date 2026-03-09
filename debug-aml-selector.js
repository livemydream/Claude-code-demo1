const { chromium } = require('playwright');

(async () => {
  console.log('🔍 调试 AML 选择器...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    devtools: true,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // 导航到订单页面
    await page.goto('https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html');

    // 等待登录
    await page.waitForLoadState('networkidle');
    console.log('✅ 页面加载完成');

    // 自动登录
    console.log('\n🔐 自动登录...');

    // 选择 Sales
    await page.getByRole('textbox', { name: 'Please select Sales' }).click();
    await sleep(500);
    await page.getByRole('definition').filter({ hasText: 'Alex Chow' }).click();

    // 输入验证码
    await page.getByRole('spinbutton').fill('240501');
    await page.getByRole('button', { name: 'Next' }).click();

    // 第二步验证
    await page.waitForSelector('text=Enter the verification code', { timeout: 10000 });
    await sleep(500);
    await page.locator('text=Code').locator('..').locator('input').fill('PP8STD');
    await page.locator('button.login, button[lay-filter="login"]').click();

    // 等待跳转
    await page.waitForURL('**/quote_Line_Pipe.html', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ 登录成功');

    // 填写表头
    console.log('\n📋 填写表头...');
    await page.waitForSelector('#tableList ul.tr_ul', { timeout: 60000 });

    // 设置 Incoterm
    await selectLayuiOption(page, 'incoterm', 'FOB');
    console.log('✅ 已设置 Incoterm: FOB');

    // 设置 Port
    await selectLayuiOption(page, 'port', 'SHANGHAI');
    console.log('✅ 已设置 Port: SHANGHAI');

    // 设置 Currency
    await page.locator('.layui-form-radio').filter({ hasText: 'USD' }).first().click();
    console.log('✅ 已设置 Currency: USD');

    // 取消勾选 Same spec
    await uncheckSameSpec(page);

    // 检查 AML 选择器
    console.log('\n🎯 检查 AML 选择器...');

    // 等待一下
    await sleep(1000);

    // 查找所有与 AML 相关的元素
    const amlInfo = await page.evaluate(() => {
      const results = {
        hasAMLText: false,
        selects: [],
        layuiSelects: [],
        anyElementWithAml: []
      };

      // 检查是否有 AML 文本
      results.hasAMLText = document.body.textContent?.toLowerCase().includes('aml') || false;

      // 查找所有 select
      const selects = document.querySelectorAll('select');
      for (const select of selects) {
        const id = select.id || '';
        const name = select.name || '';
        const text = select.textContent || '';

        if (name.toLowerCase().includes('aml') ||
            id.toLowerCase().includes('aml') ||
            text.toLowerCase().includes('aml')) {
          results.selects.push({
            id: id,
            name: name,
            text: text.substring(0, 100)
          });
        }
      }

      // 查找所有 layui-select-title
      const layuiSelects = document.querySelectorAll('.layui-select-title');
      for (const layuiSelect of layuiSelects) {
        const parent = layuiSelect.parentElement;
        const text = parent?.textContent || '';

        if (text.toLowerCase().includes('aml')) {
          results.layuiSelects.push({
            text: text.substring(0, 100),
            classes: parent?.className || ''
          });
        }
      }

      // 查找任何包含 AML 的元素
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent || '';
        if (text.toLowerCase().includes('aml')) {
          results.anyElementWithAml.push({
            tag: el.tagName,
            id: el.id || '',
            classes: el.className || '',
            text: text.trim()
          });
        }
      }

      return results;
    });

    console.log('\n📊 AML 检查结果:');
    console.log(`- 页面包含 AML 文本: ${amlInfo.hasAMLText}`);
    console.log(`- 找到的 select 元素: ${amlInfo.selects.length}`);
    amlInfo.selects.forEach((sel, i) => {
      console.log(`  [${i + 1}] ID: ${sel.id}, Name: ${sel.name}`);
      console.log(`      内容: ${sel.text}`);
    });

    console.log(`- 找到的 layui-select: ${amlInfo.layuiSelects.length}`);
    amlInfo.layuiSelects.forEach((sel, i) => {
      console.log(`  [${i + 1}] ${sel.text}`);
    });

    console.log(`- 包含 AML 的元素: ${amlInfo.anyElementWithAml.length}`);
    amlInfo.anyElementWithAml.forEach((el, i) => {
      console.log(`  [${i + 1}] <${el.tag}> ID: ${el.id}, Classes: ${el.classes}`);
      console.log(`      文本: "${el.text}"`);
    });

    // 截图
    await page.screenshot({
      path: 'screenshots/aml-selector-debug.png',
      fullPage: true
    });
    console.log('\n📸 截图已保存: screenshots/aml-selector-debug.png');

    // 等待查看
    console.log('\n⏳ 请查看输出和截图，浏览器将在 30 秒后关闭...');
    await sleep(30000);

  } catch (err) {
    console.error('❌ 出错:', err);
    await page.screenshot({
      path: 'screenshots/aml-error.png',
      fullPage: true
    }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
    console.log('\n🔧 浏览器已关闭');
  }
})();

// 工具函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function selectLayuiOption(page, selectId, optionText) {
  await page.locator(`select#${selectId}`).locator('..').locator('.layui-select-title').click();
  await sleep(300);
  const dd = page.locator(`select#${selectId}`).locator('..').locator('.layui-select-options dd').filter({ hasText: optionText }).first();
  await dd.waitFor({ timeout: 5000 });
  await dd.click();
}

async function uncheckSameSpec(page) {
  try {
    const isChecked = await page.evaluate(() => {
      const allEls = Array.from(document.querySelectorAll('*'));
      for (const el of allEls) {
        if (el.childNodes.length === 1 && el.textContent?.trim() === 'Same spec across all items') {
          const row = el.closest('.layui-form-item') || el.parentElement;
          const cb = row?.querySelector('input[type="checkbox"]');
          if (cb) return cb.checked;
        }
      }
      const inputs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      for (const inp of inputs) {
        const label = inp.closest('label') || inp.parentElement;
        if (label?.textContent?.includes('Same spec')) return inp.checked;
      }
      return null;
    });

    if (isChecked === true) {
      const checkbox = page.locator('.layui-form-checkbox').filter({ hasText: 'Same spec across all items' }).first();
      if (await checkbox.count() > 0) {
        await checkbox.click();
      } else {
        await page.locator('text=Same spec across all items').first().click();
      }
      await sleep(300);
      console.log('✅ 已取消勾选 "Same spec across all items"');
    }
  } catch (e) {
    console.warn(`⚠ 取消勾选 Same spec 失败: ${e}`);
  }
}