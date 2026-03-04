# Base Mini App Attribution Dashboard

## 部署步骤

### 第一步：把代码推到 GitHub
```bash
git init
git add .
git commit -m "init dashboard"
git remote add origin https://github.com/你的用户名/base-dashboard.git
git push -u origin main
```

### 第二步：Vercel 部署
1. 打开 vercel.com，点 "Add New Project"
2. 选择 GitHub 仓库 `base-dashboard`
3. 直接点 Deploy（无需修改任何配置）
4. 部署完成，记下你的域名，例如 `base-dashboard-xxx.vercel.app`

### 第三步：开通 Vercel KV 数据库
1. 打开你的 Vercel 项目页面
2. 点顶部 **Storage** 标签
3. 点 **Create Database** → 选 **KV**
4. 命名随意，点 Create
5. 点 **Connect to Project** 连接到 base-dashboard 项目
6. **重新部署一次**（Vercel会自动注入环境变量）

### 第四步：更新 Mini App 埋点地址
把 `utils/track.js` 里的域名改成你的实际域名：
```js
const DASHBOARD_API = 'https://base-dashboard-xxx.vercel.app/api/track'
```

### 第五步：每个 Mini App 接入埋点
1. 复制 `utils/track.js` 到 Mini App 项目
2. 在交易成功回调里加一行：
```js
import { trackTransaction } from '@/utils/track'

// onSuccess 回调里：
trackTransaction('app-001', '你的App名', address, response.transactionReceipts[0].transactionHash)
```

## App ID 规范
| 编号 | App 名称 |
|------|---------|
| app-001 | 第一个 App |
| app-002 | 第二个 App |
| app-003 | 第三个 App |

## 访问看板
直接访问 `https://你的域名.vercel.app` 即可，数据每60秒自动刷新。
