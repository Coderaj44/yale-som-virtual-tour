import { useEffect, useRef, useState } from 'react'
import { CHAT_PROFS, talk } from './talk.js'

// Chat panel for an AI professor. Talks to the FastAPI backend (backend/main.py).
// In dev, Vite proxies /api to http://localhost:8000. Set VITE_API_URL to point elsewhere.
const API = import.meta.env.VITE_API_URL || ''
const OFFLINE = "Can't reach the professor backend. Start it with: cd backend && .venv/bin/uvicorn main:app --port 8000"

function sessionId() {
  try {
    let id = sessionStorage.getItem('som-chat-session')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('som-chat-session', id)
    }
    return id
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2)
  }
}

// tiny, safe markdown: escape everything, then **bold**, *italic*, `code`, bullet lines
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
function md(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\s*[-•]\s+(.*)$/gm, '<span class="li">• $1</span>')
    .replace(/\n/g, '<br>')
}

export default function ChatWindow({ profId, onClose }) {
  const prof = CHAT_PROFS[profId]
  const [msgs, setMsgs] = useState(() => [{ who: 'prof', text: prof.hello }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef()
  const listRef = useRef()
  const sid = useRef(sessionId())

  useEffect(() => inputRef.current?.focus(), [])
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  async function send(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setMsgs((m) => [...m, { who: 'me', text }])
    setBusy(true)
    talk.setSpeaking(true)
    try {
      const r = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professor_id: profId, session_id: sid.current, message: text }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.detail || OFFLINE) // no detail = the backend isn't there
      setMsgs((m) => [...m, { who: 'prof', text: data.reply }])
      // keep "talking" for a moment, roughly as long as it takes to read the reply aloud
      setTimeout(() => talk.setSpeaking(false), Math.min(6000, 600 + data.reply.length * 25))
    } catch (err) {
      setMsgs((m) => [...m, { who: 'err', text: err instanceof TypeError ? OFFLINE : err.message }])
      talk.setSpeaking(false)
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <div>
          <div className="chat-name">{prof.name}</div>
          <div className="chat-sub">{prof.course} · AI avatar</div>
        </div>
        <button className="chat-x" onClick={onClose} aria-label="Close chat">
          ✕
        </button>
      </div>
      <div className="chat-list" ref={listRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.who}`} dangerouslySetInnerHTML={{ __html: md(m.text) }} />
        ))}
        {busy && <div className="bubble prof typing">{prof.short} is typing<span>.</span><span>.</span><span>.</span></div>}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask ${prof.short} anything…`} maxLength={2000} />
        <button type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
      <div className="chat-foot">✕ to close and keep walking · Esc to close</div>
    </div>
  )
}
