import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const kv = Redis.fromEnv()

function getDaysAgo(n: number): string[] {
  const days = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const range = parseInt(searchParams.get('range') || '7', 10)
    const days = getDaysAgo(range)
    const appIds = (await kv.smembers('apps')) as string[]

    if (!appIds || appIds.length === 0) {
      return NextResponse.json({
        apps: [],
        summary: { totalApps: 0, totalTxns: 0, totalUsers: 0, totalOpens: 0, totalVolume: 0 },
        days,
      })
    }

    const appData = await Promise.all(
      appIds.map(async (appId) => {
        const [name, txns, userCount, opens, volume] = await Promise.all([
          kv.get<string>(`app:${appId}:name`),
          kv.get<number>(`app:${appId}:txns`),
          kv.scard(`app:${appId}:users`),
          kv.get<number>(`app:${appId}:opens`),
          kv.get<number>(`app:${appId}:volume`),
        ])

        const dailyData = await Promise.all(
          days.map(async (day) => {
            const [dayTxns, newUsers, returningUsers, dayOpens, dayVolume] = await Promise.all([
              kv.get<number>(`app:${appId}:day:${day}:txns`),
              kv.scard(`app:${appId}:day:${day}:new_users`),
              kv.scard(`app:${appId}:day:${day}:returning_users`),
              kv.get<number>(`app:${appId}:day:${day}:opens`),
              kv.get<number>(`app:${appId}:day:${day}:volume`),
            ])

            return {
              date: day,
              txns: dayTxns || 0,
              newUsers: newUsers || 0,
              returningUsers: returningUsers || 0,
              opens: dayOpens || 0,
              volume: dayVolume || 0,
            }
          })
        )

        const rangeTxns = dailyData.reduce((sum, day) => sum + day.txns, 0)
        const rangeNewUsers = dailyData.reduce((sum, day) => sum + day.newUsers, 0)
        const rangeReturning = dailyData.reduce((sum, day) => sum + day.returningUsers, 0)
        const rangeOpens = dailyData.reduce((sum, day) => sum + day.opens, 0)
        const rangeVolume = dailyData.reduce((sum, day) => sum + day.volume, 0)

        return {
          app_id: appId,
          app_name: name || appId,
          total_txns: txns || 0,
          total_users: userCount || 0,
          total_opens: opens || 0,
          total_volume: volume || 0,
          range_txns: rangeTxns,
          range_new_users: rangeNewUsers,
          range_returning: rangeReturning,
          range_users: rangeNewUsers + rangeReturning,
          range_opens: rangeOpens,
          range_volume: rangeVolume,
          daily: dailyData,
        }
      })
    )

    appData.sort((a, b) => b.range_txns - a.range_txns)

    const summary = {
      totalApps: appData.length,
      totalTxns: appData.reduce((sum, app) => sum + app.range_txns, 0),
      totalUsers: appData.reduce((sum, app) => sum + app.range_users, 0),
      totalOpens: appData.reduce((sum, app) => sum + app.range_opens, 0),
      totalVolume: appData.reduce((sum, app) => sum + app.range_volume, 0),
    }

    return NextResponse.json({ apps: appData, summary, days })
  } catch (e) {
    console.error('Stats error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
