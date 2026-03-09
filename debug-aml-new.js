// 使用 Chrome DevTools 自动登录并检查 AML 选择问题
const { chromium } = require('playwright');

(async () => {
  console.log('🔍 启动 Chrome DevTools 调试...');

  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    devtools: true,  // 开启 DevTools
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // 导航到登录页面
    console.log('\n📱 导航到登录页面...');
    await page.goto('https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html');

    // 等待页面加载
    await page.waitForLoadState('networkidle');
    console.log('✅ 页面加载完成');

    // 1. 自动登录
    console.log('\n🔐 开始自动登录...');

    // 选择 Sales
    console.log('  选择 Sales...');
    await page.getByRole('textbox', { name: 'Please select Sales' }).click();
    await sleep(500);
    await page.getByRole('definition').filter({ hasText: 'Alex Chow' }).click();
    console.log('  ✓ 已选择 Sales: Alex Chow');

    // 输入图形验证码
    console.log('  输入图形验证码...');
    await page.getByRole('spinbutton').fill('240501');
    console.log('  ✓ 已输入图形验证码: 240501');

    // 点击 Next
    console.log('  点击 Next...');
    await page.getByRole('button', { name: 'Next' }).click();

    // 等待第二步验证码
    console.log('  等待 Slack 验证码...');
    await page.waitForSelector('text=Enter the verification code', { timeout: 10000 });
    await sleep(500);

    // 输入 Slack 验证码
    const slackCode = 'PP8STD';  // 默认值，可以修改
    console.log(`  输入 Slack 验证码: ${slackCode}`);
    const codeInput = page.locator('text=Code').locator('..').locator('input');
    await codeInput.fill(slackCode);

    // 点击登录
    console.log('  点击登录...');
    await page.locator('button.login, button[lay-filter="login"]').click();

    // 等待跳转到订单页面
    console.log('  等待登录完成...');
    await page.waitForURL('**/quote_Line_Pipe.html', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    console.log('  ✓ 登录成功！');

    // 2. 填写表头信息
    console.log('\n📋 填写订单头部信息...');

    // 等待表格数据加载
    await page.waitForSelector('#tableList ul.tr_ul', { timeout: 60000 });
    console.log('  ✓ 表格数据已加载');

    // 设置 Incoterm
    console.log('  设置 Incoterm...');
    await selectLayuiOption(page, 'incoterm', 'FOB');
    console.log('  ✓ 已设置 Incoterm: FOB');

    // 设置 Port
    console.log('  设置 Port...');
    await selectLayuiOption(page, 'port', 'SHANGHAI');
    console.log('  ✓ 已设置 Port: SHANGHAI');

    // 设置 Currency
    console.log('  设置 Currency...');
    await page.locator('.layui-form-radio').filter({ hasText: 'USD' }).first().click();
    console.log('  ✓ 已设置 Currency: USD');

    // 取消勾选 Same spec across all items
    console.log('  取消勾选 "Same spec across all items"...');
    await uncheckSameSpec(page);

    // 3. 检查 AML 选项
    console.log('\n🎯 检查 AML 选项...');

    // 等待 AML 选项加载
    await sleep(1000);

    // 检查 AML 选项的 HTML 结构
    console.log('  检查页面源码中的 AML 选项...');
    const amlHTML = await page.evaluate(() => {
      const div = document.createElement('div');
      div.innerHTML = document.body.innerHTML;

      // 查找所有包含 aml 的元素
      const amlElements = [];
      const allElements = document.querySelectorAll('*');

      for (const el of allElements) {
        const text = el.textContent || '';
        const id = el.id || '';
        const name = el.getAttribute('name') || '';
        const type = el.getAttribute('type') || '';

        if (text.toLowerCase().includes('aml') ||
            id.toLowerCase().includes('aml') ||
            name.toLowerCase().includes('aml')) {
          amlElements.push({
            tag: el.tagName,
            id: id,
            name: name,
            type: type,
            text: text.trim(),
            outerHTML: el.outerHTML.substring(0, 200)
          });
        }
      }

      return amlElements;
    });

    console.log('\n🔍 找到的 AML 相关元素:');
    amlHTML.forEach((el, index) => {
      console.log(`  [${index + 1}] ${el.tag} - ID: ${el.id}, Name: ${el.name}, Type: ${el.type}`);
      console.log(`     文本: "${el.text}"`);
      console.log(`     HTML: ${el.outerHTML}\n`);
    });

    // 检查 radio 按钮
    console.log('\n📡 检查所有 radio 按钮...');
    const radios = await page.evaluate(() => {
      const allRadios = document.querySelectorAll('input[type="radio"]');
      return Array.from(allRadios).map(radio => ({
        id: radio.id,
        name: radio.name,
        value: radio.value,
        checked: radio.checked,
        label: radio.closest('label')?.textContent || ''
      }));
    });

    console.log('\n📡 所有 radio 按钮:');
    radios.forEach((radio, index) => {
      console.log(`  [${index + 1}] ID: ${radio.id}, Name: ${radio.name}, Value: ${radio.value}, Checked: ${radio.checked}`);
      console.log(`     标签: "${radio.label}"\n`);
    });

    // 尝试选择 Non-AML
    console.log('\n🎯 尝试选择 Non-AML...');

    // 方法1: 通过 name="aml_type"
    const amlByName = page.locator('input[name="aml_type"]');
    if (await amlByName.count() > 0) {
      console.log('  方法1: 通过 name="aml_type" 选择');
      for (let i = 0; i < await amlByName.count(); i++) {
        const input = amlByName.nth(i);
        const label = await page.locator(`label[for="${await input.getAttribute('id')}"]`).textContent() ||
                     await input.evaluate(el => el.closest('label')?.textContent || '');
        console.log(`    选项 ${i + 1}: ${label}`);

        if (label && (label.toLowerCase().includes('non-aml') || label.toLowerCase().includes('nonaml'))) {
          await input.click();
          console.log(`  ✓ 已选择: ${label}`);
          break;
        }
      }
    }

    // 方法2: 通过文本查找
    if (!await page.locator('input[name="aml_type"]:checked').count()) {
      console.log('  方法2: 通过文本查找');
      const nonAmlByText = page.getByRole('radio', { name: /Non-AML/i }).first();
      if (await nonAmlByText.count() > 0) {
        await nonAmlByText.click();
        console.log('  ✓ 已通过文本选择 Non-AML');
      } else {
        console.log('  ⚠ 未找到 Non-AML 选项');
      }
    }

    // 检查是否已选中
    const checked = await page.locator('input[name="aml_type"]:checked').first();
    if (await checked.count() > 0) {
      const label = await checked.evaluate(el => {
        const labelEl = el.closest('label');
        return labelEl ? labelEl.textContent : el.getAttribute('id');
      });
      console.log(`\n✅ 当前选中的 AML 选项: ${label}`);
    } else {
      console.log('\n⚠ 未选中任何 AML 选项');
    }

    // 4. 截图保存
    console.log('\n📸 保存截图...');
    await page.screenshot({
      path: 'screenshots/debug-aml.png',
      fullPage: true
    });
    console.log('  ✓ 截图已保存: screenshots/debug-aml.png');

    // 5. 等待用户查看
    console.log('\n⏳ 调试完成！请查看截图和控制台输出。');
    console.log('   浏览器将在 30 秒后自动关闭...');
    await sleep(30000);  // 等待30秒后自动关闭

  } catch (err) {
    console.error('\n❌ 出错:', err);
    // 截图保存错误
    await page.screenshot({
      path: 'screenshots/debug-error.png',
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
  // 点击 layui 渲染的自定义下拉触发器
  await page.locator(`select#${selectId}`).locator('..').locator('.layui-select-title').click();
  await sleep(300);
  // 在展开的下拉中点击匹配的 dd
  const dd = page.locator(`select#${selectId}`).locator('..').locator('.layui-select-options dd').filter({ hasText: optionText }).first();
  await dd.waitFor({ timeout: 5000 });
  await dd.click();
}

async function uncheckSameSpec(page) {
  try {
    const isChecked = await page.evaluate(() => {
      // 通过文本找到对应行，再找 checkbox input
      const allEls = Array.from(document.querySelectorAll('*'));
      for (const el of allEls) {
        if (el.childNodes.length === 1 && el.textContent?.trim() === 'Same spec across all items') {
          const row = el.closest('.layui-form-item') || el.parentElement;
          const cb = row?.querySelector('input[type="checkbox"]');
          if (cb) return cb.checked;
        }
      }
      // 备用：直接找所有 checkbox input 附近含该文本的
      const inputs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      for (const inp of inputs) {
        const label = inp.closest('label') || inp.parentElement;
        if (label?.textContent?.includes('Same spec')) return inp.checked;
      }
      return null;
    });

    if (isChecked === true) {
      // 点击 layui checkbox 的自定义外观
      const checkbox = page.locator('.layui-form-checkbox').filter({ hasText: 'Same spec across all items' }).first();
      if (await checkbox.count() > 0) {
        await checkbox.click();
      } else {
        // 备用：直接点击文字
        await page.locator('text=Same spec across all items').first().click();
      }
      await sleep(300);
      console.log('  ✓ 已取消勾选 "Same spec across all items"');
    } else if (isChecked === false) {
      console.log('  ✓ "Same spec across all items" 已是未勾选状态');
    } else {
      console.warn('  ⚠ 未找到 "Same spec across all items" 复选框');
    }
  } catch (e) {
    console.warn(`  ⚠ 取消勾选 Same spec 失败: ${e}`);
  }
}