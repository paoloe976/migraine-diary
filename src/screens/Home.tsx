import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useShell } from '../components/AppShell'
import { subscribeMonthEpisodes, subscribeRecentEpisodes } from '../lib/data'
import type { Episode } from '../lib/types'
import { cap, episodeSubtitle, episodeTitle, monthStats } from '../lib/format'

export default function Home() {
  const { user } = useAuth()
  const { openLog } = useShell()
  const [recent, setRecent] = useState<Episode[]>([])
  const [monthEpisodes, setMonthEpisodes] = useState<Episode[]>([])

  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    if (!user) return
    const u1 = subscribeRecentEpisodes(user.uid, 3, setRecent)
    const u2 = subscribeMonthEpisodes(user.uid, now.getFullYear(), now.getMonth(), setMonthEpisodes)
    return () => {
      u1()
      u2()
    }
  }, [user, now])

  const stats = monthStats(monthEpisodes)
  const monthName = cap(now.toLocaleDateString('it-IT', { month: 'long' }))
  const today = cap(
    now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
  )

  return (
    <section className="screen">
      <h1 className="screen-title">Oggi</h1>
      <p className="screen-sub">{today}</p>

      <button type="button" className="log-btn" onClick={() => openLog()}>
        <span className="plus" aria-hidden="true">
          +
        </span>
        <span>
          Ho mal di testa
          <small>registra un episodio</small>
        </span>
      </button>

      <div className="card">
        <div className="month-row">
          <h2>{monthName}</h2>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <b>{stats.headacheDays}</b>
            <span>giorni con mal di testa</span>
          </div>
          <div className="stat">
            <b>{stats.medDays}</b>
            <span>giorni con farmaco</span>
          </div>
        </div>
      </div>

      {recent.length > 0 && (
        <>
          <p className="section-label">Ultimi episodi</p>
          {recent.map((e) => (
            <button key={e.id} type="button" className="episode" onClick={() => openLog(e.id)}>
              <span className={`sev-dot sev-${e.severity ?? 'none'}`} aria-hidden="true" />
              <span className="ep-main">
                <b>{episodeTitle(e)}</b>
                <p>{episodeSubtitle(e)}</p>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </>
      )}
    </section>
  )
}
