import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useShell } from '../components/AppShell'
import {
  subscribeEpisode,
  subscribeMonthEpisodes,
  subscribeMonthNotes,
  subscribeRecentEpisodes,
} from '../lib/data'
import type { DayNote, Episode } from '../lib/types'
import { cap, episodeSubtitle, episodeTitle, monthStats, sameDay, SEVERITY_LABEL } from '../lib/format'
import ConcludeSheet from './ConcludeSheet'

function todayEpisodeLine(e: Episode): string {
  const time = e.start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const status =
    e.end != null
      ? e.duration
        ? `concluso · ${e.duration}`
        : 'concluso'
      : e.duration != null
        ? e.duration
        : 'in corso'
  return [time, status, e.meds.join(', ')].filter(Boolean).join(' · ')
}

export default function Home() {
  const { user } = useAuth()
  const { openLog, openNote, lastLoggedId, clearLastLogged } = useShell()
  const [recent, setRecent] = useState<Episode[]>([])
  const [monthEpisodes, setMonthEpisodes] = useState<Episode[]>([])
  const [monthNotes, setMonthNotes] = useState<DayNote[]>([])
  const [concluding, setConcluding] = useState<Episode | null>(null)

  // Episodio appena inserito per una data NON di oggi: lo si evidenzia e lo si
  // mostra comunque, anche se cadrebbe fuori dagli "ultimi 3". Effimero.
  const [flashId, setFlashId] = useState<string | null>(null)
  const [flashEpisode, setFlashEpisode] = useState<Episode | null>(null)

  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    if (!user) return
    const u1 = subscribeRecentEpisodes(user.uid, 4, setRecent)
    const u2 = subscribeMonthEpisodes(user.uid, now.getFullYear(), now.getMonth(), setMonthEpisodes)
    const u3 = subscribeMonthNotes(user.uid, now.getFullYear(), now.getMonth(), setMonthNotes)
    return () => {
      u1()
      u2()
      u3()
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
    now.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  )

  const todayEpisodes = useMemo(() => {
    const base = monthEpisodes.filter((e) => sameDay(e.start, now))
    if (
      flashEpisode &&
      sameDay(flashEpisode.start, now) &&
      !base.some((e) => e.id === flashEpisode.id)
    ) {
      base.push(flashEpisode)
    }
    return base.sort((a, b) => b.start.getTime() - a.start.getTime())
  }, [monthEpisodes, flashEpisode, now])

  const todayNotes = useMemo(
    () => monthNotes.filter((n) => sameDay(n.date, now)),
    [monthNotes, now],
  )

  // "Ultimi episodi": esclude quelli di oggi (stanno nella card "Oggi")
  const listBase = recent.filter((e) => !sameDay(e.start, now))
  const list =
    flashEpisode &&
    !sameDay(flashEpisode.start, now) &&
    !listBase.some((e) => e.id === flashEpisode.id)
      ? [flashEpisode, ...listBase]
      : listBase

  const hasToday = todayEpisodes.length > 0 || todayNotes.length > 0

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

      <button type="button" className="note-btn" onClick={() => openNote()}>
        <span aria-hidden="true">✎</span> Annota qualcosa
      </button>

      {hasToday && (
        <div className="today-card">
          {todayEpisodes.map((e) => {
            const inProgress = e.end == null && e.duration == null
            return (
              <div key={e.id} className="today-ep">
                <button
                  type="button"
                  className="today-ep-main"
                  onClick={() => openLog(e.id)}
                >
                  <span className={`sev-dot sev-${e.severity ?? 'none'}`} aria-hidden="true" />
                  <span className="today-ep-txt">
                    <b>
                      {e.severity ? SEVERITY_LABEL[e.severity] : 'Episodio'}
                      {e.type ? ` · ${e.type}` : ''}
                    </b>
                    <p>{todayEpisodeLine(e)}</p>
                  </span>
                  <span className="chev" aria-hidden="true">
                    ›
                  </span>
                </button>
                {inProgress && (
                  <button
                    type="button"
                    className="today-ep-done"
                    onClick={() => setConcluding(e)}
                  >
                    Mi è passato
                  </button>
                )}
              </div>
            )
          })}

          {todayNotes.map((n) => (
            <button
              key={n.id}
              type="button"
              className="today-note"
              onClick={() => openNote(n.id)}
            >
              <span className="today-note-icon" aria-hidden="true">
                ✎
              </span>
              <span className="today-ep-txt">
                <b>{n.text || 'Nota'}</b>
                {n.tags.length > 0 && <p>{n.tags.join(' · ')}</p>}
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      )}

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

      {concluding && user && (
        <ConcludeSheet
          uid={user.uid}
          episode={concluding}
          onClose={() => setConcluding(null)}
        />
      )}
    </section>
  )
}
