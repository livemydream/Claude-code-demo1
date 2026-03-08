# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**auto-order** is a Node.js/TypeScript automation tool that reads order data from Excel files and automates order placement on the PrecisePipe quote website using Playwright browser automation.

## Commands

```bash
# Development - run directly with ts-node
npm run dev          # runs src/index.ts
npm run order        # runs src/order.ts (main automation script)

# Pass Slack verification code as argument
npm run order -- --slack=XXXXXX

# Build TypeScript to dist/
npm run build

# Run compiled output
npm start
```

## Architecture

The project is a single-purpose CLI tool with two source files:

- **`src/order.ts`** — Main automation script (573 lines). Contains all logic:
  - `CONFIG` object — Central config (URL, credentials, file paths, defaults)
  - `readExcel()` — Parses `demo.xlsx`; empty cells inherit from the previous row
  - `parseSize()` — Extracts NPS and Schedule from strings like `NPS 1/8 STD`
  - `login()` — 2-step auth: fixed captcha code + one-time Slack verification code
  - `fillHeader()` — Sets Incoterm, Port, Currency on the main quote form
  - `fillItemModal()` — Fills the modal iframe for each line item
  - `main()` — Orchestrates the full workflow

- **`src/read-excel.ts`** — Minimal utility to inspect Excel column structure

## Key Implementation Details

### Vue.js Reactivity in Iframes
The quote site uses Vue.js inside layui modal iframes. Standard `element.value = x` doesn't trigger reactivity. Use the native setter approach:
```typescript
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
nativeInputValueSetter.call(input, value);
input.dispatchEvent(new Event('input', { bubbles: true }));
```

### Excel Data Format
- Columns: Incoterm, Currency, Destination, Spec, Size, Qty, Unit
- Size format: `NPS 1/8 STD` → parsed to `{nps: '1/8', schedule: 'STD'}`
- Empty cells inherit from previous row; rows missing Size or Qty are skipped
- Schedule mappings: STD, XS, S10, S20, XXS, S40, S60, S80, S100, S120, S140, S160

### Login Flow
1. Select sales name from dropdown (default: `Alex Chow`)
2. Enter fixed captcha code (`240501`)
3. Enter one-time Slack verification code (prompted interactively or via `--slack=`)

### Layui Dropdowns
Use `selectLayuiOption(page, label, optionText)` for Incoterm/Port/Currency — these are custom components, not native `<select>` elements.

### Modal Detection
Iframes are detected by finding the highest-numbered layui iframe: `iframe[id^="layui-layer-iframe"]`

## Configuration

All runtime config is in the `CONFIG` object at the top of `src/order.ts`:
```typescript
const CONFIG = {
  url: 'https://precisepipe-api.activatortube.com/quote/quote_Line_Pipe.html',
  captchaCode: '240501',
  slackCode: 'PP8STD',        // override via --slack=
  salesName: 'Alex Chow',
  excelFile: './demo.xlsx',
  headless: false,
  defaultMinLength: '18',     // feet
  defaultMaxLength: '22',     // feet
};
```

## Output

- `screenshots/error.png` — Captured on automation failure
- `dist/` — Compiled JavaScript output (not committed)

## Workflow Reference

See `FLOW.md` for detailed page structure, column mappings, and known quirks of the target website.
