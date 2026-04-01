import { NextRequest, NextResponse } from 'next/server'
import { kv } from '../../../utils/redis'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { app_id, app_name, user_address, type = 'transaction', tx_hash, amount, timestamp } = body

    if (!app_id || !user_address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'transaction' && !tx_hash) {
      return NextResponse.json({ error: 'Missing tx_hash for transaction' }, { status: 400 })
    }

    const ts = timestamp || new Date().toISOString()
    const day = ts.slice(0, 10)
    const pipe = kv.pipeline()

    if (type === 'transaction') {
      const exists = await kv.get(`tx:${tx_hash}`)
      if (exists) {
        return NextResponse.json({ ok: true, duplicate: true })
      }

      pipe.set(`tx:${tx_hash}`, { app_id, app_name, user_address, day }, { ex: 60 * 60 * 24 * 100 })
      pipe.incr(`app:${app_id}:txns`)
      pipe.incr(`app:${app_id}:day:${day}:txns`)

      if (amount && !isNaN(parseFloat(amount))) {
        const amountNum = parseFloat(amount)
        pipe.incrbyfloat(`app:${app_id}:volume`, amountNum)
        pipe.incrbyfloat(`app:${app_id}:day:${day}:volume`, amountNum)
      }
    } else if (type === 'open') {
      const openKey = `open:${app_id}:${user_address}:${day}`
      const isNewOpen = !(await kv.exists(openKey))

      if (isNewOpen) {
        pipe.set(openKey, 1, { ex: 60 * 60 * 24 * 100 })
        pipe.incr(`app:${app_id}:opens`)
        pipe.incr(`app:${app_id}:day:${day}:opens`)
      }
    }

    pipe.set(`app:${app_id}:name`, app_name)
    pipe.sadd('apps', app_id)

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
    return NextResponse.json(
      { error: 'Internal error', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
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
