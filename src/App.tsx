import { Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { DialogProvider } from './components/Dialog'
import AppShell from './components/AppShell'
import Login from './screens/Login'
import Home from './screens/Home'
import Calendario from './screens/Calendario'
import Andamento from './screens/Andamento'
import Altro from './screens/Altro'

function Gate() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="splash">Diario dell'emicrania</div>
  }
  if (!user) {
    return <Login />
  }
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/andamento" element={<Andamento />} />
        <Route path="/altro" element={<Altro />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <Gate />
      </DialogProvider>
    </AuthProvider>
  )
}
