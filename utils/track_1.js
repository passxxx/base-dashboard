// utils/track.js
// ⚠️ 复制这个文件到每个 Mini App 项目的 utils/ 目录下
// 只需修改 DASHBOARD_API 为你的中央看板域名

const DASHBOARD_API = 'https://你的看板域名.vercel.app/api/track'

/**
 * 上报一笔交易到中央看板
 * @param {string} appId - App唯一ID，如 'app-001'
 * @param {string} appName - App名称，如 '每日签到'
 * @param {string} userAddress - 用户钱包地址
 * @param {string} txHash - 交易哈希
 */
export async function trackTransaction(appId, appName, userAddress, txHash) {
  try {
    await fetch(DASHBOARD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: appId,
        app_name: appName,
        user_address: userAddress?.toLowerCase(),
        tx_hash: txHash,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // 埋点失败不阻断主流程，静默处理
  }
}
