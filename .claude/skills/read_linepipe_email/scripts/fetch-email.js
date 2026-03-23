/**
 * 邮件HTML获取脚本
 * 用法: node fetch-email.js <email_id>
 * 示例: node fetch-email.js q5291
 *       node fetch-email.js q5292
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 固定的 token
const TOKEN = 'eyJpZCI6InJlY0VhSVFuTWpzaDRheDc2IiwidHlwZSI6IkxpbmVQaXBlIiwia2V5IjoiNmM3YmM2YTQ1NzAxNDkxNGIyNjg4NjZhMTA5M2E2MzUifQ==';

// 从命令行参数获取 email_id
const emailId = process.argv[2] || 'q5291';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('用法: node fetch-email.js <email_id>');
  console.log('示例: node fetch-email.js q5291');
  process.exit(0);
}

console.log(`正在获取邮件: ${emailId}`);
console.log('');

const options = {
  hostname: 'tools.precisepipe.com',
  path: `/assistant/email/${emailId}`,
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Connection': 'keep-alive',
    'Cookie': `LinePipe_loginVerify=${TOKEN}`
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const saveDir = path.join(__dirname, 'emailHtml', emailId);
      const filename = path.join(saveDir, `email-${emailId}-${timestamp}.html`);

      // 确保目录存在
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      fs.writeFileSync(filename, data, 'utf-8');

      console.log('✅ 成功获取邮件HTML');
      console.log(`文件保存到: ${filename}`);
      console.log(`文件大小: ${(data.length / 1024).toFixed(2)} KB`);
    } else {
      console.log(`❌ 获取失败，状态码: ${res.statusCode}`);
      console.log('响应:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.log(`❌ 请求错误: ${e.message}`);
});

req.end();
