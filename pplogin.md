# PrecisePipe 网站登录方法

## 登录页面 URL
```
https://precisepipe-api.activatortube.com/quote/login.html?type=PO&loginUrl=/po/index.html?id=83
```

## 登录流程  使用 chome 登录

### 第一步：填写基本信息

1. **选择用户名**: 从下拉列表中选择用户
2. **输入 Canvas 验证码**: 识别 Canvas 上绘制的 4 位随机数字

### 第二步：获取并输入 Slack 验证码

点击 "Next" 后，系统会调用 API 发送验证码到对应用户的 Slack Channel。

**关键 API 请求**:
```
GET https://precisepipe-api.activatortube.com/front-api/airtable/user/getCode3?id={userId}&url={redirectUrl}
```

**响应体示例**:
```json
{
  "code": 0,
  "data": "4664",
  "msg": "We will send your verification code to the Slack Alex Chow channel"
}
```

**验证码就在 `data` 字段中**，无需真正查看 Slack。

### 第三步：完成登录

输入从 API 响应中获取的验证码，点击 "Login" 即可完成登录。

## 用户列表 API

```
GET https://precisepipe-api.activatortube.com/front-api/airtable/user/userList
```

返回所有可登录的用户信息：

```json
{
  "code": 0,
  "data": [
    {"id": "recHsJOgjhEWScCtU", "name": "Alex Chow", "roles": ["Supervisor"]},
    {"id": "recEaIQnMjsh4ax76", "name": "Anson Ni", "roles": ["Boss"]},
    ...
  ]
}
```

## 自动化登录要点

1. **Canvas 验证码识别**:
   - 验证码是 4 位随机数字，绘制在 Canvas 上
   - 可通过截图 + OCR 识别，或直接分析 Canvas 绘制逻辑

2. **Slack 验证码获取**:
   - 验证码直接在 `getCode3` API 响应体中返回
   - 无需真正访问 Slack Channel

3. **请求头要求**:
   - `X-Requested-With: XMLHttpRequest`
   - `Accept: */*`

## 示例代码（Puppeteer）

```javascript
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // 监听 getCode3 响应
  let slackCode = null;
  page.on('response', async (response) => {
    if (response.url().includes('getCode3')) {
      const data = await response.json();
      slackCode = data.data; // 验证码在这里
      console.log('Slack verification code:', slackCode);
    }
  });

  // 导航到登录页
  await page.goto('https://precisepipe-api.activatortube.com/po/index.html?id=83');

  // 等待重定向到登录页后，填写表单...

  // 关闭浏览器
  // await browser.close();
})();
```

## 注意事项

- Canvas 验证码每次刷新会变化
- Slack 验证码有有效期限制
- 登录成功后会跳转到原始请求的页面
