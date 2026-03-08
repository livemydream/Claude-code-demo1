# PrecisePipe 自动化下单工具

自动化的 PrecisePipe 网站下单工具，支持从文件读取订单并批量提交。

## 快速开始

### 1. 安装依赖

```bash
cd automation
npm install
```

### 2. 准备订单文件

在 `data/orders.json` 中准备订单数据：

```json
{
  "batchName": "2024-03-批次-001",
  "orders": [
    {
      "id": "ORD-001",
      "spec": {
        "nps": "1/2",
        "schedule": "STD"
      },
      "quantity": 100,
      "unit": "FT",
      "remark": "备注信息"
    }
  ]
}
```

### 3. 运行

```bash
npm run start
```

## 命令说明

### run - 执行下单

```bash
npm run start -- run [选项]

选项:
  -f, --file <path>     订单文件路径 (默认: ./data/orders.json)
  -s, --sales <name>    Sales 名称 (默认: Alex Chow)
  -h, --headless        无头模式运行
  -v, --verbose         显示详细日志
```

示例:
```bash
# 使用默认配置
npm run start

# 指定订单文件
npm run start -- -f ./data/my-orders.json

# 使用其他 Sales
npm run start -- -s "Brian Xu"

# 详细模式
npm run start -- -v
```

### validate - 验证订单文件

```bash
npm run start -- validate <文件路径>
```

示例:
```bash
npm run start -- validate ./data/orders.json
```

## 订单文件格式

### JSON 格式

```json
{
  "batchName": "批次名称",
  "createdAt": "2024-03-08T10:00:00Z",
  "config": {
    "delayBetweenOrders": 2000,
    "maxRetries": 3
  },
  "orders": [
    {
      "id": "ORD-001",
      "spec": {
        "nps": "1/2",
        "schedule": "STD",
        "material": "Carbon Steel",
        "length": "20",
        "endType": "Beveled End"
      },
      "quantity": 100,
      "unit": "FT",
      "remark": "备注",
      "priority": "normal"
    }
  ]
}
```

### CSV 格式

```csv
id,nps,schedule,material,length,end_type,quantity,unit,remark,priority
ORD-001,1/2,STD,Carbon Steel,20,Beveled End,100,FT,备注,normal
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| id | 否 | 订单ID，用于追踪 |
| nps | 是 | 管道尺寸，如 "1/2", "3/4", "1" |
| schedule | 是 | 壁厚等级，如 "STD", "XS", "S40" |
| material | 否 | 材质 |
| length | 否 | 长度 |
| end_type | 否 | 端部类型 |
| quantity | 是 | 数量 |
| unit | 否 | 单位：FT, M, PC (默认: FT) |
| remark | 否 | 备注 |
| priority | 否 | 优先级：high, normal, low |

## 目录结构

```
automation/
├── config/          # 配置文件
├── data/            # 订单数据
├── src/
│   ├── core/        # 核心模块
│   ├── modules/     # 业务模块
│   │   ├── login/   # 登录
│   │   └── order/   # 下单
│   ├── utils/       # 工具函数
│   └── types/       # 类型定义
├── logs/            # 日志输出
└── screenshots/     # 错误截图
```

## 注意事项

1. **Slack 验证码**：登录时需要手动输入 Slack 验证码
2. **浏览器模式**：默认使用有头模式，便于观察和调试
3. **错误处理**：失败时自动截图保存到 `screenshots/` 目录
4. **日志记录**：详细日志保存在 `logs/` 目录

## 故障排查

### 常见问题

1. **元素未找到**
   - 检查 `config/selectors.ts` 中的选择器是否与网站匹配
   - 网站可能已更新，需要更新选择器

2. **登录超时**
   - 检查 Slack 验证码是否正常接收
   - 增加 `slackCodeTimeout` 配置

3. **网络错误**
   - 检查网络连接
   - 增加重试次数配置

## 开发

```bash
# 构建
npm run build

# 测试
npm test
```
