import { useCallback, useState } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { createDayNote, createEpisode } from '../lib/data'
import TabBar from './TabBar'
import LogSheet from '../screens/LogSheet'
import NoteSheet from '../screens/NoteSheet'

interface OpenLog {
  id: string
  isNew: boolean
}

export interface ShellContext {
  /** Apre l'imbuto: senza id crea un episodio nuovo (ora), con id lo modifica. */
  openLog: (episodeId?: string) => void
  /** Crea un episodio nuovo con una data specifica (dal calendario). */
  openLogForDate: (date: Date) => void
  /** Apre l'editor nota: senza id ne crea una nuova (oggi), con id la modifica. */
  openNote: (noteId?: string) => void
  /** Crea una nota nuova per una data specifica (dal calendario). */
  openNoteForDate: (date: Date) => void
  /** Id dell'ultimo episodio NUOVO appena confermato (per il badge in home). */
  lastLoggedId: string | null
  clearLastLogged: () => void
}

export const useShell = (): ShellContext => useOutletContext<ShellContext>()

export default function AppShell() {
  const { user } = useAuth()
  const [log, setLog] = useState<OpenLog | null>(null)
  const [note, setNote] = useState<OpenLog | null>(null)
  const [lastLoggedId, setLastLoggedId] = useState<string | null>(null)

  const clearLastLogged = useCallback(() => setLastLoggedId(null), [])

  function closeLog(kept: boolean) {
    if (kept && log?.isNew) setLastLoggedId(log.id)
    setLog(null)
  }

  const openLog = useCallback(
    (episodeId?: string) => {
      if (!user) return
      setNote(null)
      if (episodeId) setLog({ id: episodeId, isNew: false })
      else setLog({ id: createEpisode(user.uid), isNew: true })
    },
    [user],
  )

  const openLogForDate = useCallback(
    (date: Date) => {
      if (!user) return
      setNote(null)
      const at = new Date(date)
      at.setHours(12, 0, 0, 0)
      setLog({ id: createEpisode(user.uid, at), isNew: true })
    },
    [user],
  )

  const openNote = useCallback(
    (noteId?: string) => {
      if (!user) return
      setLog(null)
      if (noteId) setNote({ id: noteId, isNew: false })
      else setNote({ id: createDayNote(user.uid), isNew: true })
    },
    [user],
  )

  const openNoteForDate = useCallback(
    (date: Date) => {
      if (!user) return
      setLog(null)
      setNote({ id: createDayNote(user.uid, date), isNew: true })
    },
    [user],
  )

  return (
    <div className="app">
      <main className="app-main">
        <Outlet
          context={
            {
              openLog,
              openLogForDate,
              openNote,
              openNoteForDate,
              lastLoggedId,
              clearLastLogged,
            } satisfies ShellContext
          }
        />
      </main>
      <TabBar />
      {log && user && (
        <LogSheet uid={user.uid} episodeId={log.id} isNew={log.isNew} onClose={closeLog} />
      )}
      {note && user && (
        <NoteSheet
          uid={user.uid}
          noteId={note.id}
          isNew={note.isNew}
          onClose={() => setNote(null)}
        />
      )}
    </div>
  )
}
