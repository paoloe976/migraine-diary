import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useShell } from '../components/AppShell'
import {
  subscribeEpisode,
  subscribeMonthEpisodes,
  subscribeRecentEpisodes,
} from '../lib/data'
import type { Episode } from '../lib/types'
import { cap, episodeSubtitle, episodeTitle, monthStats } from '../lib/format'

export default function Home() {
  const { user } = useAuth()
  const { openLog, lastLoggedId, clearLastLogged } = useShell()
  const [recent, setRecent] = useState<Episode[]>([])
  const [monthEpisodes, setMonthEpisodes] = useState<Episode[]>([])

  // Episodio appena inserito: lo si evidenzia e lo si mostra comunque, anche
  // se una data insolita lo terrebbe fuori dagli "ultimi 3". Effimero: sparisce
  // uscendo dalla home (il componente si smonta e lo stato si perde).
  const [flashId, setFlashId] = useState<string | null>(null)
  const [flashEpisode, setFlashEpisode] = useState<Episode | null>(null)

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

  useEffect(() => {
    if (lastLoggedId) {
      setFlashId(lastLoggedId)
      clearLastLogged()
    }
  }, [lastLoggedId, clearLastLogged])

  useEffect(() => {
    if (!user || !flashId) {
      setFlashEpisode(null)
      return
    }
    return subscribeEpisode(user.uid, flashId, setFlashEpisode)
  }, [user, flashId])

  const stats = monthStats(monthEpisodes)
  const monthName = cap(now.toLocaleDateString('it-IT', { month: 'long' }))
  const today = cap(
    now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
  )

  // lista mostrata: se l'episodio flash non è già tra i recenti, lo si mette in cima
  const list =
    flashEpisode && !recent.some((e) => e.id === flashEpisode.id)
      ? [flashEpisode, ...recent]
      : recent

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

      {list.length > 0 && (
        <>
          <p className="section-label">Ultimi episodi</p>
          {list.map((e) => {
            const isFlash = e.id === flashId
            return (
              <button
                key={e.id}
                type="button"
                className={`episode${isFlash ? ' is-flash' : ''}`}
                onClick={() => openLog(e.id)}
              >
                <span className={`sev-dot sev-${e.severity ?? 'none'}`} aria-hidden="true" />
                <span className="ep-main">
                  <b>
                    {episodeTitle(e)}
                    {isFlash && <span className="ep-badge">appena inserito</span>}
                  </b>
                  <p>{episodeSubtitle(e)}</p>
                </span>
                <span className="chev" aria-hidden="true">
                  ›
                </span>
              </button>
            )
          })}
        </>
      )}
    </section>
  )
}
