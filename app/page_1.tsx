'use client'
import { useEffect, useState, useCallback } from 'react'
import styles from './page.module.css'

const RANGE_OPTIONS = [
  { label: '1D', value: 1 },
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
]

const APP_COLORS = ['#3d6ef5', '#1fd4a0', '#8b5cf6', '#f0c040', '#ef4444', '#f97316', '#06b6d4', '#ec4899']

interface DayData { date: string; txns: number; newUsers: number; returningUsers: number }
interface AppData {
  app_id: string; app_name: string;
  total_txns: number; total_users: number;
  range_txns: number; range_users: number;
  range_new_users: number; range_returning: number;
  daily: DayData[]
}
interface Stats { apps: AppData[]; summary: { totalApps: number; totalTxns: number; totalUsers: number }; days: string[] }

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 44 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: '3px 3px 0 0',
          background: color,
          height: `${Math.max((v / max) * 100, v > 0 ? 8 : 3)}%`,
          opacity: i === data.length - 1 ? 1 : 0.45,
          transition: 'height 0.3s ease',
        }} />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [range, setRange] = useState(7)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [search, setSearch] = useState('')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?range=${range}`)
      const data = await res.json()
      setStats(data)
      setLastUpdated(new Date().toLocaleTimeString('zh-CN'))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { fetchStats() }, [fetchStats])

  // 每60秒自动刷新
  useEffect(() => {
    const t = setInterval(fetchStats, 60000)
    return () => clearInterval(t)
  }, [fetchStats])

  const filtered = stats?.apps.filter(a =>
    a.app_name.toLowerCase().includes(search.toLowerCase()) ||
    a.app_id.toLowerCase().includes(search.toLowerCase())
  ) || []

  const maxTxns = filtered[0]?.range_txns || 1

  return (
    <div className={styles.wrapper}>
      {/* Grid bg */}
      <div className={styles.gridBg} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <div className={styles.logoBadge}>B</div>
          <div>
            <h1 className={styles.title}>Attribution Monitor</h1>
            <p className={styles.subtitle}>Base Mini App 归因监控看板</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {lastUpdated && (
            <span className={styles.lastUpdated}>↻ {lastUpdated} 更新</span>
          )}
          <div className={styles.rangeTabs}>
            {RANGE_OPTIONS.map(r => (
              <button
                key={r.value}
                className={`${styles.rangeTab} ${range === r.value ? styles.rangeTabActive : ''}`}
                onClick={() => setRange(r.value)}
              >{r.label}</button>
            ))}
          </div>
          <button className={styles.refreshBtn} onClick={fetchStats} disabled={loading}>
            {loading ? '⟳' : '↻'} 刷新
          </button>
        </div>
      </header>

      {/* Summary cards */}
      <div className={styles.summaryGrid}>
        {[
          { label: 'TOTAL APPS', value: stats?.summary.totalApps ?? '—', accent: '#3d6ef5', icon: '⬡' },
          { label: 'TRANSACTIONS', value: stats?.summary.totalTxns.toLocaleString() ?? '—', accent: '#1fd4a0', icon: '⇄' },
          { label: 'USERS', value: stats?.summary.totalUsers.toLocaleString() ?? '—', accent: '#8b5cf6', icon: '◈' },
          { label: 'AVG TX/USER', value: stats && stats.summary.totalUsers > 0 ? (stats.summary.totalTxns / stats.summary.totalUsers).toFixed(1) : '—', accent: '#f0c040', icon: '◎' },
        ].map((card, i) => (
          <div key={i} className={styles.summaryCard} style={{ '--accent': card.accent } as React.CSSProperties}>
            <div className={styles.summaryIcon}>{card.icon}</div>
            <div className={styles.summaryLabel}>{card.label}</div>
            <div className={styles.summaryValue}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* App cards */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>📱 Mini Apps <span className={styles.count}>{filtered.length}</span></div>
        <input
          className={styles.searchInput}
          placeholder="搜索 App..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading && !stats ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <span>加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: 40, opacity: 0.3 }}>📭</div>
          <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 14 }}>
            {search ? '没有匹配的 App' : '暂无数据，等待 Mini App 上报第一笔交易'}
          </div>
        </div>
      ) : (
        <div className={styles.appsGrid}>
          {filtered.map((app, idx) => {
            const color = APP_COLORS[idx % APP_COLORS.length]
            const sparkData = app.daily.map(d => d.txns)
            const txPerUser = app.range_users > 0 ? (app.range_txns / app.range_users).toFixed(1) : '0'
            const statusLevel = app.range_users === 0 ? 'inactive' : app.range_users < 5 ? 'low' : 'active'

            return (
              <div key={app.app_id} className={styles.appCard} style={{ '--card-color': color, animationDelay: `${idx * 0.06}s` } as React.CSSProperties}>
                <div className={styles.appCardTop}>
                  <div className={styles.appIdBadge} style={{ background: color + '22', color }}>{app.app_id}</div>
                  <div className={`${styles.statusDot} ${styles['status_' + statusLevel]}`}>
                    <span className={styles.statusPulse} />
                    {statusLevel === 'active' ? '活跃' : statusLevel === 'low' ? '低活跃' : '无活动'}
                  </div>
                </div>

                <div className={styles.appName}>{app.app_name}</div>

                <div className={styles.metricsGrid}>
                  <div className={styles.metricBox}>
                    <div className={styles.metricLabel}>TRANSACTIONS</div>
                    <div className={styles.metricVal} style={{ color }}>{app.range_txns.toLocaleString()}</div>
                    <div className={styles.metricSub}>总计 {app.total_txns}</div>
                  </div>
                  <div className={styles.metricBox}>
                    <div className={styles.metricLabel}>USERS</div>
                    <div className={styles.metricVal}>{app.range_users.toLocaleString()}</div>
                    <div className={styles.metricSub}>tx/user: {txPerUser}</div>
                  </div>
                  <div className={styles.metricBox}>
                    <div className={styles.metricLabel}>FIRST TIME</div>
                    <div className={styles.metricVal} style={{ color: '#1fd4a0' }}>{app.range_new_users}</div>
                  </div>
                  <div className={styles.metricBox}>
                    <div className={styles.metricLabel}>RETURNING</div>
                    <div className={styles.metricVal} style={{ color: '#8b5cf6' }}>{app.range_returning}</div>
                  </div>
                </div>

                <div className={styles.sparkLabel}>{RANGE_OPTIONS.find(r => r.value === range)?.label} 交易趋势</div>
                <Sparkline data={sparkData} color={color} />
              </div>
            )
          })}
        </div>
      )}

      {/* Leaderboard */}
      {filtered.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>🏆 排行榜</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>按 {RANGE_OPTIONS.find(r=>r.value===range)?.label} 交易数降序</div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>APP</th>
                  <th>APP ID</th>
                  <th>交易数</th>
                  <th>用户数</th>
                  <th>新用户</th>
                  <th>回流</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app, i) => {
                  const color = APP_COLORS[i % APP_COLORS.length]
                  const pct = Math.round((app.range_txns / maxTxns) * 100)
                  return (
                    <tr key={app.app_id}>
                      <td>
                        <span className={styles.rankBadge} style={{
                          background: i === 0 ? '#f0c04022' : i === 1 ? '#94a3b822' : i === 2 ? '#f9731622' : 'var(--surface2)',
                          color: i === 0 ? '#f0c040' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : 'var(--muted)'
                        }}>{i + 1}</span>
                      </td>
                      <td><strong>{app.app_name}</strong></td>
                      <td><code className={styles.codeTag}>{app.app_id}</code></td>
                      <td><strong style={{ color }}>{app.range_txns.toLocaleString()}</strong></td>
                      <td>{app.range_users}</td>
                      <td style={{ color: '#1fd4a0' }}>{app.range_new_users}</td>
                      <td style={{ color: '#8b5cf6' }}>{app.range_returning}</td>
                      <td>
                        <div className={styles.barWrap}>
                          <div className={styles.barBg}>
                            <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 28 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <span>Base Attribution Monitor</span>
        <span>每60秒自动刷新 · 数据来自你的 Mini Apps 实时上报</span>
      </div>
    </div>
  )
}
