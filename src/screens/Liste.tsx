import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useDialog } from '../components/Dialog'
import { setProfileList, subscribeProfile } from '../lib/data'
import type { Profile } from '../lib/types'

const KINDS = {
  tipi: {
    field: 'types' as const,
    title: 'Tipi di mal di testa',
    add: 'Nuovo tipo',
    note: 'Rinominali in base a cosa ti ha detto il neurologo. Rinominare non tocca gli episodi già registrati con il nome vecchio.',
  },
  farmaci: {
    field: 'meds' as const,
    title: 'I miei farmaci',
    add: 'Nuovo farmaco',
    note: 'Compaiono qui man mano che li usi negli episodi.',
  },
  scatenanti: {
    field: 'triggers' as const,
    title: 'Cause scatenanti',
    add: 'Nuova causa',
    note: null as string | null,
  },
}

type Kind = keyof typeof KINDS

export default function Liste() {
  const { kind } = useParams<{ kind: string }>()
  const { user } = useAuth()
  const dialog = useDialog()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeProfile(user.uid, setProfile)
  }, [user])

  const config = kind && kind in KINDS ? KINDS[kind as Kind] : null
  if (!config) {
    return (
      <section className="screen">
        <Link to="/altro" className="back-btn">
          ‹ Altro
        </Link>
        <p className="placeholder">Lista non trovata.</p>
      </section>
    )
  }

  const items = profile ? profile[config.field] : []

  function save(next: string[]) {
    if (user) void setProfileList(user.uid, config!.field, next)
  }

  async function add() {
    const v = (await dialog.prompt({ message: config!.add }))?.trim()
    if (!v || items.includes(v)) return
    save([...items, v])
  }

  async function rename(item: string) {
    const v = (await dialog.prompt({ message: 'Rinomina', initial: item }))?.trim()
    if (!v || v === item) return
    save(items.map((x) => (x === item ? v : x)))
  }

  async function remove(item: string) {
    const ok = await dialog.confirm({
      message: `Eliminare «${item}»?`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) save(items.filter((x) => x !== item))
  }

  return (
    <section className="screen">
      <Link to="/altro" className="back-btn">
        ‹ Altro
      </Link>
      <h1 className="screen-title">{config.title}</h1>
      {config.note && <p className="screen-sub">{config.note}</p>}

      <ul className="edit-list">
        {items.map((item) => (
          <li key={item}>
            <button type="button" className="el-name" onClick={() => rename(item)}>
              {item}
            </button>
            <button
              type="button"
              className="el-del"
              onClick={() => remove(item)}
              aria-label={`Elimina ${item}`}
            >
              ✕
            </button>
          </li>
        ))}
        {profile && items.length === 0 && <li className="el-empty">Nessuna voce.</li>}
      </ul>

      <button type="button" className="el-add" onClick={add}>
        + {config.add}
      </button>
    </section>
  )
}
