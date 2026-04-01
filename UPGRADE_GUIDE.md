# Dashboard 升级说明文档

## 更新内容

Dashboard 已成功升级，现在支持以下新功能：

### 1. **打开次数统计 (App Opens)**
   - 追踪用户打开App的次数
   - 防重复：同个用户同日只计算一次打开

### 2. **交易量统计 (Transaction Volume)**
   - 记录每笔交易的金额
   - 统计总交易量和日交易量

## Mini App 集成指南

### 第一步：复制埋点工具函数

将以下文件复制到你的 Mini App 项目：

**文件路径:** `utils/track.js`

```javascript
const DASHBOARD_API = 'https://base-dashboard-zeta.vercel.app/api/track'

export async function trackTransaction(appId, appName, userAddress, txHash, amount) {
  try {
    await fetch(DASHBOARD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'transaction',
        app_id: appId,
        app_name: appName,
        user_address: userAddress?.toLowerCase(),
        tx_hash: txHash,
        amount: amount || null,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // 静默失败，不影响主流程
  }
}

export async function trackAppOpen(appId, appName, userAddress) {
  try {
    await fetch(DASHBOARD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'open',
        app_id: appId,
        app_name: appName,
        user_address: userAddress?.toLowerCase(),
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // 静默失败，不影响主流程
  }
}
```

### 第二步：在 App 初始化时埋点 - 打开事件

```javascript
import { trackAppOpen } from '@/utils/track'

// 在应用初始化或页面加载时调用
useEffect(() => {
  if (address) {
    trackAppOpen(
      'app-001',      // 替换成你的App编号
      'App名称',       // 替换成你的App名称
      address         // 用户钱包地址（来自 useAccount()）
    )
  }
}, [address])
```

### 第三步：在交易成功时埋点 - 交易事件

#### OnchainKit 方式：
```javascript
import { trackTransaction } from '@/utils/track'

// 交易成功后调用
if (response.transactionReceipts && response.transactionReceipts.length > 0) {
  trackTransaction(
    'app-001',                                      // 替换成你的App编号
    'App名称',                                       // 替换成你的App名称
    address,                                        // 用户钱包地址
    response.transactionReceipts[0].transactionHash,// 交易哈希
    100.5                                           // 交易量（可选）
  )
}
```

#### wagmi 方式：
```javascript
import { trackTransaction } from '@/utils/track'

// 交易成功后调用
if (data) {
  trackTransaction(
    'app-001',      // 替换成你的App编号
    'App名称',       // 替换成你的App名称
    address,        // 用户钱包地址
    data.hash,      // 交易哈希
    100.5           // 交易量（可选）
  )
}
```

## 参数说明

### trackTransaction 参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appId | string | ✅ | App唯一编号，如 'app-001'，每个App不能重复 |
| appName | string | ✅ | App显示名称，如 '每日签到' |
| userAddress | string | ✅ | 用户钱包地址，来自 useAccount() 的 address |
| txHash | string | ✅ | 交易哈希 |
| amount | number | ❌ | 交易金额（可选），如 100.5 |

### trackAppOpen 参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appId | string | ✅ | App唯一编号，如 'app-001'，每个App不能重复 |
| appName | string | ✅ | App显示名称，如 '每日签到' |
| userAddress | string | ✅ | 用户钱包地址，来自 useAccount() 的 address |

## 重要注意事项

1. **App 编号唯一性**
   - 每个 Mini App 必须分配唯一编号（app-001, app-002, ...）
   - 不同App不能使用相同编号
   - 编号一旦确定，不能更改

2. **埋点时机**
   - `trackAppOpen`: 在App初始化或页面加载时调用，同日同用户只计算一次
   - `trackTransaction`: 必须在交易成功后调用，不能阻断主流程

3. **性能和可靠性**
   - 两个追踪函数都是异步的，不会阻止主流程
   - 网络故障时自动静默失败，不影响用户体验
   - 不需要安装任何额外依赖，使用原生 fetch

4. **数据展示**
   - 数据会实时上报到Dashboard
   - 打开数据每日每用户只计算一次
   - 交易数据支持防重复（基于txHash）

## Dashboard 新增展示

Dashboard 现在展示以下指标：

### 摘要卡片
- TOTAL APPS - 总应用数
- TRANSACTIONS - 总交易数
- USERS - 总用户数
- APP OPENS - 总打开数
- TX VOLUME - 总交易量
- AVG TX/USER - 平均每用户交易数

### App 卡片
- TRANSACTIONS - 交易数和总计
- USERS - 用户数和客户/用户比
- APP OPENS - 打开数和总计
- TX VOLUME - 交易量和总计
- FIRST TIME - 首次用户数
- RETURNING - 回访用户数

### 排行榜
- 按交易数排序
- 新增列：打开数、交易量

## 故障排查

### 埋点数据没有上报
1. 检查 Dashboard API 地址是否正确
2. 检查浏览器控制台是否有网络错误（虽然我们静默处理了）
3. 确认用户钱包地址有值（address 不为 undefined）

### 数据重复
- 打开事件：同日同用户自动去重
- 交易事件：基于 txHash 自动去重

### 交易量为 0
- 如果不提供 amount 参数，交易量默认为 null
- 请在 trackTransaction 函数中传入第5个参数

## 支持

如有问题，请检查：
1. utils/track.js 文件是否正确复制
2. 参数是否正确传递
3. 网络连接是否正常
4. Dashboard 是否在线运行
