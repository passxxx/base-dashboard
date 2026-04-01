import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const kv = Redis.fromEnv()

function normalizePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
}

function buildAppKey(appId: string, appName?: string, explicitKey?: string) {
  if (explicitKey && explicitKey.trim()) {
    return explicitKey.trim().toLowerCase()
  }

  const normalizedId = normalizePart(appId)
  const normalizedName = normalizePart(appName || 'unknown-app')
  return `${normalizedId}__${normalizedName}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      app_id,
      app_name,
      app_key,
      user_address,
      type = 'transaction',
      tx_hash,
      amount,
      timestamp,
    } = body

    if (!app_id || !user_address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'transaction' && !tx_hash) {
      return NextResponse.json({ error: 'Missing tx_hash for transaction' }, { status: 400 })
    }

    const ts = timestamp || new Date().toISOString()
    const day = ts.slice(0, 10)
    const appKey = buildAppKey(app_id, app_name, app_key)
    const displayName = app_name || app_id
    const pipe = kv.pipeline()

    if (type === 'transaction') {
      const exists = await kv.get(`tx:${tx_hash}`)
      if (exists) {
        return NextResponse.json({ ok: true, duplicate: true })
      }

      pipe.set(
        `tx:${tx_hash}`,
        { app_id, app_name: displayName, app_key: appKey, user_address, day },
        { ex: 60 * 60 * 24 * 100 }
      )
      pipe.incr(`app:${appKey}:txns`)
      pipe.incr(`app:${appKey}:day:${day}:txns`)

      if (amount && !isNaN(parseFloat(amount))) {
        const amountNum = parseFloat(amount)
        pipe.incrbyfloat(`app:${appKey}:volume`, amountNum)
        pipe.incrbyfloat(`app:${appKey}:day:${day}:volume`, amountNum)
      }
    } else if (type === 'open') {
      const openKey = `open:${appKey}:${user_address}:${day}`
      const isNewOpen = !(await kv.exists(openKey))

      if (isNewOpen) {
        pipe.set(openKey, 1, { ex: 60 * 60 * 24 * 100 })
        pipe.incr(`app:${appKey}:opens`)
        pipe.incr(`app:${appKey}:day:${day}:opens`)
      }
    }

    pipe.set(`app:${appKey}:id`, app_id)
    pipe.set(`app:${appKey}:name`, displayName)
    pipe.sadd(`app:${appKey}:names`, displayName)
    pipe.sadd('apps', appKey)

    if (type === 'transaction') {
      const isNewUser = !(await kv.sismember(`app:${appKey}:users`, user_address))
      pipe.sadd(`app:${appKey}:users`, user_address)
      if (isNewUser) {
        pipe.sadd(`app:${appKey}:day:${day}:new_users`, user_address)
      } else {
        pipe.sadd(`app:${appKey}:day:${day}:returning_users`, user_address)
      }
    }

    await pipe.exec()

    return NextResponse.json({ ok: true, app_key: appKey })
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
