import { Redis } from '@upstash/redis'
const kv = Redis.fromEnv()
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { app_id, app_name, user_address, type = 'transaction', tx_hash, amount, timestamp } = body

    if (!app_id || !user_address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 交易类型必须提供 tx_hash；打开类型可选
    if (type === 'transaction' && !tx_hash) {
      return NextResponse.json({ error: 'Missing tx_hash for transaction' }, { status: 400 })
    }

    const ts = timestamp || new Date().toISOString()
    const day = ts.slice(0, 10) // "2024-03-04"

    // 用管道批量写，提升性能
    const pipe = kv.pipeline()

    if (type === 'transaction') {
      // 防重复：同一个 tx_hash 只记一次
      const exists = await kv.get(`tx:${tx_hash}`)
      if (exists) {
        return NextResponse.json({ ok: true, duplicate: true })
      }

      // 1. 记录这笔交易（防重用）
      pipe.set(`tx:${tx_hash}`, { app_id, app_name, user_address, day }, { ex: 60 * 60 * 24 * 100 })

      // 2. App 总交易数 +1
      pipe.incr(`app:${app_id}:txns`)

      // 3. App 日交易数 +1
      pipe.incr(`app:${app_id}:day:${day}:txns`)

      // 4. 记录交易量（如果提供了 amount）
      if (amount && !isNaN(parseFloat(amount))) {
        const amountNum = parseFloat(amount)
        pipe.incrbyfloat(`app:${app_id}:volume`, amountNum)
        pipe.incrbyfloat(`app:${app_id}:day:${day}:volume`, amountNum)
      }
    } else if (type === 'open') {
      // 1. 记录打开事件（防重用：同个用户同日只计一次）
      const openKey = `open:${app_id}:${user_address}:${day}`
      const isNewOpen = !(await kv.exists(openKey))
      
      if (isNewOpen) {
        pipe.set(openKey, 1, { ex: 60 * 60 * 24 * 100 })
        // 2. App 总打开数 +1
        pipe.incr(`app:${app_id}:opens`)
        // 3. App 日打开数 +1
        pipe.incr(`app:${app_id}:day:${day}:opens`)
      }
    }

    // 4. 记录 App 名字（用于展示）
    pipe.set(`app:${app_id}:name`, app_name)

    // 5. 全局 App 列表
    pipe.sadd('apps', app_id)

    // 6. 用户是否是新用户（该 App 维度）
    if (type === 'transaction') {
      const isNewUser = !(await kv.sismember(`app:${app_id}:users`, user_address))
      pipe.sadd(`app:${app_id}:users`, user_address)
      if (isNewUser) {
        pipe.sadd(`app:${app_id}:day:${day}:new_users`, user_address)
      } else {
        pipe.sadd(`app:${app_id}:day:${day}:returning_users`, user_address)
      }
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
