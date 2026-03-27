/**
 * 邮件获取+Markdown提取一体化脚本
 * 用法: node fetch-email.js <email_id>
 * 示例: node fetch-email.js q5291
 *
 * 1. 从 tools.precisepipe.com 获取邮件 HTML
 * 2. 提取 Markdown 格式，保存为 .md
 * 3. 输出文件路径供后续分析
 */

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const TOKEN = 'eyJpZCI6InJlY0VhSVFuTWpzaDRheDc2IiwidHlwZSI6IkxpbmVQaXBlIiwia2V5IjoiNmM3YmM2YTQ1NzAxNDkxNGIyNjg4NjZhMTA5M2E2MzUifQ==';

const emailId = process.argv[2] || 'q5291';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('用法: node fetch-email.js <email_id>');
  console.log('示例: node fetch-email.js q5291');
  process.exit(0);
}

// --- HTML → Markdown 提取 ---
function getAttr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
}

function extractText(html) {
  let text = html;

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Remove <style> blocks
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove <script> blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove <iframe> (no useful text)
  text = text.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  text = text.replace(/<iframe[^>]*\/?>/gi, '');

  // Remove <svg> (decorative icons, no text)
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // Convert headings to Markdown
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, inner) => '# ' + inner.replace(/<[^>]+>/g, '').trim() + '\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, inner) => '## ' + inner.replace(/<[^>]+>/g, '').trim() + '\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner) => '### ' + inner.replace(/<[^>]+>/g, '').trim() + '\n\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, inner) => '#### ' + inner.replace(/<[^>]+>/g, '').trim() + '\n\n');
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, inner) => '##### ' + inner.replace(/<[^>]+>/g, '').trim() + '\n\n');
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, inner) => '###### ' + inner.replace(/<[^>]+>/g, '').trim() + '\n\n');

  // Convert <strong> and <b> to **bold**
  text = text.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (_, inner) => '**' + inner.trim() + '**');

  // Convert <em> and <i> to *italic*
  text = text.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, (_, inner) => '*' + inner.trim() + '*');

  // Convert <blockquote> to > quote
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const content = inner.replace(/<[^>]+>/g, '').trim();
    return content.split('\n').map(line => '> ' + line.trim()).join('\n') + '\n\n';
  });

  // Convert <hr> to ---
  text = text.replace(/<hr[^>]*\/?>/gi, '\n---\n');

  // Convert <br> to newline
  text = text.replace(/<br[^>]*\/?>/gi, '\n');

  // Convert <p> to double newline
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => inner.trim() + '\n\n');

  // Convert unordered lists
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    const items = inner.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    return items.map(li => {
      const content = li.replace(/<\/?li[^>]*>/gi, '').replace(/<[^>]+>/g, '').trim();
      return '- ' + content;
    }).join('\n') + '\n\n';
  });

  // Convert ordered lists
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    const items = inner.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    return items.map((li, i) => {
      const content = li.replace(/<\/?li[^>]*>/gi, '').replace(/<[^>]+>/g, '').trim();
      return (i + 1) + '. ' + content;
    }).join('\n') + '\n\n';
  });

  // Convert <img> to [Image: src or alt]
  text = text.replace(/<img[^>]*\/?>/gi, (tag) => {
    const alt = getAttr(tag, 'alt');
    const src = getAttr(tag, 'src');
    if (src && !src.startsWith('data:')) return `[Image: ${src}]`;
    if (alt) return `[Image: ${alt}]`;
    return '';
  });

  // Convert <a> to "text (url)"
  text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, (match, inner) => {
    const href = getAttr(match, 'href');
    const label = inner.replace(/<[^>]+>/g, '').trim();
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      return label ? `${label} (${href})` : `(${href})`;
    }
    return label;
  });

  // Convert <button> to its text label
  text = text.replace(/<button[^>]*>([\s\S]*?)<\/button>/gi, (_, inner) => {
    return inner.replace(/<[^>]+>/g, '').trim();
  });

  // Convert <table> to Markdown table
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (tableHtml) => {
    const rows = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let m;
    while ((m = trRe.exec(tableHtml)) !== null) {
      const cells = [];
      const cellRe = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
      let c;
      while ((c = cellRe.exec(m[1])) !== null) {
        const cellText = c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
        cells.push(cellText);
      }
      if (cells.length > 0) rows.push('| ' + cells.join(' | ') + ' |');
    }
    if (rows.length === 0) return '';
    const result = [rows[0]];
    if (rows.length > 1) {
      const colCount = (rows[0].match(/\|/g) || []).length - 1;
      result.push('| ' + Array(colCount).fill('---').join(' | ') + ' |');
    }
    for (let i = 1; i < rows.length; i++) result.push(rows[i]);
    return '\n' + result.join('\n') + '\n';
  });

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&apos;/gi, "'");

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');

  return text.trim();
}

// --- 主流程 ---
console.log(`正在获取邮件: ${emailId}`);

const options = {
  hostname: 'tools.precisepipe.com',
  path: `/assistant/email/${emailId}`,
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cookie': `LinePipe_loginVerify=${TOKEN}`
  },
  timeout: 120000
};

const req = https.request(options, (res) => {
  const chunks = [];
  let stream = res;
  const encoding = res.headers['content-encoding'];
  if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
  else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
  else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress());

  stream.on('data', (chunk) => chunks.push(chunk));

  stream.on('end', () => {
    const html = Buffer.concat(chunks).toString('utf-8');
    if (res.statusCode !== 200) {
      console.log(`FAIL: status ${res.statusCode}`);
      console.log(html.substring(0, 200));
      process.exit(1);
    }

    // 提取 Markdown，保存为 .md
    const text = extractText(html);
    const saveDir = path.join(__dirname, 'emailHtml', emailId);
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    const mdPath = path.join(saveDir, `${emailId}.md`);
    fs.writeFileSync(mdPath, text, 'utf-8');

    console.log(`OK: ${mdPath} (${text.length} chars)`);
  });

  stream.on('error', (e) => console.log(`FAIL: ${e.message}`));
});

req.on('timeout', () => { console.log('FAIL: timeout'); req.destroy(); });
req.on('error', (e) => console.log(`FAIL: ${e.message}`));
req.end();
