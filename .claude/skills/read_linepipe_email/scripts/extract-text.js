/**
 * Extract Markdown from email HTML files.
 * Keeps: text content, button labels, image info, link URLs.
 * Removes: scripts, styles, SVGs, iframes, UI framework chrome.
 * Output: Markdown format (.md)
 *
 * Usage:
 *   node emailHtml/extract-text.js emailHtml/q5291/email-q5291-2026-03-27T01-22-50.html
 *   node emailHtml/extract-text.js emailHtml/q5291/          # process all .html in folder
 */

const fs = require('fs');
const path = require('path');

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
    if (src && !src.startsWith('data:')) {
      return `[Image: ${src}]`;
    }
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

  // Convert <table> to pipe-delimited text format
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (tableHtml) => {
    const rows = [];
    // Extract <tr> blocks (handle <thead>/<tbody> nesting)
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let m;
    while ((m = trRe.exec(tableHtml)) !== null) {
      const cells = [];
      // Extract <th> and <td> cells
      const cellRe = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
      let c;
      while ((c = cellRe.exec(m[1])) !== null) {
        // Strip inner tags but keep text
        const cellText = c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
        cells.push(cellText);
      }
      if (cells.length > 0) {
        rows.push('| ' + cells.join(' | ') + ' |');
      }
    }
    if (rows.length === 0) return '';
    // Add separator after header row if first row looks like a header
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

  // Decode common HTML entities
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

  // Trim each line
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return text.trim();
}

function processFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const text = extractText(html);

  const outPath = filePath.replace(/\.html$/i, '.md');
  fs.writeFileSync(outPath, text, 'utf-8');
  console.log(`OK: ${path.relative(process.cwd(), outPath)} (${text.length} chars)`);
}

function main() {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.log('Usage: node extract-text.js <file.html|folder> ...');
    process.exit(1);
  }

  for (const target of targets) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(target).filter(f => f.endsWith('.html'));
      for (const f of files.sort()) {
        processFile(path.join(target, f));
      }
    } else {
      processFile(target);
    }
  }
}

main();
