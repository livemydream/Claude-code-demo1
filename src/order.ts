import { chromium, Browser, Page } from 'playwright';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as readline from 'readline';

// ==================== 配置 ====================
const CONFIG = {
  url: 'https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html',
  captchaCode: '240501',   // 第一个验证码（图形验证码）
  slackCode: 'PP8STD',     // 第二个验证码（Slack 验证码）
  salesName: 'Alex Chow',  // Sales 姓名（可修改）
  excelFile: './demo.xlsx',
  headless: false,         // false = 显示浏览器窗口
  defaultMinLength: '18',  // Min Length 默认值（英尺）
  defaultMaxLength: '22',  // Max Length 默认值（英尺）
  // 第三页 Terms 默认值
  defaultDeposit: 20,      // Deposit 默认值（%）
  defaultNet: 30,          // Net 默认值（天）
  defaultInstallment: 1,   // Installment 默认值
};

// ==================== Excel 数据类型 ====================
interface OrderRow {
  incoterm?: string;
  currency?: string;
  destination?: string;
  spec?: string;
  loginSales?: string; // 登录人员姓名，从 Excel 的 LoginSales 列读取
  nps?: string;       // 解析自 Size，如 "1/8"
  schedule?: string;  // 解析自 Size，如 "STD"
  qty?: number;
  unit?: string;
  // 第三页新增字段
  sellFrom?: string;    // Sell From
  company?: string;     // Company 名称
  isEndUser?: boolean;  // 是否是 End User（1 = 是）
  yardAddress?: string; // Yard Address（End User 时使用）
}

// ==================== 读取 Excel ====================
function readExcel(filePath: string): OrderRow[] {
  const absPath = path.resolve(filePath);
  const wb = XLSX.readFile(absPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  let lastIncoterm = '';
  let lastCurrency = '';
  let lastDestination = '';
  let lastSpec = '';
  let lastLoginSales = '';
  let lastSellFrom = '';
  let lastCompany = '';
  let lastIsEndUser = false;
  let lastYardAddress = '';

  const orders: OrderRow[] = [];

  for (const row of rawRows) {
    // 继承上一行的值（Excel 中合并单元格或空行复用）
    if (row['Incoterm']) lastIncoterm = String(row['Incoterm']).trim();
    if (row['Currency']) lastCurrency = String(row['Currency']).trim();
    if (row['Destination']) lastDestination = String(row['Destination']).trim();
    if (row['Spec']) lastSpec = String(row['Spec']).trim();
    if (row['LoginSales']) lastLoginSales = String(row['LoginSales']).trim();
    if (row['Sell From']) lastSellFrom = String(row['Sell From']).trim();
    if (row['Company']) lastCompany = String(row['Company']).trim();
    if (row['Is End User'] !== undefined && row['Is End User'] !== '') {
      lastIsEndUser = String(row['Is End User']).trim() === '1';
    }
    if (row['Yard Address']) lastYardAddress = String(row['Yard Address']).trim();

    const sizeRaw = String(row['Size'] || '').trim();
    const qty = row['Qty'];
    const unit = String(row['Unit'] || 'ft').trim();

    // 跳过没有尺寸或数量的行
    if (!sizeRaw || !qty) continue;

    // 解析 "NPS 1/8 STD" -> { nps: "1/8", schedule: "STD" }
    const parsed = parseSize(sizeRaw);
    if (!parsed) {
      console.warn(`⚠ 无法解析尺寸: "${sizeRaw}"，跳过`);
      continue;
    }

    orders.push({
      incoterm: lastIncoterm,
      currency: lastCurrency,
      destination: lastDestination,
      spec: lastSpec,
      loginSales: lastLoginSales,
      nps: parsed.nps,
      schedule: parsed.schedule,
      qty: Number(qty),
      unit,
      sellFrom: lastSellFrom,
      company: lastCompany,
      isEndUser: lastIsEndUser,
      yardAddress: lastYardAddress,
    });
  }

  return orders;
}

// 解析 "NPS 1/8 STD" 或 "NPS 2 1/2 XS" 格式
function parseSize(sizeStr: string): { nps: string; schedule: string } | null {
  const str = sizeStr.trim();
  // 匹配 "NPS {nps} {schedule}"，NPS 可能是分数（1/8）或带空格的分数（2 1/2）
  const match = str.match(/^NPS\s+(.+?)\s+(S5s|S5|S7|S10s|S10|S20|S30|STD|S40|XS|S60|S80|S100|S120|S140|XXS|S160|X)\s*$/i);
  if (!match) return null;
  return {
    nps: match[1].trim(),
    schedule: match[2].toUpperCase(),
  };
}

// ==================== 登录 ====================
async function login(page: Page, salesName: string, captcha: string, slackCode: string) {
  console.log('🔐 开始登录...');
  await page.waitForLoadState('networkidle');

  // 选择 Sales
  await page.getByRole('textbox', { name: 'Please select Sales' }).click();
  await page.getByRole('definition').filter({ hasText: salesName }).click();
  console.log(`  ✓ 已选择 Sales: ${salesName}`);

  // 输入图形验证码
  await page.getByRole('spinbutton').fill(captcha);
  console.log(`  ✓ 已输入图形验证码: ${captcha}`);

  // 点击 Next
  await page.getByRole('button', { name: 'Next' }).click();

  // 等待第二步的"Code"标签和输入框出现
  await page.waitForSelector('text=Enter the verification code', { timeout: 10000 });
  await sleep(500);

  // 如果提供了固定 slackCode 就直接用，否则从控制台读取
  let code = slackCode;
  if (!code) {
    code = await askInput('\n  >> 请查看 Slack 收到的验证码并输入（回车确认）：');
  }

  // 精确定位"Code"标签后面的输入框
  const codeInput = page.locator('text=Code').locator('..').locator('input');
  await codeInput.fill(code);
  console.log(`  ✓ 已输入 Slack 验证码: ${code}`);

  // 点击 Login（exact 避免匹配到 "Email login"）
  await page.locator('button.login, button[lay-filter="login"]').click();

  // 等待跳转到订单页面，验证码错误会停留在登录页
  try {
    await page.waitForURL('**/quote_Line_Pipe.html', { timeout: 15000 });
  } catch {
    // 检查是否有错误提示
    const errMsg = await page.locator('.layui-layer-content, .err-msg, [class*="error"]').first().textContent().catch(() => '');
    throw new Error(`登录失败，请检查验证码是否正确。页面提示：${errMsg || '未知错误'}`);
  }
  // 不用 networkidle（页面有长轮询请求），等 DOM 稳定即可
  await page.waitForLoadState('domcontentloaded');
  console.log('  ✓ 登录成功！');
}

// ==================== 设置表头（Incoterm/Port/Currency）====================
async function fillHeader(page: Page, order: OrderRow) {
  console.log('\n📋 填写订单头部信息...');
  // 等待表格行数据出现（说明 API 数据已加载完成）
  await page.waitForSelector('#tableList ul.tr_ul', { timeout: 60000 });
  console.log('  ✓ 表格数据已加载');

  if (order.incoterm) await setIncoterm(page, order.incoterm);
  if (order.destination) await setPort(page, order.destination);
  if (order.currency) await setCurrency(page, order.currency);
  await sleep(500);
}

// 通用 layui select 选择：点击标题栏 → 等下拉出现 → 点击 dd 选项
async function selectLayuiOption(page: Page, selectId: string, optionText: string) {
  // 点击 layui 渲染的自定义下拉触发器（标题输入框旁边的容器）
  await page.locator(`select#${selectId}`).locator('..').locator('.layui-select-title').click();
  await sleep(300);
  // 在展开的下拉中点击匹配的 dd
  const dd = page.locator(`select#${selectId}`).locator('..').locator('.layui-select-options dd').filter({ hasText: optionText }).first();
  await dd.waitFor({ timeout: 5000 });
  await dd.click();
}

async function setIncoterm(page: Page, incoterm: string) {
  try {
    // 读取原生 select 当前值
    const current = await page.evaluate(() => {
      const sel = document.getElementById('incoterm') as HTMLSelectElement;
      return sel ? sel.options[sel.selectedIndex]?.text?.trim() : '';
    });
    if (current === incoterm) {
      console.log(`  ✓ Incoterm 已是 ${incoterm}，跳过`);
      return;
    }
    await selectLayuiOption(page, 'incoterm', incoterm);
    console.log(`  ✓ 设置 Incoterm: ${incoterm}`);
  } catch (e) {
    console.warn(`  ⚠ 设置 Incoterm 失败: ${e}`);
  }
}

async function setPort(page: Page, destination: string) {
  try {
    // 读取原生 select 当前值
    const current = await page.evaluate(() => {
      const sel = document.getElementById('port') as HTMLSelectElement;
      return sel ? sel.options[sel.selectedIndex]?.text?.trim() : '';
    });
    if (current.toLowerCase().includes(destination.toLowerCase())) {
      console.log(`  ✓ Port 已包含 "${destination}"，跳过`);
      return;
    }
    await selectLayuiOption(page, 'port', destination);
    console.log(`  ✓ 设置 Port: ${destination}`);
  } catch (e) {
    console.warn(`  ⚠ 设置 Port 失败: ${e}`);
  }
}

async function setCurrency(page: Page, currency: string) {
  try {
    const currencyUpper = currency.toUpperCase();
    // 读取当前选中状态
    const isAlready = await page.evaluate((curr) => {
      const radios = Array.from(document.querySelectorAll('input[name*="currency"]')) as HTMLInputElement[];
      const radio = radios.find(r => r.value === curr);
      return radio ? radio.checked : false;
    }, currencyUpper);
    if (isAlready) {
      console.log(`  ✓ Currency 已是 ${currencyUpper}，跳过`);
      return;
    }
    // 点击 layui 渲染的 radio
    await page.locator('.layui-form-radio').filter({ hasText: currencyUpper }).first().click();
    console.log(`  ✓ 设置 Currency: ${currencyUpper}`);
  } catch (e) {
    console.warn(`  ⚠ 设置 Currency 失败: ${e}`);
  }
}

// ==================== 取消勾选 "Same spec across all items" ====================
async function uncheckSameSpec(page: Page) {
  try {
    // 检查是否存在该 checkbox（layui 渲染后为隐藏的原生 input + 自定义样式）
    const isChecked = await page.evaluate(() => {
      // 通过文本找到对应行，再找 checkbox input
      const allEls = Array.from(document.querySelectorAll('*'));
      for (const el of allEls) {
        if (el.childNodes.length === 1 && el.textContent?.trim() === 'Same spec across all items') {
          const row = el.closest('.layui-form-item') || el.parentElement;
          const cb = row?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
          if (cb) return cb.checked;
        }
      }
      // 备用：直接找所有 checkbox input 附近含该文本的
      const inputs = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      for (const inp of inputs) {
        const label = inp.closest('label') || inp.parentElement;
        if (label?.textContent?.includes('Same spec')) return inp.checked;
      }
      return null;
    });

    if (isChecked === true) {
      // 点击 layui checkbox 的自定义外观（layui-form-checkbox span）
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
      console.warn('  ⚠ 未找到 "Same spec across all items" 复选框，跳过');
    }
  } catch (e) {
    console.warn(`  ⚠ 取消勾选 Same spec 失败: ${e}`);
  }
}

// ==================== 选择 Non-AML ====================
async function selectNonAML(page: Page) {
  try {
    // 等待 AML 选择器区域出现
    await sleep(500);

    // 方法1: 查找 XM-SELECT 类型的 AML 选择器（通过文本 "Please Select AML" 定位）
    const amlSelectWrapper = page.locator('div').filter({ hasText: /^AML:$/ })
      .locator('..').locator('.el-select__wrapper, .xm-select-parent, [class*="select"]').first();

    // 方法2: 直接查找包含 "Please Select AML" 文本的可点击区域
    const amlPlaceholder = page.getByText('Please Select AML', { exact: true }).first();

    // 检查哪种方法能找到元素
    let selectElement: ReturnType<Page['locator']> | null = null;
    if (await amlSelectWrapper.count() > 0) {
      selectElement = amlSelectWrapper;
      console.log('  📍 通过 AML 标签找到选择器');
    } else if (await amlPlaceholder.count() > 0) {
      selectElement = amlPlaceholder;
      console.log('  📍 通过占位符文本找到选择器');
    } else {
      // 方法3: 查找 input[name="AML"] 的父容器
      const amlInput = page.locator('input[name="AML"]').first();
      if (await amlInput.count() > 0) {
        selectElement = amlInput.locator('..');
        console.log('  📍 通过 input name 找到选择器');
      }
    }

    if (!selectElement || await selectElement.count() === 0) {
      console.log('  ℹ 未找到 AML 选择器，可能已默认选择或不存在');
      return;
    }

    // 点击打开下拉框
    await selectElement.click();
    console.log('  ✓ 已点击 AML 选择器');
    await sleep(800); // 等待下拉菜单展开

    // 查找 Non-AML 选项
    // XM-SELECT 的选项通常在 .xm-option 或 li 元素中
    // Element Plus 的选项在 .el-option 或 .el-select-dropdown__item 中
    const nonAmlSelectors = [
      page.locator('.xm-option:has-text("Non-AML")'),
      page.locator('.xm-select-dropdown li:has-text("Non-AML")'),
      page.locator('.el-select-dropdown__item:has-text("Non-AML")'),
      page.locator('[class*="option"]:has-text("Non-AML")'),
      page.getByRole('option', { name: /Non-AML/i }),
      page.locator('li').filter({ hasText: 'Non-AML' }),
    ];

    let clicked = false;
    for (const selector of nonAmlSelectors) {
      try {
        if (await selector.count() > 0) {
          const first = selector.first();
          // 确保元素可见
          if (await first.isVisible()) {
            await first.click({ timeout: 3000 });
            console.log('  ✅ 已选择 Non-AML');
            clicked = true;
            break;
          }
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    if (!clicked) {
      // 备用方案：直接在页面中查找所有可见的 Non-AML 文本
      const allNonAml = page.locator('div, li, span, p').filter({ hasText: 'Non-AML' });
      const count = await allNonAml.count();

      for (let i = 0; i < count; i++) {
        const el = allNonAml.nth(i);
        try {
          if (await el.isVisible()) {
            await el.click({ timeout: 2000 });
            console.log('  ✅ 已选择 Non-AML (备用方案)');
            clicked = true;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (!clicked) {
      console.log('  ⚠ 未找到 Non-AML 选项，可能需要手动选择');
      console.log('     💡 提示：AML 下拉框已打开，请检查选项');
    }

    // 点击其他地方关闭下拉框（如果还开着）
    await sleep(300);
    await page.keyboard.press('Escape').catch(() => {});

  } catch (err) {
    console.warn(`  ⚠ 选择 Non-AML 失败: ${err}`);
    console.log('     💡 提示：如果网站需要手动选择 AML/Non-AML，请检查实际的 HTML 结构');
  }
}

// ==================== 选择规格（点击表格单元格）====================
async function clickSizeCell(page: Page, nps: string, schedule: string): Promise<boolean> {
  const schClass = `s_${schedule}`;

  const clicked = await page.evaluate(({ nps, schClass }) => {
    const tbody = document.getElementById('tableList');
    if (!tbody) return false;

    const rows = Array.from(tbody.children) as HTMLElement[];
    const row = rows.find(ul => {
      const npsLi = ul.querySelector('li[data-index="0"]');
      return npsLi && npsLi.textContent?.trim() === nps;
    });

    if (!row) return false;

    const cell = row.querySelector(`li[data-sch="${schClass}"]`) as HTMLElement;
    if (!cell) return false;

    cell.click();
    return true;
  }, { nps, schClass });

  return clicked;
}

// ==================== 等待 iframe 弹窗并填写数量 ====================
async function fillItemModal(page: Page, order: OrderRow): Promise<boolean> {
  const qty = order.qty!;
  const unit = order.unit!;
  const spec = order.spec;

  // 等待 layui iframe 出现，取 ID 最大（最新打开）的那个
  try {
    await page.waitForSelector('iframe[id^="layui-layer-iframe"]', { timeout: 8000 });
  } catch {
    console.warn('  ⚠ 未找到弹窗 iframe');
    return false;
  }

  // 取所有匹配 iframe 中编号最大的（最新弹出的弹窗）
  const iframeId = await page.evaluate(() => {
    const iframes = Array.from(document.querySelectorAll('iframe[id^="layui-layer-iframe"]'));
    if (iframes.length === 0) return '';
    return iframes.reduce((latest, el) => {
      const n = parseInt(el.id.replace('layui-layer-iframe', '')) || 0;
      const l = parseInt(latest.replace('layui-layer-iframe', '')) || 0;
      return n > l ? el.id : latest;
    }, '');
  });

  if (!iframeId) {
    console.warn('  ⚠ 未能获取 iframe ID');
    return false;
  }

  // frameLocator 用于元素操作
  const frame = page.frameLocator(`#${iframeId}`);

  // 等待弹窗内容加载（等 Quantity 输入框出现）
  // Qty 输入框位于 .footer .footer_li 内，是第 3 个 .el-input__inner（前两个是 Min/Max Length）
  const qtyInput = frame.locator('.footer .footer_li .el-input__inner').first();
  try {
    await qtyInput.waitFor({ timeout: 10000 });
  } catch {
    console.warn('  ⚠ 等待 Qty 输入框超时');
    return false;
  }

  // === 填写 Min Length（若已有默认值则跳过）===
  try {
    const minInput = frame.locator('.el-input__inner').nth(0); // 第1个：Min Length
    const minVal = await minInput.inputValue().catch(() => '');
    if (!minVal) {
      await minInput.fill(CONFIG.defaultMinLength);
      console.log(`  ✓ 已填写 Min Length: ${CONFIG.defaultMinLength}`);
    } else {
      console.log(`  ✓ Min Length 已有默认值: ${minVal}`);
    }
  } catch (e) {
    console.warn(`  ⚠ 设置 Min Length 失败: ${e}`);
  }

  // === 填写 Max Length（若已有默认值则跳过）===
  try {
    const maxInput = frame.locator('.el-input__inner').nth(1); // 第2个：Max Length
    const maxVal = await maxInput.inputValue().catch(() => '');
    if (!maxVal) {
      await maxInput.fill(CONFIG.defaultMaxLength);
      console.log(`  ✓ 已填写 Max Length: ${CONFIG.defaultMaxLength}`);
    } else {
      console.log(`  ✓ Max Length 已有默认值: ${maxVal}`);
    }
  } catch (e) {
    console.warn(`  ⚠ 设置 Max Length 失败: ${e}`);
  }

  // === 选择 Spec（必填，从 Excel 读取）===
  if (spec) {
    try {
      // 通过 "Spec:" 文字找到对应下拉容器（.el-select__wrapper）
      const specWrapper = frame.locator('p').filter({ hasText: /^Spec:$/ })
        .locator('..').locator('.el-select__wrapper');
      await specWrapper.waitFor({ timeout: 5000 });

      // 每次都先尝试点击关闭按钮清空旧值（无论是否存在）
      const closeBtn = specWrapper.locator('.el-tag__close');
      try {
        await closeBtn.click({ timeout: 2000 });
        await sleep(300);
        console.log(`  ✓ 已清空旧 Spec`);
      } catch {
        // 没有旧值，忽略
      }

      // 点击打开下拉框
      await specWrapper.click();
      const searchBox = frame.locator('input[placeholder="Please Search"]');
      await searchBox.waitFor({ timeout: 5000 });

      await searchBox.fill(spec.substring(0, 10));
      await sleep(300);

      const specOption = frame.getByRole('option', { name: spec, exact: true });
      try {
        await specOption.waitFor({ timeout: 5000 });
        await specOption.click();
        console.log(`  ✓ 已选择 Spec: ${spec}`);
      } catch {
        const partialOpt = frame.getByRole('option').filter({ hasText: spec }).first();
        try {
          await partialOpt.waitFor({ timeout: 3000 });
          await partialOpt.click();
          console.log(`  ✓ 已选择 Spec (partial): ${spec}`);
        } catch {
          console.warn(`  ⚠ 未找到 Spec 选项: "${spec}"，按 Escape 关闭`);
          await frame.locator('body').press('Escape');
        }
      }
      await sleep(300);
    } catch (e) {
      console.warn(`  ⚠ 设置 Spec 失败: ${e}`);
    }
  } else {
    console.warn('  ⚠ 订单未提供 Spec，跳过（Add to Quote 可能失败）');
  }

  // === 填写 Quantity ===
  await qtyInput.click();
  await qtyInput.fill(String(qty));
  console.log(`  ✓ 已填写数量: ${qty} ${unit}`);
  await sleep(400);

  // 点击 "Add to Quote" 按钮
  const addBtn = frame.getByRole('button', { name: 'Add to Quote' });
  try {
    await addBtn.click({ timeout: 5000 });
  } catch {
    console.warn('  ⚠ 未找到 Add to Quote 按钮');
    return false;
  }
  console.log('  ✓ 已点击 Add to Quote');

  // 等待弹窗关闭（iframe 变为不可见）
  await page.waitForSelector(`#${iframeId}`, { state: 'hidden', timeout: 8000 }).catch(() => {});
  await sleep(500);

  return true;
}

// 生成随机手机号（加拿大格式）
function generateRandomPhone(): string {
  const areaCodes = ['604', '778', '236', '250', '403', '587', '416', '647'];
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${prefix}-${line}`;
}

// 生成随机加拿大地址
function generateRandomCanadianAddress(): string {
  const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St', 'First Ave', 'Second St'];
  const cities = ['Toronto', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Montreal'];
  const provinces = ['ON', 'BC', 'AB', 'QC'];
  const streetNum = Math.floor(Math.random() * 9000) + 1000;
  const street = streets[Math.floor(Math.random() * streets.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const postalCode = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                     Math.floor(Math.random() * 10) +
                     String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                     ' ' +
                     Math.floor(Math.random() * 10) +
                     String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                     Math.floor(Math.random() * 10);
  return `${streetNum} ${street}, ${city}, ${province} ${postalCode}, Canada`;
}

// ==================== 第三页：通用 Element Plus 下拉选择 ====================
async function selectElOption(page: Page, selectLocator: any, optionText?: string, skipTexts: string[] = ['Please Select']) {
  // 点击选择框打开下拉菜单
  await selectLocator.click();
  await sleep(300);

  // 等待下拉菜单出现（Element Plus 的下拉菜单会被 teleport 到 body 下）
  const dropdown = page.locator('.el-select-dropdown, .el-popper').filter({ has: page.locator('.el-select-dropdown__item, .el-select-v2__option') }).last();
  await dropdown.waitFor({ timeout: 5000 }).catch(() => {});

  // 等待选项出现
  await sleep(500);

  // 查找选项
  let option;
  if (optionText) {
    // 查找包含指定文本的选项
    option = page.locator('.el-select-dropdown__item, .el-select-v2__option').filter({ hasText: optionText }).first();
  } else {
    // 选择第一个非跳过文本的选项
    option = page.locator('.el-select-dropdown__item, .el-select-v2__option').first();

    // 如果第一个选项是需要跳过的文本，尝试找下一个
    const firstOptionText = await option.textContent().catch(() => '');
    if (skipTexts.some(t => firstOptionText.includes(t))) {
      option = page.locator('.el-select-dropdown__item, .el-select-v2__option').filter({ hasNotText: new RegExp(skipTexts.join('|')) }).first();
    }
  }

  // 确保选项可见并点击
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.scrollIntoViewIfNeeded();
  await option.click({ force: true });
}

// ==================== 第三页：填写提交表单 ====================
async function fillSubmitPage(page: Page, order: OrderRow) {
  console.log('\n📝 第三页：填写提交表单...');
  await page.waitForLoadState('domcontentloaded');
  await sleep(2000);

  // 等待表单加载
  await page.waitForSelector('.box_submit_form', { timeout: 10000 }).catch(() => {});

  // 1. 选择 Company（从 Excel 读取）
  if (order.company) {
    try {
      console.log('  📍 选择 Company...');
      // 通过 *Company 标签找到对应的选择框
      const companyFormItem = page.locator('.el-form-item').filter({ hasText: '*Company' }).first();
      const companySelect = companyFormItem.locator('.el-select-v2, .el-select').first();

      // 点击打开下拉框
      await companySelect.click();
      await sleep(500);

      // 等待下拉菜单出现
      const dropdown = page.locator('.el-select-dropdown, .el-popper').filter({ has: page.locator('.el-select-dropdown__item, .el-select-v2__option') }).last();
      await dropdown.waitFor({ timeout: 5000 }).catch(() => {});

      // 输入搜索
      const searchInput = companyFormItem.locator('input').first();
      await searchInput.fill(order.company);
      await sleep(800);

      // 选择匹配项
      const option = page.locator('.el-select-dropdown__item, .el-select-v2__option').filter({ hasText: order.company }).first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      await option.click({ force: true });
      console.log(`  ✓ 已选择 Company: ${order.company}`);
      await sleep(1000);

      // 检测是否有 "Confirm changes" 弹窗
      const confirmBtn = page.getByRole('button', { name: /Confirm changes/i });
      if (await confirmBtn.count() > 0 && await confirmBtn.first().isVisible().catch(() => false)) {
        console.log('  📍 检测到 "Confirm changes" 弹窗，点击确认...');
        await confirmBtn.first().click();
        await sleep(1000);
        console.log('  ✓ 已确认 Company 变更');
      }
    } catch (e) {
      console.warn(`  ⚠ 选择 Company 失败: ${e}`);
      await page.screenshot({ path: 'screenshots/company-error.png' }).catch(() => {});
    }
  }

  // 2. 选择 Buyer（选择第二个选项，第一个是占位符）
  try {
    console.log('  📍 选择 Buyer...');
    // 通过 *Buyer 标签找到对应的选择框
    const buyerFormItem = page.locator('.el-form-item').filter({ hasText: '*Buyer' }).first();
    const buyerSelect = buyerFormItem.locator('.el-select-v2, .el-select').first();

    // 点击打开下拉框
    await buyerSelect.click();
    await sleep(800);

    // 等待当前下拉菜单出现（查找最近出现的下拉菜单）
    // el-select-v2 的下拉选项在 .el-select-dropdown 中
    const dropdown = page.locator('.el-select-dropdown.is-visible, .el-popper[aria-hidden="false"]').last();
    await dropdown.waitFor({ timeout: 5000 }).catch(() => {});
    await sleep(500);

    // 在当前打开的下拉菜单中选择第二个选项
    const buyerOptions = dropdown.locator('.el-select-dropdown__item, .el-select-v2__option');
    const optionCount = await buyerOptions.count();
    console.log(`  当前下拉菜单中找到 ${optionCount} 个 Buyer 选项`);

    if (optionCount >= 2) {
      // 选择第二个选项（索引1）
      const secondOption = buyerOptions.nth(1);
      await secondOption.click({ force: true });
      console.log('  ✓ 已选择第二个 Buyer 选项');
    } else if (optionCount === 1) {
      await buyerOptions.first().click({ force: true });
      console.log('  ✓ 已选择唯一的 Buyer 选项');
    } else {
      console.warn('  ⚠ 未找到 Buyer 选项');
    }
    await sleep(800);
  } catch (e) {
    console.warn(`  ⚠ 选择 Buyer 失败: ${e}`);
  }

  // 3. Email（有值不填充，没值填充默认值）
  try {
    const emailInput = page.locator('input[placeholder*="Email"]').first();
    const emailValue = await emailInput.inputValue().catch(() => '');

    if (!emailValue || emailValue.trim() === '') {
      await emailInput.fill('2550454914@qq.com');
      console.log('  ✓ 已填写 Email: 2550454914@qq.com');
    } else {
      console.log(`  ✓ Email 已有值: ${emailValue}，跳过`);
    }
    await sleep(300);
  } catch (e) {
    console.warn(`  ⚠ 填写 Email 失败: ${e}`);
  }

  // 4. Phone（有值不填充，没值随机生成）
  try {
    const phoneInput = page.locator('input[placeholder*="Phone"]').first();
    const phoneValue = await phoneInput.inputValue().catch(() => '');

    if (!phoneValue || phoneValue.trim() === '') {
      const randomPhone = generateRandomPhone();
      await phoneInput.fill(randomPhone);
      console.log(`  ✓ 已填写 Phone: ${randomPhone}`);
    } else {
      console.log(`  ✓ Phone 已有值: ${phoneValue}，跳过`);
    }
    await sleep(300);
  } catch (e) {
    console.warn(`  ⚠ 填写 Phone 失败: ${e}`);
  }

  // 5. Business Address（有值或禁用则跳过）
  try {
    // 通过 form item 的 label 属性或 placeholder 定位
    const addressFormItem = page.locator('.el-form-item').filter({ hasText: 'Business Address' }).first();
    const addressSelect = addressFormItem.locator('.el-select').first();
    const addressInput = addressSelect.locator('input').first();

    // 检查是否禁用
    const isDisabled = await addressInput.isDisabled().catch(() => false);
    if (isDisabled) {
      console.log('  ✓ Business Address 输入框已禁用（可能已自动填充），跳过');
    } else {
      const addressValue = await addressInput.inputValue().catch(() => '');
      if (!addressValue || addressValue.trim() === '') {
        const randomAddress = generateRandomCanadianAddress();
        await addressSelect.click();
        await sleep(500);

        // 等待下拉菜单
        const dropdown = page.locator('.el-select-dropdown.is-visible, .el-popper[aria-hidden="false"]').last();
        await dropdown.waitFor({ timeout: 5000 }).catch(() => {});

        await addressInput.fill(randomAddress);
        console.log(`  ✓ 已填写 Business Address: ${randomAddress}`);
        await sleep(1500);

        // 选择第一个搜索结果（如果有）
        const firstOption = dropdown.locator('.el-select-dropdown__item').first();
        if (await firstOption.isVisible().catch(() => false)) {
          await firstOption.click({ force: true, timeout: 3000 });
          console.log('  ✓ 已选择地址搜索结果');
        }
      } else {
        console.log(`  ✓ Business Address 已有值，跳过`);
      }
    }
    await sleep(300);
  } catch (e) {
    console.warn(`  ⚠ 填写 Business Address 失败: ${e}`);
  }

  // 6. Sell From（选择第二个选项，第一个是占位符）
  try {
    console.log('  📍 选择 Sell From...');
    const sellFromLabel = page.locator('label, .el-form-item__label').filter({ hasText: '*Sell From' }).first();
    const sellFromSelect = sellFromLabel.locator('..').locator('.el-select').first();

    await sellFromSelect.click();
    await sleep(800);

    // 等待当前下拉菜单
    const dropdown = page.locator('.el-select-dropdown.is-visible, .el-popper[aria-hidden="false"]').last();
    await dropdown.waitFor({ timeout: 5000 }).catch(() => {});
    await sleep(500);

    const options = dropdown.locator('.el-select-dropdown__item');
    const optionCount = await options.count();
    console.log(`  当前下拉菜单中找到 ${optionCount} 个 Sell From 选项`);

    if (optionCount >= 2) {
      await options.nth(1).click({ force: true });
      console.log('  ✓ 已选择第二个 Sell From 选项');
    } else if (optionCount === 1) {
      await options.first().click({ force: true });
      console.log('  ✓ 已选择唯一的 Sell From 选项');
    }
    await sleep(500);
  } catch (e) {
    console.warn(`  ⚠ 选择 Sell From 失败: ${e}`);
  }

  // 7. Vertical（选择第二个选项，第一个是占位符）
  try {
    console.log('  📍 选择 Vertical...');
    const verticalLabel = page.locator('label, .el-form-item__label').filter({ hasText: '*Vertical' }).first();
    const verticalSelect = verticalLabel.locator('..').locator('.el-select').first();

    await verticalSelect.click();
    await sleep(800);

    // 等待当前下拉菜单
    const dropdown = page.locator('.el-select-dropdown.is-visible, .el-popper[aria-hidden="false"]').last();
    await dropdown.waitFor({ timeout: 5000 }).catch(() => {});
    await sleep(500);

    const options = dropdown.locator('.el-select-dropdown__item');
    const optionCount = await options.count();
    console.log(`  当前下拉菜单中找到 ${optionCount} 个 Vertical 选项`);

    if (optionCount >= 2) {
      await options.nth(1).click({ force: true });
      console.log('  ✓ 已选择第二个 Vertical 选项');
    } else if (optionCount === 1) {
      await options.first().click({ force: true });
      console.log('  ✓ 已选择唯一的 Vertical 选项');
    }
    await sleep(500);
  } catch (e) {
    console.warn(`  ⚠ 选择 Vertical 失败: ${e}`);
  }

  // 8. 如果是 End User，填写 Yard Address
  if (order.isEndUser && order.yardAddress) {
    console.log('  📍 检测到 End User，填写 Yard Address...');
    try {
      // 找到 Yard Address 的 select 组件
      const yardFormItem = page.locator('.el-form-item').filter({ hasText: 'Yard Address' }).first();
      const yardSelect = yardFormItem.locator('.el-select').first();

      // 点击展开下拉框
      await yardSelect.click();
      await sleep(300);

      // 找到输入框并输入地址（这会触发远程搜索）
      const yardInput = yardSelect.locator('input').first();
      // 先清空再输入
      await yardInput.fill('');
      await yardInput.fill(order.yardAddress);
      console.log(`  ✓ 已输入 Yard Address: ${order.yardAddress}`);

      // 触发搜索 - 模拟用户输入完成（失焦会触发远程搜索）
      await yardInput.press('End');  // 移动光标到末尾
      await sleep(2000);  // 等待远程搜索完成

      // 等待下拉框出现并有选项
      const dropdown = page.locator('.el-select-dropdown.is-visible, .el-popper[aria-hidden="false"]').last();
      await dropdown.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      // 在当前下拉框中找选项
      const options = dropdown.locator('.el-select-dropdown__item');
      const optionCount = await options.count();
      console.log(`  当前下拉菜单中找到 ${optionCount} 个 Yard Address 选项`);

      if (optionCount > 0) {
        // 选择第一个选项
        await options.first().click({ force: true });
        console.log('  ✓ 已选择第一个 Yard Address 结果');
        await sleep(500);
      } else {
        console.warn('  ⚠ 没有找到 Yard Address 搜索结果');
      }
    } catch (e) {
      console.warn(`  ⚠ 填写 Yard Address 失败: ${e}`);
    }
  }

  // 9. 填写 Terms（Deposit, Net, Installment）
  console.log('\n  📊 填写 Terms...');

  // Deposit
  try {
    const depositInput = page.locator('.el-input-number').filter({ has: page.locator('label:has-text("*Deposit")') })
      .locator('input').first();
    // 备用方式
    const depositInputAlt = page.locator('.term_li').filter({ hasText: 'Deposit' }).locator('input').first();
    if (await depositInput.count() > 0) {
      await depositInput.fill(String(CONFIG.defaultDeposit));
    } else if (await depositInputAlt.count() > 0) {
      await depositInputAlt.fill(String(CONFIG.defaultDeposit));
    }
    console.log(`  ✓ 已填写 Deposit: ${CONFIG.defaultDeposit}%`);
    await sleep(300);
  } catch (e) {
    console.warn(`  ⚠ 填写 Deposit 失败: ${e}`);
  }

  // Net
  try {
    const netInput = page.locator('.term_li').filter({ hasText: 'Net' }).locator('input').first();
    await netInput.fill(String(CONFIG.defaultNet));
    console.log(`  ✓ 已填写 Net: ${CONFIG.defaultNet}`);
    await sleep(300);
  } catch (e) {
    console.warn(`  ⚠ 填写 Net 失败: ${e}`);
  }

  // Installment
  try {
    const installmentInput = page.locator('.term_li').filter({ hasText: 'Installment' }).locator('input').first();
    await installmentInput.fill(String(CONFIG.defaultInstallment));
    console.log(`  ✓ 已填写 Installment: ${CONFIG.defaultInstallment}`);
    await sleep(300);
  } catch (e) {
    console.warn(`  ⚠ 填写 Installment 失败: ${e}`);
  }

  // 10. 点击 Submit 按钮
  console.log('\n  🚀 准备提交...');
  await sleep(1000);

  try {
    const submitBtn = page.locator('.box_submit_form_btns_btn').filter({ hasText: 'Submit' }).first();
    await submitBtn.waitFor({ timeout: 5000 });
    await submitBtn.click();
    console.log('  ✅ 已点击 Submit 按钮');
  } catch (e) {
    console.warn(`  ⚠ 点击 Submit 失败: ${e}`);
    await page.screenshot({ path: 'screenshots/submit-error.png' }).catch(() => {});
  }
}

// ==================== 工具函数 ====================
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function askInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ==================== 主流程 ====================
async function main() {
  console.log('='.repeat(50));
  console.log('  PrecisePipe 自动化下单工具');
  console.log('='.repeat(50));

  // 支持命令行传入 slack code：npm run order -- --slack=XXXXXX
  const slackArg = process.argv.find(a => a.startsWith('--slack='));
  if (slackArg) {
    CONFIG.slackCode = slackArg.split('=')[1];
    console.log(`\n  使用命令行 Slack 验证码: ${CONFIG.slackCode}`);
  }

  // 1. 读取 Excel
  console.log(`\n📂 读取 Excel: ${CONFIG.excelFile}`);
  const orders = readExcel(CONFIG.excelFile);

  if (orders.length === 0) {
    console.error('❌ Excel 中没有有效的订单数据');
    process.exit(1);
  }

  console.log(`  ✓ 共找到 ${orders.length} 条订单`);
  orders.forEach((o, i) => {
    console.log(`  [${i + 1}] Sales: ${o.loginSales || '(默认)'} | NPS ${o.nps} ${o.schedule} × ${o.qty} ${o.unit}  (Spec: ${o.spec || '-'})`);
  });

  // 2. 启动浏览器
  console.log('\n🌐 启动浏览器...');
  const browser: Browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: 200,
  });
  const page: Page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // 3. 导航到网站
    await page.goto(CONFIG.url);
    await page.waitForLoadState('networkidle');

    // 4. 登录 - 使用第一条订单的 LoginSales，如果没有则使用默认值
    const salesToUse = orders[0].loginSales || CONFIG.salesName;
    console.log(`\n🔐 使用 Sales 登录: ${salesToUse}`);
    await login(page, salesToUse, CONFIG.captchaCode, CONFIG.slackCode);

    // 5. 填写表头（取第一条订单的 Incoterm/Port/Currency）
    await fillHeader(page, orders[0]);

    // 6. 取消勾选 "Same spec across all items"
    await uncheckSameSpec(page);

    // 7. 选择 Non-AML（默认）
    console.log('\n🎯 选择 Non-AML...');
    await selectNonAML(page);

    // 8. 处理每个订单行
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`\n[${i + 1}/${orders.length}] 处理: NPS ${order.nps} ${order.schedule} × ${order.qty} ${order.unit}`);

      // 点击对应规格单元格
      const clicked = await clickSizeCell(page, order.nps!, order.schedule!);
      if (!clicked) {
        console.error(`  ❌ 未找到规格单元格: NPS ${order.nps} ${order.schedule}`);
        failCount++;
        continue;
      }
      console.log(`  ✓ 已点击规格单元格`);

      // 填写 Spec/MinLength/MaxLength/Qty 并提交
      const success = await fillItemModal(page, order);
      if (success) {
        successCount++;
        console.log(`  ✅ 订单 ${i + 1} 添加成功`);
      } else {
        failCount++;
        console.error(`  ❌ 订单 ${i + 1} 添加失败`);
      }

      await sleep(500);
    }

    // 8. 汇总
    console.log('\n' + '='.repeat(50));
    console.log(`  完成！成功: ${successCount}，失败: ${failCount}`);
    console.log('='.repeat(50));

    if (successCount > 0) {
      console.log('\n⏳ 等待 3 秒后点击 Next 按钮...');
      await sleep(3000);

      // 先关闭可能存在的 layui 遮罩层和弹窗
      await page.evaluate(() => {
        // 移除所有 layui 遮罩层
        document.querySelectorAll('.layui-layer-shade').forEach(el => el.remove());
        document.querySelectorAll('.layui-layer').forEach(el => el.remove());
      }).catch(() => {});
      await sleep(500);

      // 点击 Next 按钮
      const nextBtn = page.locator('.box_center_buy').filter({ hasText: 'Next' }).first();
      await nextBtn.click({ force: true });
      console.log('  ✓ 已点击 Next 按钮');

      // 等待第一个确认弹窗出现
      await sleep(2000);

      // 处理每个 item 的确认弹窗（数量等于成功添加的订单数）
      console.log(`\n📋 开始处理 ${successCount} 个确认弹窗...`);
      for (let i = 0; i < successCount; i++) {
        console.log(`\n[${i + 1}/${successCount}] 处理确认弹窗...`);

        // 等待 layui iframe 弹窗出现
        try {
          await page.waitForSelector('iframe[id^="layui-layer-iframe"]', { timeout: 10000 });
        } catch {
          console.warn('  ⚠ 未找到确认弹窗，可能已全部处理完成');
          break;
        }

        // 获取最新的 iframe
        const iframeId = await page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll('iframe[id^="layui-layer-iframe"]'));
          if (iframes.length === 0) return '';
          return iframes.reduce((latest, el) => {
            const n = parseInt(el.id.replace('layui-layer-iframe', '')) || 0;
            const l = parseInt(latest.replace('layui-layer-iframe', '')) || 0;
            return n > l ? el.id : latest;
          }, '');
        });

        if (!iframeId) {
          console.warn('  ⚠ 未能获取 iframe ID');
          continue;
        }

        const frame = page.frameLocator(`#${iframeId}`);

        // 等待 "Double Checked and Next" 按钮出现
        const confirmBtn = frame.getByRole('button', { name: /Double Checked and Next/i });
        try {
          await confirmBtn.waitFor({ timeout: 10000 });
          await sleep(500); // 稍等让弹窗完全加载

          // 点击确认按钮
          await confirmBtn.click();
          console.log('  ✓ 已点击 "Double Checked and Next"');

          // 等待弹窗关闭
          await page.waitForSelector(`#${iframeId}`, { state: 'hidden', timeout: 8000 }).catch(() => {});
          await sleep(1000); // 等待下一个弹窗
        } catch (e) {
          console.warn(`  ⚠ 处理确认弹窗失败: ${e}`);
          // 尝试截图
          await page.screenshot({ path: `screenshots/confirm-error-${i}.png` }).catch(() => {});
        }
      }

      console.log('\n✅ 所有确认弹窗处理完成，已进入第二页');

      // 第二页：点击 Next Step 进入第三页
      console.log('\n📄 第二页：等待页面加载...');
      await sleep(3000);

      // 截图查看当前状态
      await page.screenshot({ path: 'screenshots/page2-before-click.png' }).catch(() => {});
      console.log('  📸 已保存截图 screenshots/page2-before-click.png');

      // 滚动到页面底部，确保按钮可见
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1000);

      // Next Step 按钮是 <a class="box_form_next_li2"> 元素
      let nextStepClicked = false;
      const nextStepSelectors = [
        page.locator('a.box_form_next_li2'),
        page.locator('.box_form_next_li2'),
        page.locator('.box_form_next .right a').filter({ hasText: 'Next Step' }),
        page.locator('a').filter({ hasText: 'Next Step' }),
        page.locator('text=Next Step'),
      ];

      for (const selector of nextStepSelectors) {
        try {
          const count = await selector.count();
          console.log(`  尝试选择器，找到 ${count} 个元素`);
          if (count > 0) {
            const el = selector.first();
            // 滚动到元素位置
            await el.scrollIntoViewIfNeeded().catch(() => {});
            await sleep(500);

            // 检查元素是否可见
            const isVisible = await el.isVisible().catch(() => false);
            console.log(`  元素可见: ${isVisible}`);

            // 尝试点击
            await el.click({ timeout: 10000, force: true });
            console.log('  ✓ 已点击 "Next Step"');

            // 等待 URL 变化到第三页
            console.log('  ⏳ 等待页面跳转到第三页...');
            try {
              await page.waitForURL('**/quote_submit.html**', { timeout: 15000 });
              console.log('  ✅ 已成功进入第三页！');
              nextStepClicked = true;
            } catch (urlErr) {
              console.warn('  ⚠ URL 未变化，可能点击未生效');
              await page.screenshot({ path: 'screenshots/page2-url-not-changed.png' }).catch(() => {});
              // 继续尝试下一个选择器
              continue;
            }
            break;
          }
        } catch (e) {
          console.log(`  尝试下一个选择器... (${e})`);
          continue;
        }
      }

      if (!nextStepClicked) {
        console.warn('  ⚠ 未成功跳转到第三页，尝试截图...');
        await page.screenshot({ path: 'screenshots/page2-next-step-error.png' }).catch(() => {});
        console.log('  💡 请检查截图 screenshots/page2-next-step-error.png');
        throw new Error('无法进入第三页，请检查 Next Step 按钮');
      }

      // 等待第三页加载
      await sleep(2000);

      // 第三页：填写提交表单
      await fillSubmitPage(page, orders[0]);
    }

  } catch (err) {
    console.error('\n❌ 执行出错:', err);
    // 截图保存错误现场
    await page.screenshot({ path: 'screenshots/error.png', fullPage: true }).catch(() => {});
    throw err;
  } finally {
    console.log('\n按 Ctrl+C 关闭浏览器，或等待 30 秒自动关闭...');
    await sleep(30000);
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
