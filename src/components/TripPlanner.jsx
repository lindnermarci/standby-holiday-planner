import { useState } from 'react'
import { askGemini } from '../utils/gemini'
import { useLocalStorage } from '../hooks/useLocalStorage'
import MarkdownResponse from './MarkdownResponse'

const TRAVEL_STYLES = [
  { id: 'culture', emoji: '🏛️', label: 'Culture & History' },
  { id: 'food', emoji: '🍜', label: 'Food & Drink' },
  { id: 'nature', emoji: '🏔️', label: 'Nature & Outdoors' },
  { id: 'adventure', emoji: '🧗', label: 'Adventure' },
  { id: 'beach', emoji: '🏖️', label: 'Beach & Relaxation' },
  { id: 'art', emoji: '🎨', label: 'Art & Architecture' },
  { id: 'nightlife', emoji: '🎶', label: 'Nightlife & Music' },
  { id: 'offbeaten', emoji: '🗺️', label: 'Off the Beaten Path' },
]

const BUDGET_LEVELS = [
  { id: 'budget', label: '💸 Budget', sub: 'Hostels, street food, free sights' },
  { id: 'moderate', label: '💳 Moderate', sub: 'Mid-range hotels, restaurants' },
  { id: 'comfort', label: '✨ Comfortable', sub: 'Nice hotels, fine dining' },
]

const EMPTY_FORM = {
  destination: '',
  days: '',
  startDate: '',
  companion: 'couple',
  styles: [],
  budget: 'moderate',
  interests: '',
  avoids: '',
}

function SavedItineraryCard({ plan, onLoad, onDelete }) {
  return (
    <div className="card p-3 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-klm-dark truncate">{plan.destination}</p>
        <p className="text-xs text-slate-400">{plan.days} days · saved {plan.savedAt}</p>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => onLoad(plan)} className="btn-secondary text-xs py-1 px-2.5">Load</button>
        <button onClick={() => onDelete(plan.id)} className="btn-danger text-xs py-1 px-2">✕</button>
      </div>
    </div>
  )
}

export default function TripPlanner({ apiKey, plannerPrompt, onOpenSettings }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [loading, setLoading] = useState(false)
  const [itinerary, setItinerary] = useState(null)
  const [error, setError] = useState(null)
  const [savedItineraries, setSavedItineraries] = useLocalStorage('sbp_itineraries', [])
  const [showSaved, setShowSaved] = useState(false)

  const toggleStyle = (id) =>
    setForm((prev) => ({
      ...prev,
      styles: prev.styles.includes(id) ? prev.styles.filter((s) => s !== id) : [...prev.styles, id],
    }))

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleGenerate = async () => {
    if (!apiKey?.trim()) { setError('Add your Gemini API key in Settings first.'); return }
    if (!form.destination.trim()) { setError('Enter a destination.'); return }
    if (!form.days || form.days < 1) { setError('Enter number of days.'); return }

    setLoading(true)
    setError(null)
    setItinerary(null)

    try {
      const styleLabels = form.styles.map((s) => TRAVEL_STYLES.find((t) => t.id === s)?.label).filter(Boolean).join(', ')
      const budgetLabel = BUDGET_LEVELS.find((b) => b.id === form.budget)?.label

      const msg = [
        `Create a detailed ${form.days}-day itinerary for ${form.destination}.`,
        form.startDate ? `Starting: ${form.startDate}.` : '',
        `Traveling as: ${form.companion}.`,
        styleLabels ? `Travel style: ${styleLabels}.` : '',
        `Budget level: ${budgetLabel}.`,
        form.interests ? `Special interests: ${form.interests}.` : '',
        form.avoids ? `Please avoid: ${form.avoids}.` : '',
        `This couple flies on non-rev standby — they value flexibility and want to know the best things to do the moment they land.`,
        `Include at least one hidden gem per day.`,
      ].filter(Boolean).join(' ')

      const text = await askGemini(apiKey, plannerPrompt, msg)
      setItinerary(text)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!itinerary) return
    const plan = {
      id: Date.now(),
      destination: form.destination,
      days: form.days,
      savedAt: new Date().toLocaleDateString('en-GB'),
      form: { ...form },
      itinerary,
    }
    setSavedItineraries((prev) => [plan, ...prev.slice(0, 9)])
  }

  const handleLoad = (plan) => {
    setForm({ ...plan.form })
    setItinerary(plan.itinerary)
    setShowSaved(false)
  }

  const handleDelete = (id) => setSavedItineraries((prev) => prev.filter((p) => p.id !== id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <span>📅</span> Trip Planner
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Describe your dream trip — Gemini builds a full day-by-day itinerary tailored to you.
          </p>
        </div>
        <div className="flex gap-2">
          {savedItineraries.length > 0 && (
            <button
              className="btn-secondary text-sm flex items-center gap-1.5"
              onClick={() => setShowSaved((s) => !s)}
            >
              📂 Saved ({savedItineraries.length})
            </button>
          )}
        </div>
      </div>

      {/* Saved itineraries panel */}
      {showSaved && savedItineraries.length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Saved Itineraries</p>
          {savedItineraries.map((plan) => (
            <SavedItineraryCard key={plan.id} plan={plan} onLoad={handleLoad} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* API key warning */}
      {!apiKey?.trim() && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>🔑</span>
          <span className="text-amber-800">Gemini API key needed — </span>
          <button onClick={onOpenSettings} className="text-klm-blue font-semibold hover:underline">Open Settings</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form */}
        <div className="xl:col-span-2 space-y-5">
          <div className="card p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">🌍 Destination *</label>
                <input
                  className="input text-base font-medium"
                  name="destination"
                  placeholder="Kyoto, Japan"
                  value={form.destination}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">📅 Days *</label>
                <input
                  className="input"
                  name="days"
                  type="number"
                  min="1"
                  max="30"
                  placeholder="7"
                  value={form.days}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">🗓️ Start date</label>
                <input
                  className="input"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Travel style */}
            <div>
              <label className="label">🎨 Travel style</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TRAVEL_STYLES.map((s) => {
                  const active = form.styles.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleStyle(s.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        active
                          ? 'bg-klm-blue border-klm-blue text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span className="text-xs">{s.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="label">💳 Budget level</label>
              <div className="space-y-1.5">
                {BUDGET_LEVELS.map((b) => (
                  <label
                    key={b.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      form.budget === b.id
                        ? 'bg-klm-light border-klm-blue'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="budget"
                      value={b.id}
                      checked={form.budget === b.id}
                      onChange={handleChange}
                      className="accent-klm-blue"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{b.label}</p>
                      <p className="text-xs text-slate-500">{b.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Interests & avoids */}
            <div className="space-y-3">
              <div>
                <label className="label">❤️ Special interests</label>
                <input
                  className="input text-sm"
                  name="interests"
                  placeholder="e.g. Japanese gardens, ramen, manga, tea ceremony…"
                  value={form.interests}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">🚫 Please avoid</label>
                <input
                  className="input text-sm"
                  name="avoids"
                  placeholder="e.g. big crowds, tourist traps, museums…"
                  value={form.avoids}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !apiKey?.trim()}
              className="w-full bg-gradient-to-r from-klm-dark to-klm-mid text-white font-bold py-3.5 rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Building your itinerary…</>
              ) : (
                <>🗺️ Generate Itinerary</>
              )}
            </button>
          </div>
        </div>

        {/* Itinerary output */}
        <div className="xl:col-span-3">
          {!itinerary && !loading && (
            <div className="card h-full flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="font-semibold text-lg">Your itinerary will appear here</p>
              <p className="text-sm mt-1 text-center max-w-xs">
                Fill in the form and click Generate — Gemini will craft a detailed day-by-day plan
              </p>
            </div>
          )}

          {loading && (
            <div className="card p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-2/3"></div>
              <div className="h-4 bg-slate-100 rounded w-full"></div>
              <div className="h-4 bg-slate-100 rounded w-5/6"></div>
              <div className="h-5 bg-slate-100 rounded w-1/2 mt-4"></div>
              <div className="h-4 bg-slate-100 rounded w-full"></div>
              <div className="h-4 bg-slate-100 rounded w-4/5"></div>
              <div className="h-4 bg-slate-100 rounded w-full"></div>
              <div className="h-5 bg-slate-100 rounded w-1/2 mt-4"></div>
              <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-full"></div>
            </div>
          )}

          {itinerary && !loading && (
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-klm-dark to-klm-mid text-white px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg">{form.destination}</h3>
                  <p className="text-klm-light/80 text-xs">
                    {form.days} days · {BUDGET_LEVELS.find((b) => b.id === form.budget)?.label}
                    {form.styles.length > 0 && ` · ${form.styles.slice(0, 2).map((s) => TRAVEL_STYLES.find((t) => t.id === s)?.emoji).join('')}`}
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  💾 Save
                </button>
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                <MarkdownResponse text={itinerary} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
