// utils/track.js
// ⚠️ 复制这个文件到每个 Mini App 项目的 utils/ 目录下
// 只需修改 DASHBOARD_API 为你的中央看板域名

const DASHBOARD_API = 'https://base-dashboard-zeta.vercel.app/api/track'

/**
 * 上报一笔交易到中央看板
 * @param {string} appId - 业务里的 App ID，允许重复，但不建议作为唯一标识
 * @param {string} appName - App 名称
 * @param {string} userAddress - 用户钱包地址
 * @param {string} txHash - 交易哈希
 * @param {number} amount - 交易量（可选）
 * @param {string} appKey - 推荐传入的全局唯一键，例如 'miniapp-signin-prod'
 */
export async function trackTransaction(appId, appName, userAddress, txHash, amount, appKey) {
  try {
    await fetch(DASHBOARD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'transaction',
        app_id: appId,
        app_name: appName,
        app_key: appKey || undefined,
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

/**
 * 上报 App 打开事件到中央看板
 * @param {string} appId - 业务里的 App ID
 * @param {string} appName - App 名称
 * @param {string} userAddress - 用户钱包地址
 * @param {string} appKey - 推荐传入的全局唯一键，例如 'miniapp-signin-prod'
 */
export async function trackAppOpen(appId, appName, userAddress, appKey) {
  try {
    await fetch(DASHBOARD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'open',
        app_id: appId,
        app_name: appName,
        app_key: appKey || undefined,
        user_address: userAddress?.toLowerCase(),
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // 静默失败，不影响主流程
  }
}
