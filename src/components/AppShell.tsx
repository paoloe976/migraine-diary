import { useCallback, useState } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { createEpisode } from '../lib/data'
import TabBar from './TabBar'
import LogSheet from '../screens/LogSheet'

interface OpenLog {
  id: string
  isNew: boolean
}

export interface ShellContext {
  /** Apre l'imbuto: senza id crea un episodio nuovo, con id lo modifica. */
  openLog: (episodeId?: string) => void
}

export const useShell = (): ShellContext => useOutletContext<ShellContext>()

export default function AppShell() {
  const { user } = useAuth()
  const [log, setLog] = useState<OpenLog | null>(null)

  const openLog = useCallback(
    (episodeId?: string) => {
      if (!user) return
      if (episodeId) setLog({ id: episodeId, isNew: false })
      else setLog({ id: createEpisode(user.uid), isNew: true })
    },
    [user],
  )

  return (
    <div className="app">
      <main className="app-main">
        <Outlet context={{ openLog } satisfies ShellContext} />
      </main>
      <TabBar />
      {log && user && (
        <LogSheet
          uid={user.uid}
          episodeId={log.id}
          isNew={log.isNew}
          onClose={() => setLog(null)}
        />
      )}
    </div>
  )
}
