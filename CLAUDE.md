# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**auto-order** is a Node.js/TypeScript automation tool that reads order data from Excel and uses Playwright to automatically submit quotes on the PrecisePipe website.

## Commands

```bash
npm run order                    # Run main automation script
npm run order -- --slack=XXXXXX  # Pass Slack verification code
npm run dev                      # Run src/index.ts
npm run build                    # Compile TypeScript to dist/
npm start                        # Run compiled code
```

## Architecture

Single-purpose CLI tool with two source files:

- **`src/order.ts`** — Main automation script (~1000 lines). Contains:
  - `CONFIG` object — Central configuration (URL, credentials, file paths, defaults)
  - `readExcel()` — Parses `demo.xlsx`; empty cells inherit previous row's value
  - `parseSize()` — Extracts NPS and Schedule from strings like `NPS 1/8 STD`
  - `login()` — Two-factor auth: fixed captcha + one-time Slack code
  - `fillHeader()` — Sets Incoterm, Port, Currency on page 1
  - `fillItemModal()` — Fills layui iframe modal for each line item
  - `fillSubmitPage()` — Fills page 3 form (Company, Buyer, Address, Terms)
  - `main()` — Full workflow orchestration

- **`src/read-excel.ts`** — Utility to inspect Excel column structure

## 3-Page Workflow

1. **Page 1 (quote_Line_Pipe.html)** — Select NPS/Schedule cells, fill item modals
2. **Page 2 (quote.html)** — Click "Next Step" after reviewing items
3. **Page 3 (quote_submit.html)** — Fill Company, Buyer, Email, Phone, Addresses, Sell From, Vertical, Terms, Submit

## Excel Data Format

| Column | Description | Example |
|--------|-------------|---------|
| Incoterm | Trade term | DDP |
| Currency | Currency | USD / CAD |
| Destination | Port/Destination | Edmonton |
| Spec | Material specification | API5L 46th Edition B PSL 1 |
| LoginSales | Sales person to login | Alex Chow |
| Size | NPS + Schedule | NPS 1/8 STD |
| Qty | Quantity | 100 |
| Unit | Unit | ft |
| Company | Company name | Precise Pipe |
| Sell From | Sell from entity | Precise Pipe Inc. |
| Is End User | 1 = End User | 1 or 0 |
| Yard Address | Delivery address (if End User) | 2155 University Ave... |

- Empty cells inherit previous row's value
- Rows without Size or Qty are skipped
- Schedule values: STD, XS, S10, S20, S30, S40, S60, S80, S100, S120, S140, XXS, S160, X

## Key Implementation Patterns

### Vue.js Reactive Input in iframe
Standard `element.value = x` won't trigger Vue reactivity. Use native setter:
```typescript
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
nativeInputValueSetter.call(input, value);
input.dispatchEvent(new Event('input', { bubbles: true }));
```

### Element Plus Dropdown Selection
Page 3 uses Element Plus (`el-select`, `el-select-v2`). Wait for visible dropdown, scope options to current dropdown:
```typescript
const dropdown = page.locator('.el-select-dropdown.is-visible, .el-popper[aria-hidden="false"]').last();
await dropdown.waitFor({ state: 'visible', timeout: 5000 });
const options = dropdown.locator('.el-select-dropdown__item');
```

### Remote Search Address Fields
Business Address and Yard Address use remote search. After input, wait for search to complete:
```typescript
await addressInput.fill(address);
await sleep(2000);  // Wait for remote search
const options = dropdown.locator('.el-select-dropdown__item');
await options.first().click({ force: true });
```

### Layui Components
- **Dropdowns**: Use `selectLayuiOption(page, selectId, optionText)` for Incoterm/Port
- **Modal Detection**: Find highest-numbered iframe: `iframe[id^="layui-layer-iframe"]`
- **Layer Shade Removal**: Before clicking buttons that might be blocked:
  ```typescript
  await page.evaluate(() => {
    document.querySelectorAll('.layui-layer-shade').forEach(el => el.remove());
    document.querySelectorAll('.layui-layer').forEach(el => el.remove());
  });
  ```

## Configuration (src/order.ts)

```typescript
const CONFIG = {
  url: 'https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html',
  captchaCode: '240501',
  slackCode: 'PP8STD',        // Override with --slack=
  salesName: 'Alex Chow',
  excelFile: './demo.xlsx',
  headless: false,
  defaultMinLength: '18',     // feet
  defaultMaxLength: '22',     // feet
  defaultDeposit: 20,         // %
  defaultNet: 30,             // days
  defaultInstallment: 1,
};
```

## Output Files

- `screenshots/error.png` — Screenshot on automation failure
- `dist/` — Compiled JavaScript (not committed)

## Reference

See `FLOW.md` for detailed target website structure, selectors, and known issues.
