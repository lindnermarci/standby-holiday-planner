import { useState, lazy, Suspense } from 'react'
import { askGeminiStructured, askGemini } from '../utils/gemini'
import { geocodePlaces, geocodePlace } from '../utils/geocode'
import MarkdownResponse from './MarkdownResponse'

// Lazy-load the map so Leaflet doesn't block initial render
const ActivityMap = lazy(() => import('./ActivityMap'))

const MARKER_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6']

const VIBES = [
  { id: 'nature', emoji: '🏔️', label: 'Nature', bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100', active: 'bg-emerald-500 border-emerald-500 text-white' },
  { id: 'culture', emoji: '🏛️', label: 'Culture', bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100', active: 'bg-amber-500 border-amber-500 text-white' },
  { id: 'food', emoji: '🍜', label: 'Food & Drink', bg: 'bg-orange-50 border-orange-200 hover:bg-orange-100', active: 'bg-orange-500 border-orange-500 text-white' },
  { id: 'beach', emoji: '🏖️', label: 'Beach & Water', bg: 'bg-sky-50 border-sky-200 hover:bg-sky-100', active: 'bg-sky-500 border-sky-500 text-white' },
  { id: 'arts', emoji: '🎭', label: 'Arts & Shows', bg: 'bg-purple-50 border-purple-200 hover:bg-purple-100', active: 'bg-purple-500 border-purple-500 text-white' },
  { id: 'wander', emoji: '🚶', label: 'Just Wander', bg: 'bg-slate-50 border-slate-200 hover:bg-slate-100', active: 'bg-slate-600 border-slate-600 text-white' },
  { id: 'adventure', emoji: '🧗', label: 'Adventure', bg: 'bg-red-50 border-red-200 hover:bg-red-100', active: 'bg-red-500 border-red-500 text-white' },
  { id: 'relax', emoji: '💆', label: 'Relax & Wellness', bg: 'bg-teal-50 border-teal-200 hover:bg-teal-100', active: 'bg-teal-500 border-teal-500 text-white' },
]

const DURATIONS = [
  { id: 'morning', label: '2-3 hrs', sub: 'Quick morning out' },
  { id: 'halfday', label: 'Half day', sub: '4-5 hours' },
  { id: 'fullday', label: 'Full day', sub: 'All day adventure' },
]

const COMPANIONS = [
  { id: 'couple', label: '💑 Just us two' },
  { id: 'solo', label: '🧍 Solo' },
  { id: 'group', label: '👥 Group' },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function todayFormatted() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function ActivityCard({ activity, index, focused, onClick }) {
  const color = MARKER_COLORS[index % MARKER_COLORS.length]
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onClick={() => { onClick(activity.id); setExpanded(true) }}
      className={`card cursor-pointer transition-all duration-200 overflow-hidden border-2 ${
        focused ? 'shadow-lg scale-[1.01]' : 'hover:shadow-md'
      }`}
      style={{ borderColor: focused ? color : 'transparent' }}
    >
      {/* Color top bar */}
      <div className="h-1.5 w-full" style={{ background: color }} />

      <div className="p-4">
        {/* Number + emoji + title */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shadow"
            style={{ background: color }}
          >
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-lg">{activity.vibeEmoji || '📍'}</span>
              <h4 className="font-bold text-slate-900 text-sm leading-tight">{activity.name}</h4>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 italic">{activity.tagline}</p>
          </div>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {activity.duration && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">⏱ {activity.duration}</span>
          )}
          {activity.distance && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">📍 {activity.distance}</span>
          )}
          {activity.difficulty && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activity.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
              activity.difficulty === 'Moderate' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>{activity.difficulty}</span>
          )}
          {activity.cost && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{activity.cost}</span>
          )}
          {!activity.coords && (
            <span className="text-xs bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full">📍 map unavailable</span>
          )}
        </div>

        {/* Why today */}
        {activity.whyToday && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-2 leading-relaxed mb-3">
            ✨ {activity.whyToday}
          </p>
        )}

        {/* Expandable highlights + tip */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x) }}
          className="text-xs font-semibold text-klm-blue hover:underline"
        >
          {expanded ? '▲ Less' : '▼ Details & tip'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {activity.highlights?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Highlights</p>
                <ul className="space-y-1">
                  {activity.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-slate-700 flex gap-1.5">
                      <span className="text-klm-blue flex-shrink-0">•</span> {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activity.tip && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                <p className="text-xs font-semibold text-amber-800 mb-0.5">Pro tip</p>
                <p className="text-xs text-amber-700">{activity.tip}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DailyExplorer({ apiKey, explorerPrompt, dayPlanPrompt, onOpenSettings, savedPlans, setSavedPlans }) {
  const [location, setLocation] = useState('')
  const [selectedVibes, setSelectedVibes] = useState([])
  const [duration, setDuration] = useState('halfday')
  const [companion, setCompanion] = useState('couple')
  const [extraContext, setExtraContext] = useState('')

  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [activities, setActivities] = useState([])
  const [greeting_text, setGreetingText] = useState('')
  const [mood_text, setMoodText] = useState('')
  const [focusedId, setFocusedId] = useState(null)
  const [error, setError] = useState(null)

  const [dayPlanLoading, setDayPlanLoading] = useState(false)
  const [dayPlan, setDayPlan] = useState(null)


  const toggleVibe = (id) =>
    setSelectedVibes((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id])

  const handleExplore = async () => {
    if (!apiKey?.trim()) { setError('Add your Gemini API key in Settings first.'); return }
    if (!location.trim()) { setError('Tell me where you are first.'); return }
    if (selectedVibes.length === 0) { setError('Pick at least one vibe.'); return }

    setLoading(true)
    setError(null)
    setActivities([])
    setDayPlan(null)
    setFocusedId(null)

    try {
      const vibeLabels = selectedVibes.map((v) => VIBES.find((x) => x.id === v)?.label).filter(Boolean).join(', ')
      const durationLabel = DURATIONS.find((d) => d.id === duration)?.label
      const msg = [
        `I'm in ${location.trim()} today (${todayFormatted()}).`,
        `Mood/vibe: ${vibeLabels}.`,
        `Available time: ${durationLabel}.`,
        `Traveling as: ${companion}.`,
        extraContext ? `Extra context: ${extraContext}` : '',
        `Please suggest 4 perfect activities. Make searchQuery extremely specific for geocoding.`,
        `Respond with ONLY the JSON object.`,
      ].filter(Boolean).join(' ')

      const data = await askGeminiStructured(apiKey, explorerPrompt, msg)
      setGreetingText(data.greeting || '')
      setMoodText(data.mood || '')

      const raw = data.options || []
      setLoading(false)
      setGeocoding(true)

      // Geocode each activity
      const queries = raw.map((a) => a.searchQuery || a.name)
      const coords = await geocodePlaces(queries)
      const hydrated = raw.map((a, i) => ({ ...a, coords: coords[i] }))
      setActivities(hydrated)
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
      setGeocoding(false)
    }
  }

  const handlePlanDay = async () => {
    if (!activities.length) return
    setDayPlanLoading(true)
    setDayPlan(null)
    try {
      const activityList = activities.map((a, i) =>
        `${i + 1}. ${a.name} (${a.duration || '?'}, ${a.distance || 'nearby'})`
      ).join('\n')
      const durationLabel = DURATIONS.find((d) => d.id === duration)?.label
      const msg = `Create a day plan for a ${companion} in ${location} with these activities:\n${activityList}\n\nAvailable time: ${durationLabel}. Include meal breaks and realistic travel time between spots.`
      const text = await askGemini(apiKey, dayPlanPrompt, msg)
      setDayPlan(text)
    } catch (err) {
      setDayPlan(`Error: ${err.message}`)
    } finally {
      setDayPlanLoading(false)
    }
  }

  const handleSave = () => {
    if (!activities.length) return
    const plan = {
      id: Date.now(),
      location,
      date: new Date().toLocaleDateString('en-GB'),
      vibes: selectedVibes,
      greeting: greeting_text,
      activities,
    }
    setSavedPlans((prev) => [plan, ...prev.slice(0, 9)])
  }

  const handleLoadPlan = (plan) => {
    setLocation(plan.location)
    setSelectedVibes(plan.vibes || [])
    setGreetingText(plan.greeting || '')
    setActivities(plan.activities || [])
    setDayPlan(null)
    setFocusedId(null)
  }

  const hasResults = activities.length > 0

  return (
    <div className="flex flex-col lg:flex-1 lg:overflow-hidden">
      {/* Hero greeting bar */}
      <div className="bg-gradient-to-r from-klm-dark via-klm-mid to-klm-blue text-white px-4 py-3 lg:px-6 lg:py-5 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg lg:text-2xl font-black tracking-tight">
                {greeting()}, traveller ✈️
              </h2>
              <p className="text-klm-light/80 text-xs lg:text-sm mt-0.5">{todayFormatted()} · Where does today take you?</p>
            </div>
            {savedPlans.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  className="text-sm bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
                  defaultValue=""
                  onChange={(e) => {
                    const plan = savedPlans.find((p) => String(p.id) === e.target.value)
                    if (plan) handleLoadPlan(plan)
                  }}
                >
                  <option value="" disabled>📂 Load saved exploration</option>
                  {savedPlans.map((p) => (
                    <option key={p.id} value={p.id}>{p.location} · {p.date}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main layout: sidebar + map */}
      <div className="flex flex-col lg:flex-1 lg:flex-row lg:overflow-hidden">

        {/* LEFT: Input panel */}
        <div className="lg:w-96 lg:flex-shrink-0 bg-white border-r border-slate-200 flex flex-col lg:overflow-hidden">
          <div className="p-5 space-y-5 lg:flex-1 lg:overflow-y-auto">

            {/* API key warning */}
            {!apiKey?.trim() && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-start gap-2">
                <span>🔑</span>
                <div>
                  <p className="font-semibold text-amber-800 text-xs">Gemini API key needed</p>
                  <button onClick={onOpenSettings} className="text-xs text-klm-blue hover:underline mt-0.5">Open Settings →</button>
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="label">📍 Where are you?</label>
              <input
                className="input text-base font-medium"
                placeholder="Amsterdam, Tokyo, Lisbon…"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExplore()}
              />
            </div>

            {/* Vibe picker */}
            <div>
              <label className="label">🎨 What's your vibe today?</label>
              <div className="grid grid-cols-2 gap-2">
                {VIBES.map((v) => {
                  const active = selectedVibes.includes(v.id)
                  return (
                    <button
                      key={v.id}
                      onClick={() => toggleVibe(v.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        active ? v.active : `${v.bg} text-slate-700 border-transparent`
                      }`}
                    >
                      <span className="text-lg">{v.emoji}</span>
                      <span className="text-xs leading-tight">{v.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="label">⏱ How long?</label>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDuration(d.id)}
                    className={`flex flex-col items-center px-2 py-2.5 rounded-xl border-2 text-center transition-all ${
                      duration === d.id
                        ? 'bg-klm-blue border-klm-blue text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold text-sm">{d.label}</span>
                    <span className="text-xs opacity-70 leading-tight mt-0.5">{d.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Companion */}
            <div>
              <label className="label">👥 Who's with you?</label>
              <div className="flex gap-2">
                {COMPANIONS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCompanion(c.id)}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                      companion === c.id
                        ? 'bg-klm-dark border-klm-dark text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra context */}
            <div>
              <label className="label">💬 Anything else? (optional)</label>
              <input
                className="input text-sm"
                placeholder="e.g. we love street food, avoid crowds, kids in tow…"
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleExplore}
              disabled={loading || geocoding || !apiKey?.trim()}
              className="w-full bg-gradient-to-r from-klm-blue to-klm-mid text-white font-bold py-3.5 rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Asking Gemini…</>
              ) : geocoding ? (
                <><span className="animate-spin">🗺️</span> Placing on map…</>
              ) : (
                <>✨ Explore {location ? location.split(',')[0] : 'Today'}!</>
              )}
            </button>

            {/* Activity cards (sidebar) */}
            {hasResults && (
              <div className="space-y-3 pt-2">
                {/* Greeting */}
                {greeting_text && (
                  <div className="bg-klm-light border border-klm-blue/20 rounded-xl px-3 py-3">
                    <p className="text-sm text-klm-dark font-medium">{greeting_text}</p>
                    {mood_text && <p className="text-xs text-slate-500 mt-1">{mood_text}</p>}
                  </div>
                )}

                {/* Cards */}
                {activities.map((a, i) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    index={i}
                    focused={focusedId === a.id}
                    onClick={setFocusedId}
                  />
                ))}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handlePlanDay}
                    disabled={dayPlanLoading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {dayPlanLoading ? <><span className="animate-spin">⏳</span> Planning…</> : <>📅 Plan my day</>}
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-secondary px-3 text-sm"
                    title="Save this exploration"
                  >
                    💾 Save
                  </button>
                </div>
              </div>
            )}

            {/* Day plan output */}
            {dayPlan && (
              <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                  <span>📅</span>
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Your Day Plan</span>
                </div>
                <MarkdownResponse text={dayPlan} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Map */}
        <div className="relative h-[300px] lg:flex-1 lg:h-auto bg-slate-100 overflow-hidden">
          {!hasResults && !loading && !geocoding && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-10 pointer-events-none">
              <div className="text-6xl mb-3">🗺️</div>
              <p className="font-semibold">Your activities will appear here</p>
              <p className="text-sm mt-1">Fill in your details and hit Explore</p>
            </div>
          )}
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-slate-400">Loading map…</div>}>
            <ActivityMap
              activities={activities}
              focusedId={focusedId}
              onSelect={setFocusedId}
              height="100%"
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
