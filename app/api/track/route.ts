import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const kv = Redis.fromEnv()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { app_id, app_name, user_address, tx_hash, timestamp } = body

    if (!app_id || !user_address || !tx_hash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const addr = user_address.toLowerCase()
    const ts = timestamp || new Date().toISOString()
    const day = ts.slice(0, 10)

    // 防重复：同一个 tx_hash 只记一次
    const txKey = `tx:${tx_hash}`
    const exists = await kv.get(txKey)
    if (exists) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    // 先判断用户是否已存在（在写入之前）
    const isNewUser = !(await kv.sismember(`app:${app_id}:users`, addr))

    // 批量写入
    const pipe = kv.pipeline()
    pipe.set(txKey, 1, { ex: 60 * 60 * 24 * 100 })
    pipe.incr(`app:${app_id}:txns`)
    pipe.incr(`app:${app_id}:day:${day}:txns`)
    pipe.set(`app:${app_id}:name`, app_name)
    pipe.sadd('apps', app_id)
    pipe.sadd(`app:${app_id}:users`, addr)

    if (isNewUser) {
      pipe.sadd(`app:${app_id}:day:${day}:new_users`, addr)
    } else {
      pipe.sadd(`app:${app_id}:day:${day}:returning_users`, addr)
    }

    await pipe.exec()

    return NextResponse.json({ ok: true, isNewUser })
  } catch (e) {
    console.error('Track error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
