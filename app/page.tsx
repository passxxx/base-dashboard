'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './page.module.css'

const RANGE_OPTIONS = [
  { label: '1天', value: 1 },
  { label: '7天', value: 7 },
  { label: '30天', value: 30 },
  { label: '90天', value: 90 },
]

interface DayData {
  date: string
  txns: number
  newUsers: number
  returningUsers: number
  opens: number
  volume: number
}

interface AppData {
  app_id: string
  app_name: string
  total_txns: number
  total_users: number
  total_opens: number
  total_volume: number
  range_txns: number
  range_users: number
  range_new_users: number
  range_returning: number
  range_opens: number
  range_volume: number
  daily: DayData[]
}

interface Stats {
  apps: AppData[]
  summary: {
    totalApps: number
    totalTxns: number
    totalUsers: number
    totalOpens: number
    totalVolume: number
  }
  days: string[]
}

const EMPTY_STATS: Stats = {
  apps: [],
  summary: {
    totalApps: 0,
    totalTxns: 0,
    totalUsers: 0,
    totalOpens: 0,
    totalVolume: 0,
  },
  days: [],
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)

  return (
    <div className={styles.sparkline} aria-hidden="true">
      {data.map((value, index) => (
        <span
          key={`${index}-${value}`}
          className={styles.sparkBar}
          style={{ height: `${Math.max((value / max) * 100, value > 0 ? 12 : 4)}%` }}
        />
      ))}
    </div>
  )
}

function formatNumber(value: number) {
  return value.toLocaleString('zh-CN')
}

function formatVolume(value: number) {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  })
}

function getStatus(users: number) {
  if (users === 0) return '无活跃'
  if (users < 5) return '较低'
  return '活跃'
}

export default function Dashboard() {
  const [range, setRange] = useState(7)
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)

      try {
        const res = await fetch(`/api/stats?range=${range}`)
        const data = await res.json()
        setStats(data.error ? EMPTY_STATS : data)
        setLastUpdated(
          new Date().toLocaleString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )
      } catch (error) {
        console.error(error)
        setStats(EMPTY_STATS)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const timer = window.setInterval(fetchStats, 60000)
    return () => window.clearInterval(timer)
  }, [range])

  const filteredApps = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return stats.apps

    return stats.apps.filter((app) => {
      return (
        app.app_name.toLowerCase().includes(keyword) ||
        app.app_id.toLowerCase().includes(keyword)
      )
    })
  }, [search, stats.apps])

  const selectedApp = useMemo(() => {
    return filteredApps.find((app) => app.app_id === selectedAppId) ?? null
  }, [filteredApps, selectedAppId])

  useEffect(() => {
    if (!selectedAppId) return

    const stillExists = stats.apps.some((app) => app.app_id === selectedAppId)
    if (!stillExists) setSelectedAppId(null)
  }, [selectedAppId, stats.apps])

  const summaryCards = [
    { label: 'Mini App 数量', value: formatNumber(stats.summary.totalApps) },
    { label: '交易次数', value: formatNumber(stats.summary.totalTxns) },
    { label: '用户数', value: formatNumber(stats.summary.totalUsers) },
    { label: '打开次数', value: formatNumber(stats.summary.totalOpens) },
  ]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Base Mini App Dashboard</p>
          <h1 className={styles.title}>Mini App 归因数据看板</h1>
          <p className={styles.description}>
            首页只保留概览和列表，点击任意一行即可查看该 Mini App 的详细表现。
          </p>
        </div>
        <div className={styles.heroMeta}>
          <div className={styles.updatedLabel}>最近更新</div>
          <div className={styles.updatedValue}>{lastUpdated || '--:--:--'}</div>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.rangeTabs}>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={`${styles.rangeTab} ${range === option.value ? styles.rangeTabActive : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className={styles.searchWrap}>
          <span className={styles.searchLabel}>搜索</span>
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="按名称或 App ID 搜索"
          />
        </label>
      </section>

      <section className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <article key={card.label} className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{card.label}</div>
            <div className={styles.summaryValue}>{card.value}</div>
          </article>
        ))}
        <article className={`${styles.summaryCard} ${styles.summaryCardWide}`}>
          <div className={styles.summaryLabel}>交易金额</div>
          <div className={styles.summaryValue}>{formatVolume(stats.summary.totalVolume)}</div>
          <div className={styles.summaryHint}>
            人均交易 {stats.summary.totalUsers > 0 ? (stats.summary.totalTxns / stats.summary.totalUsers).toFixed(1) : '0.0'}
          </div>
        </article>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <div>
            <h2 className={styles.listTitle}>Mini App 列表</h2>
            <p className={styles.listSubtext}>共 {filteredApps.length} 个结果，点击行查看详情</p>
          </div>
        </div>

        {loading ? (
          <div className={styles.stateBox}>数据加载中...</div>
        ) : filteredApps.length === 0 ? (
          <div className={styles.stateBox}>{search ? '没有匹配的 Mini App。' : '当前还没有任何上报数据。'}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mini App</th>
                  <th>App ID</th>
                  <th>状态</th>
                  <th>交易</th>
                  <th>用户</th>
                  <th>打开</th>
                  <th>金额</th>
                  <th>趋势</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => (
                  <tr
                    key={app.app_id}
                    className={styles.clickableRow}
                    onClick={() => setSelectedAppId(app.app_id)}
                  >
                    <td>
                      <div className={styles.appName}>{app.app_name}</div>
                    </td>
                    <td>
                      <span className={styles.appId}>{app.app_id}</span>
                    </td>
                    <td>
                      <span className={styles.status}>{getStatus(app.range_users)}</span>
                    </td>
                    <td>{formatNumber(app.range_txns)}</td>
                    <td>{formatNumber(app.range_users)}</td>
                    <td>{formatNumber(app.range_opens)}</td>
                    <td>{formatVolume(app.range_volume)}</td>
                    <td>
                      <Sparkline data={app.daily.map((item) => item.txns)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedApp && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAppId(null)} role="presentation">
          <section
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-detail-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalKicker}>Mini App 详情</p>
                <h3 id="app-detail-title" className={styles.modalTitle}>{selectedApp.app_name}</h3>
                <p className={styles.modalId}>{selectedApp.app_id}</p>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setSelectedAppId(null)}>
                关闭
              </button>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>当前时间范围交易数</span>
                <strong className={styles.detailValue}>{formatNumber(selectedApp.range_txns)}</strong>
                <span className={styles.detailHint}>累计 {formatNumber(selectedApp.total_txns)}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>当前时间范围用户数</span>
                <strong className={styles.detailValue}>{formatNumber(selectedApp.range_users)}</strong>
                <span className={styles.detailHint}>累计 {formatNumber(selectedApp.total_users)}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>打开次数</span>
                <strong className={styles.detailValue}>{formatNumber(selectedApp.range_opens)}</strong>
                <span className={styles.detailHint}>累计 {formatNumber(selectedApp.total_opens)}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>交易金额</span>
                <strong className={styles.detailValue}>{formatVolume(selectedApp.range_volume)}</strong>
                <span className={styles.detailHint}>累计 {formatVolume(selectedApp.total_volume)}</span>
              </div>
            </div>

            <div className={styles.detailSplit}>
              <div className={styles.detailPanel}>
                <div className={styles.panelTitle}>用户构成</div>
                <div className={styles.metricRows}>
                  <div className={styles.metricRow}>
                    <span>新用户</span>
                    <strong>{formatNumber(selectedApp.range_new_users)}</strong>
                  </div>
                  <div className={styles.metricRow}>
                    <span>回流用户</span>
                    <strong>{formatNumber(selectedApp.range_returning)}</strong>
                  </div>
                  <div className={styles.metricRow}>
                    <span>人均交易</span>
                    <strong>
                      {selectedApp.range_users > 0
                        ? (selectedApp.range_txns / selectedApp.range_users).toFixed(1)
                        : '0.0'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className={styles.detailPanel}>
                <div className={styles.panelTitle}>最近趋势</div>
                <div className={styles.dailyList}>
                  {selectedApp.daily.map((day) => (
                    <div key={day.date} className={styles.dailyItem}>
                      <span>{formatDate(day.date)}</span>
                      <span>{formatNumber(day.txns)} 笔</span>
                      <span>{formatNumber(day.opens)} 次打开</span>
                      <span>{formatVolume(day.volume)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
