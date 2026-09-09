import { Outlet } from 'react-router-dom'

/** Guscio per le sotto-schermate (liste, profilassi, questionari):
 *  stessi margini dell'app, senza barra di navigazione. */
export default function PlainLayout() {
  return (
    <div className="app">
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
