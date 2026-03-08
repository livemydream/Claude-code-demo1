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
};

// ==================== Excel 数据类型 ====================
interface OrderRow {
  incoterm?: string;
  currency?: string;
  destination?: string;
  spec?: string;
  nps?: string;       // 解析自 Size，如 "1/8"
  schedule?: string;  // 解析自 Size，如 "STD"
  qty?: number;
  unit?: string;
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

  const orders: OrderRow[] = [];

  for (const row of rawRows) {
    // 继承上一行的值（Excel 中合并单元格或空行复用）
    if (row['Incoterm']) lastIncoterm = String(row['Incoterm']).trim();
    if (row['Currency']) lastCurrency = String(row['Currency']).trim();
    if (row['Destination']) lastDestination = String(row['Destination']).trim();
    if (row['Spec']) lastSpec = String(row['Spec']).trim();

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
      nps: parsed.nps,
      schedule: parsed.schedule,
      qty: Number(qty),
      unit,
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

  // frameLocator 用于元素操作，frameObj 用于 evaluate（iframe name == id）
  const frame = page.frameLocator(`#${iframeId}`);
  const frameObj = page.frame({ name: iframeId });

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
    console.log(`  [${i + 1}] NPS ${o.nps} ${o.schedule} × ${o.qty} ${o.unit}  (Spec: ${o.spec || '-'})`);
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

    // 4. 登录
    await login(page, CONFIG.salesName, CONFIG.captchaCode, CONFIG.slackCode);

    // 5. 填写表头（取第一条订单的 Incoterm/Port/Currency）
    await fillHeader(page, orders[0]);

    // 6. 取消勾选 "Same spec across all items"
    await uncheckSameSpec(page);

    // 7. 处理每个订单行
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
      console.log('\n⏳ 请检查页面后手动点击 Next 提交，或等待 10 秒自动继续...');
      await sleep(10000);
      // 点击 Next 按钮
      await page.locator('text=Next').last().click().catch(() => {});
      await sleep(3000);
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
