import { useSyncExternalStore } from 'react'

// Tiny shared store for talking to AI professors.
//   aimed     professor id the crosshair is on (close enough to click), or null
//   open      professor id whose chat window is open, or null
//   speaking  true while the professor is "talking" (waiting for / showing a reply)
let state = { aimed: null, open: null, speaking: false }
const subs = new Set()
const set = (patch) => {
  const next = { ...state, ...patch }
  if (Object.keys(patch).every((k) => next[k] === state[k])) return
  state = next
  subs.forEach((f) => f())
}

export const talk = {
  get: () => state,
  setAimed: (id) => set({ aimed: id }),
  open: (id) => {
    if (document.pointerLockElement) document.exitPointerLock() // free the mouse for typing
    set({ open: id, aimed: null })
  },
  close: () => set({ open: null, speaking: false }),
  setSpeaking: (v) => set({ speaking: v }),
  subscribe: (f) => {
    subs.add(f)
    return () => subs.delete(f)
  },
}

export const useTalk = () => useSyncExternalStore(talk.subscribe, talk.get)

// Avatars that can chat. `id` matches the backend's professor id.
export const CHAT_PROFS = {
  'tauhid-zaman': {
    name: 'Prof. Tauhid Zaman',
    short: 'Prof. Zaman',
    course: 'MGT 409 · AI Foundations for Managers',
    hello: "Yo! Welcome to Evans 2200. Ask me anything: AI, stats, regression, the CLT, or what other classes are running this fall. Let's get it.",
  },
  'peter-schott': {
    name: 'Prof. Peter Schott',
    short: 'Prof. Schott',
    course: 'MGT 407 · Statistics (EMBA)',
    hello: "Duuude, welcome to 2210! Grab a seat. Stats, regression, p-values, the CLT, or which classes are running this fall: hit me. Let's make the data surf.",
  },
}

// true when the user is typing in a text box (so game hotkeys stay quiet)
export const typing = (e) => {
  const t = e.target
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}
