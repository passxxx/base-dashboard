import { kv } from '@vercel/kv'
import { NextRequest, NextResponse } from 'next/server'

function getDaysAgo(n: number): string[] {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const range = parseInt(searchParams.get('range') || '7')
    const days = getDaysAgo(range)

    // 获取所有 App ID
    const appIds = await kv.smembers('apps') as string[]

    if (!appIds || appIds.length === 0) {
      return NextResponse.json({ apps: [], summary: { totalApps: 0, totalTxns: 0, totalUsers: 0 } })
    }

    // 并行拉取所有 App 数据
    const appData = await Promise.all(
      appIds.map(async (appId) => {
        const [name, txns, userCount] = await Promise.all([
          kv.get<string>(`app:${appId}:name`),
          kv.get<number>(`app:${appId}:txns`),
          kv.scard(`app:${appId}:users`),
        ])

        // 拉取每日数据（用于趋势图）
        const dailyData = await Promise.all(
          days.map(async (day) => {
            const [dayTxns, newUsers, returningUsers] = await Promise.all([
              kv.get<number>(`app:${appId}:day:${day}:txns`),
              kv.scard(`app:${appId}:day:${day}:new_users`),
              kv.scard(`app:${appId}:day:${day}:returning_users`),
            ])
            return {
              date: day,
              txns: dayTxns || 0,
              newUsers: newUsers || 0,
              returningUsers: returningUsers || 0,
            }
          })
        )

        // 范围内的交易数和用户数（从日数据汇总）
        const rangeTxns = dailyData.reduce((s, d) => s + d.txns, 0)
        const rangeNewUsers = dailyData.reduce((s, d) => s + d.newUsers, 0)
        const rangeReturning = dailyData.reduce((s, d) => s + d.returningUsers, 0)

        return {
          app_id: appId,
          app_name: name || appId,
          total_txns: txns || 0,
          total_users: userCount || 0,
          range_txns: rangeTxns,
          range_new_users: rangeNewUsers,
          range_returning: rangeReturning,
          range_users: rangeNewUsers + rangeReturning,
          daily: dailyData,
        }
      })
    )

    // 汇总
    const summary = {
      totalApps: appData.length,
      totalTxns: appData.reduce((s, a) => s + a.range_txns, 0),
      totalUsers: appData.reduce((s, a) => s + a.range_users, 0),
    }

    // 按交易数降序排列
    appData.sort((a, b) => b.range_txns - a.range_txns)

    return NextResponse.json({ apps: appData, summary, days })
  } catch (e) {
    console.error('Stats error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
