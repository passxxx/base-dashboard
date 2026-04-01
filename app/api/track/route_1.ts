import { kv } from '@vercel/kv'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { app_id, app_name, user_address, tx_hash, timestamp } = body

    if (!app_id || !user_address || !tx_hash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 防重复：同一个 tx_hash 只记一次
    const exists = await kv.get(`tx:${tx_hash}`)
    if (exists) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    const ts = timestamp || new Date().toISOString()
    const day = ts.slice(0, 10) // "2024-03-04"

    // 用管道批量写，提升性能
    const pipe = kv.pipeline()

    // 1. 记录这笔交易（防重用）
    pipe.set(`tx:${tx_hash}`, { app_id, app_name, user_address, day }, { ex: 60 * 60 * 24 * 100 })

    // 2. App 总交易数 +1
    pipe.incr(`app:${app_id}:txns`)

    // 3. App 日交易数 +1
    pipe.incr(`app:${app_id}:day:${day}:txns`)

    // 4. 记录 App 名字（用于展示）
    pipe.set(`app:${app_id}:name`, app_name)

    // 5. 全局 App 列表
    pipe.sadd('apps', app_id)

    // 6. 用户是否是新用户（该 App 维度）
    const isNewUser = !(await kv.sismember(`app:${app_id}:users`, user_address))
    pipe.sadd(`app:${app_id}:users`, user_address)
    if (isNewUser) {
      pipe.sadd(`app:${app_id}:day:${day}:new_users`, user_address)
    } else {
      pipe.sadd(`app:${app_id}:day:${day}:returning_users`, user_address)
    }

    await pipe.exec()

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Track error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// 允许跨域（Mini App 从其他域名上报）
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
