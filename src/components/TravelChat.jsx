import { useState, useRef, useEffect } from 'react'
import { askGeminiChat } from '../utils/gemini'
import MarkdownResponse from './MarkdownResponse'

const QUICK_PROMPTS = [
  { label: '🛂 Visa tips', text: 'What are the visa requirements and entry tips I should know before going?' },
  { label: '💰 Money & ATMs', text: 'What currency is used, is it cash or card culture, and where are the best ATMs?' },
  { label: '🚌 Getting around', text: 'What are the best ways to get around? Public transport, taxis, apps to use?' },
  { label: '🍽️ Must-eat dishes', text: 'What are the absolute must-try local dishes and where should I eat them?' },
  { label: '🌡️ Best time to visit', text: 'When is the best time to visit and what should I know about the weather?' },
  { label: '⚠️ Safety & scams', text: 'What safety tips and common tourist scams should I be aware of?' },
  { label: '📦 What to pack', text: 'What should I pack specifically for this destination and the time of year?' },
  { label: '🤫 Hidden gems', text: 'What are some hidden gems and local secrets that most tourists miss?' },
]

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-klm-blue to-purple-500 flex items-center justify-center text-white text-sm flex-shrink-0">
        ✨
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 h-5">
          <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%]">
          <div className="bg-klm-blue text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
            {msg.text}
          </div>
          {msg.timestamp && (
            <p className="text-xs text-slate-400 text-right mt-1 pr-1">{msg.timestamp}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-klm-blue to-purple-500 flex items-center justify-center text-white text-xs flex-shrink-0 mb-1">
        ✨
      </div>
      <div className="max-w-[85%]">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <MarkdownResponse text={msg.text} />
        </div>
        {msg.timestamp && (
          <p className="text-xs text-slate-400 mt-1 pl-1">{msg.timestamp}</p>
        )}
      </div>
    </div>
  )
}

export default function TravelChat({ apiKey, chatPrompt, tripIdeas, onOpenSettings, messages, setMessages }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextTripId, setContextTripId] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const buildContextNote = () => {
    const trip = tripIdeas?.find((t) => t.id === contextTripId)
    if (!trip) return ''
    return `\n\n[Context: The user is planning a trip called "${trip.name}"${trip.duration ? `, ${trip.duration} days` : ''}${trip.months?.length ? `, in ${trip.months.join('/')}` : ''}${trip.regions?.length ? `, region: ${trip.regions.join(', ')}` : ''}${trip.notes ? `. Notes: ${trip.notes}` : ''}]`
  }

  const sendMessage = async (text) => {
    if (!text.trim()) return
    if (!apiKey?.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: '🔑 No API key found. Please open **Settings** (⚙️ in the top bar) and add your Gemini API key.',
          timestamp: now(),
        },
      ])
      return
    }

    const userMsg = { role: 'user', text: text.trim(), timestamp: now() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    // Build Gemini history format (all messages except new one)
    const history = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }))

    const contextNote = buildContextNote()
    const fullMessage = text.trim() + contextNote

    try {
      const reply = await askGeminiChat(apiKey, chatPrompt, history, fullMessage)
      setMessages((prev) => [...prev, { role: 'model', text: reply, timestamp: now() }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: `**Error:** ${err.message}`, timestamp: now() },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleClear = () => {
    if (window.confirm('Clear the entire chat history?')) setMessages([])
  }

  return (
    <div className="flex flex-col -mx-4 sm:-mx-6 -mt-6" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Chat header */}
      <div className="bg-gradient-to-r from-klm-dark to-klm-mid text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl">✨</div>
          <div>
            <h2 className="font-black text-base">Scout — Travel Companion</h2>
            <p className="text-xs text-white/70">Ask anything about travel · Context-aware · Remembers this session</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tripIdeas?.length > 0 && (
            <select
              className="text-xs bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1.5 focus:outline-none"
              value={contextTripId}
              onChange={(e) => setContextTripId(e.target.value)}
              title="Give Scout context about a trip"
            >
              <option value="">🗺️ No trip context</option>
              {tripIdeas.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="text-white/60 hover:text-white text-xs px-2 py-1 rounded transition-colors"
              title="Clear chat"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-0 bg-slate-50">

        {/* Welcome message */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-klm-blue to-purple-500 flex items-center justify-center text-3xl shadow-lg">
              ✈️
            </div>
            <div>
              <h3 className="text-xl font-black text-klm-dark">Hey, I'm Scout!</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">
                Your AI travel companion. Ask me anything — visa rules, where to eat, what to pack, hidden gems, transport tips… I'm here for it all.
              </p>
            </div>
            {!apiKey?.trim() && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                <span className="text-amber-800">Add your Gemini key first: </span>
                <button onClick={onOpenSettings} className="text-klm-blue font-semibold hover:underline">Open Settings →</button>
              </div>
            )}

            {/* Quick prompt showcase */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl w-full mt-2">
              {QUICK_PROMPTS.slice(0, 4).map((p) => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.text)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-klm-light hover:border-klm-blue transition-colors text-left"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render messages */}
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}
      </div>

      {/* Quick prompts row (shown when there are messages) */}
      {messages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 sm:px-6 py-2 bg-white border-t border-slate-100 flex-shrink-0 scrollbar-thin">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => sendMessage(p.text)}
              disabled={loading}
              className="flex-shrink-0 bg-slate-50 border border-slate-200 hover:bg-klm-light hover:border-klm-blue text-slate-700 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 border-t border-slate-200 bg-white px-4 sm:px-6 py-4 flex gap-3 items-end"
      >
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            rows={1}
            className="input resize-none overflow-hidden pr-4 leading-relaxed"
            placeholder="Ask me anything about travel… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // Auto-grow
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
                // Reset height
                e.target.style.height = 'auto'
              }
            }}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex-shrink-0 w-10 h-10 bg-klm-blue hover:bg-klm-mid text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? (
            <span className="animate-spin text-sm">⏳</span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}

function now() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
