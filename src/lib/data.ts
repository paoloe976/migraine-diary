/**
 * Unico punto di accesso ai dati dell'applicazione.
 *
 * Il resto del codice importa da qui e non conosce Firestore né Firebase Auth.
 * Cambiare backend un domani = riscrivere solo questo file.
 *
 * Struttura Firestore:
 *   users/{uid}                     -> profilo + liste (types, meds, triggers)
 *   users/{uid}/episodes/{id}       -> episodi
 */
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  Timestamp,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import type { Episode, EpisodePatch, Profile, Prophylaxis, ProphylaxisPatch } from './types'

// ============================ Auth ============================

export interface AuthUser {
  uid: string
  email: string | null
  name: string | null
}

const toAuthUser = (u: User | null): AuthUser | null =>
  u ? { uid: u.uid, email: u.email, name: u.displayName } : null

export function onAuthChange(cb: (user: AuthUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, (u) => cb(toAuthUser(u)))
}

export const signInWithGoogle = (): Promise<void> =>
  signInWithPopup(auth, new GoogleAuthProvider()).then(() => undefined)

export const signInWithEmail = (email: string, password: string): Promise<void> =>
  signInWithEmailAndPassword(auth, email, password).then(() => undefined)

export const registerWithEmail = (email: string, password: string): Promise<void> =>
  createUserWithEmailAndPassword(auth, email, password).then(() => undefined)

export const logout = (): Promise<void> => signOut(auth)

// ========================= Profilo ==========================

export const DEFAULT_TYPES = [
  'Emicrania senza aura',
  'Emicrania con aura',
  'Cefalea tensiva',
  'Cefalea a grappolo',
]

export const DEFAULT_TRIGGERS = [
  'Stress',
  'Poco sonno',
  'Pasto saltato',
  'Vino / alcol',
  'Meteo',
  'Mestruazioni',
  'Schermi a lungo',
  'Sforzo fisico',
]

const profileRef = (uid: string) => doc(db, 'users', uid)

/** Crea il doc profilo al primo accesso; fa il backfill dei trigger di base. */
export async function ensureUserDoc(u: AuthUser): Promise<void> {
  const ref = profileRef(u.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      email: u.email,
      name: u.name,
      createdAt: serverTimestamp(),
      types: DEFAULT_TYPES,
      meds: [],
      triggers: DEFAULT_TRIGGERS,
    })
    return
  }
  const d = snap.data()
  if (!Array.isArray(d.triggers) || d.triggers.length === 0) {
    await updateDoc(ref, { triggers: DEFAULT_TRIGGERS })
  }
}

export function subscribeProfile(uid: string, cb: (p: Profile) => void): Unsubscribe {
  return onSnapshot(profileRef(uid), (snap) => {
    const d = snap.data() ?? {}
    cb({
      types: d.types ?? DEFAULT_TYPES,
      meds: d.meds ?? [],
      triggers: d.triggers ?? DEFAULT_TRIGGERS,
    })
  })
}

export function addToProfileList(
  uid: string,
  field: keyof Profile,
  value: string,
): Promise<void> {
  return updateDoc(profileRef(uid), { [field]: arrayUnion(value) })
}

/** Sovrascrive l'intera lista (per le schermate di gestione). */
export function setProfileList(
  uid: string,
  field: keyof Profile,
  values: string[],
): Promise<void> {
  return updateDoc(profileRef(uid), { [field]: values })
}

// ========================= Episodi ==========================

const episodesCol = (uid: string) => collection(db, 'users', uid, 'episodes')
const episodeRef = (uid: string, id: string) => doc(db, 'users', uid, 'episodes', id)

const toDate = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null)

function toEpisode(snap: QueryDocumentSnapshot<DocumentData>): Episode {
  const d = snap.data()
  return {
    id: snap.id,
    start: toDate(d.start) ?? new Date(),
    end: toDate(d.end),
    severity: d.severity ?? null,
    duration: d.duration ?? null,
    type: d.type ?? null,
    painQuality: d.painQuality ?? [],
    meds: d.meds ?? [],
    medEfficacy: d.medEfficacy ?? null,
    symptoms: d.symptoms ?? [],
    headZones: d.headZones ?? [],
    laterality: d.laterality ?? null,
    disability: d.disability ?? null,
    triggers: d.triggers ?? [],
    notes: d.notes ?? '',
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  }
}

/**
 * Crea un episodio "vuoto" e ne restituisce subito l'id.
 * L'id è generato dal client e la scrittura NON è attesa: funziona offline,
 * Firestore la sincronizza appena torna la rete.
 */
export function createEpisode(uid: string, start: Date = new Date()): string {
  const ref = doc(episodesCol(uid))
  void setDoc(ref, {
    start: Timestamp.fromDate(start),
    end: null,
    severity: null,
    duration: null,
    type: null,
    painQuality: [],
    meds: [],
    medEfficacy: null,
    symptoms: [],
    headZones: [],
    laterality: null,
    disability: null,
    triggers: [],
    notes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function updateEpisode(uid: string, id: string, patch: EpisodePatch): Promise<void> {
  const data: DocumentData = { ...patch, updatedAt: serverTimestamp() }
  if (patch.start instanceof Date) data.start = Timestamp.fromDate(patch.start)
  if (patch.end instanceof Date) data.end = Timestamp.fromDate(patch.end)
  return updateDoc(episodeRef(uid, id), data)
}

export const deleteEpisode = (uid: string, id: string): Promise<void> =>
  deleteDoc(episodeRef(uid, id))

export function subscribeEpisode(
  uid: string,
  id: string,
  cb: (e: Episode | null) => void,
): Unsubscribe {
  return onSnapshot(episodeRef(uid, id), (snap) =>
    cb(snap.exists() ? toEpisode(snap as QueryDocumentSnapshot<DocumentData>) : null),
  )
}

export function subscribeRecentEpisodes(
  uid: string,
  count: number,
  cb: (episodes: Episode[]) => void,
): Unsubscribe {
  const q = query(episodesCol(uid), orderBy('start', 'desc'), limit(count))
  return onSnapshot(q, (s) => cb(s.docs.map(toEpisode)))
}

export function subscribeMonthEpisodes(
  uid: string,
  year: number,
  month0: number,
  cb: (episodes: Episode[]) => void,
): Unsubscribe {
  const from = Timestamp.fromDate(new Date(year, month0, 1))
  const to = Timestamp.fromDate(new Date(year, month0 + 1, 1))
  const q = query(
    episodesCol(uid),
    where('start', '>=', from),
    where('start', '<', to),
    orderBy('start', 'desc'),
  )
  return onSnapshot(q, (s) => cb(s.docs.map(toEpisode)))
}

export function subscribeEpisodesInRange(
  uid: string,
  from: Date,
  to: Date,
  cb: (episodes: Episode[]) => void,
): Unsubscribe {
  const q = query(
    episodesCol(uid),
    where('start', '>=', Timestamp.fromDate(from)),
    where('start', '<', Timestamp.fromDate(to)),
    orderBy('start', 'asc'),
  )
  return onSnapshot(q, (s) => cb(s.docs.map(toEpisode)))
}

/** Data del primo episodio in assoluto (per limitare lo scorrimento temporale). */
export async function getEarliestEpisodeDate(uid: string): Promise<Date | null> {
  const snap = await getDocs(query(episodesCol(uid), orderBy('start', 'asc'), limit(1)))
  const first = snap.docs[0]
  return first ? (toEpisode(first).start) : null
}

// ========================= Profilassi ==========================

const prophylaxisCol = (uid: string) => collection(db, 'users', uid, 'prophylaxis')
const prophylaxisRef = (uid: string, id: string) =>
  doc(db, 'users', uid, 'prophylaxis', id)

function toProphylaxis(snap: QueryDocumentSnapshot<DocumentData>): Prophylaxis {
  const d = snap.data()
  return {
    id: snap.id,
    drug: d.drug ?? '',
    cadence: d.cadence ?? 'giornaliera',
    start: toDate(d.start),
    end: toDate(d.end),
    note: d.note ?? '',
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  }
}

export function createProphylaxis(uid: string): string {
  const ref = doc(prophylaxisCol(uid))
  void setDoc(ref, {
    drug: '',
    cadence: 'giornaliera',
    start: null,
    end: null,
    note: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function updateProphylaxis(
  uid: string,
  id: string,
  patch: ProphylaxisPatch,
): Promise<void> {
  const data: DocumentData = { ...patch, updatedAt: serverTimestamp() }
  if (patch.start !== undefined) {
    data.start = patch.start ? Timestamp.fromDate(patch.start) : null
  }
  if (patch.end !== undefined) {
    data.end = patch.end ? Timestamp.fromDate(patch.end) : null
  }
  return updateDoc(prophylaxisRef(uid, id), data)
}

export const deleteProphylaxis = (uid: string, id: string): Promise<void> =>
  deleteDoc(prophylaxisRef(uid, id))

export function subscribeProphylaxis(
  uid: string,
  cb: (items: Prophylaxis[]) => void,
): Unsubscribe {
  return onSnapshot(prophylaxisCol(uid), (s) => cb(s.docs.map(toProphylaxis)))
}
