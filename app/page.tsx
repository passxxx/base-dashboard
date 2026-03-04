'use client'
import { useEffect, useState, useCallback } from 'react'

const RANGE_OPTIONS = [
  { label: '1D', value: 1 },
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
]

const COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ca8a04', '#dc2626', '#ea580c', '#0891b2', '#db2777']

interface DayData { date: string; txns: number; newUsers: number; returningUsers: number }
interface AppData {
  app_id: string; app_name: string
  total_txns: number; total_users: number
  range_txns: number; range_users: number
  range_new_users: number; range_returning: number
  daily: DayData[]
}
interface Stats {
  apps: AppData[]
  summary: { totalApps: number; totalTxns: number; totalUsers: number }
  days: string[]
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32, marginTop: 4 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 2, background: color,
          height: `${Math.max((v / max) * 100, v > 0 ? 10 : 4)}%`,
          opacity: i === data.length - 1 ? 1 : 0.25,
        }} />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [range, setRange] = useState(7)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [search, setSearch] = useState('')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?range=${range}`)
      const data = await res.json()
      setStats(data.error
        ? { apps: [], summary: { totalApps: 0, totalTxns: 0, totalUsers: 0 }, days: [] }
        : data
      )
      setLastUpdated(new Date().toLocaleTimeString('zh-CN'))
    } catch {
      setStats({ apps: [], summary: { totalApps: 0, totalTxns: 0, totalUsers: 0 }, days: [] })
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => {
    const t = setInterval(fetchStats, 60000)
    return () => clearInterval(t)
  }, [fetchStats])

  const filtered = (stats?.apps || []).filter(a =>
    a.app_name.toLowerCase().includes(search.toLowerCase()) ||
    a.app_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif" }}>

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#2563eb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>B</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Base 归因监控</span>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>|</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Mini App Dashboard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && <span style={{ fontSize: 12, color: '#94a3b8' }}>更新于 {lastUpdated}</span>}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
              {RANGE_OPTIONS.map(r => (
                <button key={r.value} onClick={() => setRange(r.value)} style={{
                  padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  background: range === r.value ? '#fff' : 'transparent',
                  color: range === r.value ? '#0f172a' : '#94a3b8',
                  boxShadow: range === r.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.12s',
                }}>{r.label}</button>
              ))}
            </div>
            <button onClick={fetchStats} disabled={loading} style={{
              padding: '6px 14px', borderRadius: 7, border: '1px solid #e2e8f0',
              background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer', transition: 'all 0.12s',
            }}>↻ 刷新</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px' }}>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: '监控 App 数', value: stats?.summary.totalApps ?? '—', unit: '个', border: '#2563eb' },
            { label: '总交易数', value: stats?.summary.totalTxns.toLocaleString() ?? '—', unit: '笔', border: '#16a34a' },
            { label: '总用户数', value: stats?.summary.totalUsers.toLocaleString() ?? '—', unit: '人', border: '#9333ea' },
            {
              label: '平均交易/用户',
              value: stats && stats.summary.totalUsers > 0 ? (stats.summary.totalTxns / stats.summary.totalUsers).toFixed(1) : '—',
              unit: '次', border: '#ca8a04'
            },
          ].map((c, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '18px 22px', border: '1px solid #e2e8f0', borderTop: `3px solid ${c.border}` }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, fontWeight: 500 }}>{c.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>{c.value}</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{c.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
              Mini App 列表
              <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 400, background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>{filtered.length}</span>
            </div>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索 App 名称 / ID..."
              style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none', width: 200, background: '#f8fafc' }}
            />
          </div>

          {loading && !stats ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>加载中...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              {search ? '没有匹配的 App' : '暂无数据 · 等待 Mini App 上报第一笔交易'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'App 名称', 'App ID', `交易数 (${RANGE_OPTIONS.find(r=>r.value===range)?.label})`, '用户数', '新用户', '回流用户', '趋势图'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', fontWeight: 500, textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app, i) => {
                    const color = COLORS[i % COLORS.length]
                    return (
                      <tr key={app.app_id}
                        style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <td style={{ padding: '14px 16px', width: 48 }}>
                          <span style={{
                            width: 26, height: 26, borderRadius: 6,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700,
                            background: i===0?'#fef9c3':i===1?'#f1f5f9':i===2?'#fff7ed':'#f8fafc',
                            color: i===0?'#a16207':i===1?'#64748b':i===2?'#c2410c':'#94a3b8',
                          }}>{i+1}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                            <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{app.app_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <code style={{ fontSize: 12, background: '#f1f5f9', padding: '3px 8px', borderRadius: 5, color: '#64748b' }}>{app.app_id}</code>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color }}>{app.range_txns.toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>/ {app.total_txns} 总</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{app.range_users}</td>
                        <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#16a34a' }}>+{app.range_new_users}</td>
                        <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#9333ea' }}>{app.range_returning}</td>
                        <td style={{ padding: '14px 16px', width: 90 }}>
                          <Sparkline data={app.daily.map(d => d.txns)} color={color} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1' }}>
          <span>Base Attribution Monitor · 每60秒自动刷新</span>
          <span>本看板数据与 base.dev 官方数据相互独立</span>
        </div>
      </div>
    </div>
  )
}
