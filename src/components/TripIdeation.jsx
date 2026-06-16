import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getStandbyStatus, getStatusStyles, formatRoute } from '../utils/standbyLogic'
import GeminiAdvisor from './GeminiAdvisor'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const REGIONS = [
  'Europe', 'North America', 'Latin America', 'Caribbean',
  'Middle East', 'Africa', 'South Asia', 'East Asia',
  'Southeast Asia', 'Oceania', 'Central Asia',
]

const EMPTY_IDEA_FORM = {
  name: '',
  duration: '',
  months: [],
  regions: [],
  notes: '',
  linkedFlightIds: [],
}

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false)

  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((x) => x !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input text-left flex items-center justify-between gap-2"
      >
        <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-800'}>
          {selected.length === 0
            ? placeholder
            : selected.length <= 3
            ? selected.join(', ')
            : `${selected.slice(0, 3).join(', ')} +${selected.length - 3}`}
        </span>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-klm-light cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-klm-blue"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function FlightLinker({ allFlights, linkedFlightIds, onChange }) {
  if (allFlights.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">
        No flights in sandbox yet. Add flights on the Flight Sandbox tab first.
      </p>
    )
  }

  const toggle = (id) => {
    if (linkedFlightIds.includes(id)) {
      onChange(linkedFlightIds.filter((x) => x !== id))
    } else {
      onChange([...linkedFlightIds, id])
    }
  }

  return (
    <div className="space-y-2">
      {allFlights.map((flight) => {
        const standby = getStandbyStatus(flight.openSeats, flight.standbyPax)
        const styles = getStatusStyles(standby.status)
        const checked = linkedFlightIds.includes(flight.id)
        return (
          <label
            key={flight.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
              checked
                ? `${styles.bg} ${styles.border}`
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(flight.id)}
              className="accent-klm-blue flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-slate-800">
                  {formatRoute(flight.origin, flight.destination)}
                </span>
                {flight.flightNumber && (
                  <span className="text-xs text-klm-blue font-medium">{flight.flightNumber}</span>
                )}
                {flight.date && (
                  <span className="text-xs text-slate-500">{flight.date}</span>
                )}
              </div>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${styles.badge}`}>
              {standby.label}
            </span>
          </label>
        )
      })}
    </div>
  )
}

function IdeaCard({ idea, allFlights, onDelete, onUpdate, apiKey, systemPrompt, onOpenSettings }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...idea })

  const linkedFlights = allFlights.filter((f) => idea.linkedFlightIds.includes(f.id))

  // Derive overall idea outlook from linked flights
  const outlook = linkedFlights.length === 0
    ? null
    : linkedFlights.reduce(
        (best, f) => {
          const s = getStandbyStatus(f.openSeats, f.standbyPax)
          return s.score > best.score ? s : best
        },
        { score: 0, status: 'red', label: 'Not Recommended' },
      )

  const outlookStyles = outlook ? getStatusStyles(outlook.status) : null

  if (editing) {
    return (
      <div className="card border-2 border-klm-blue p-5">
        <h4 className="font-bold text-klm-dark mb-4">Editing: {idea.name}</h4>
        <IdeaForm
          form={form}
          setForm={setForm}
          allFlights={allFlights}
          onSubmit={(data) => { onUpdate(idea.id, { ...data }); setEditing(false) }}
          onCancel={() => setEditing(false)}
          submitLabel="Save Changes"
        />
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Card header */}
      <div
        className={`px-4 py-3 flex items-start justify-between gap-3 cursor-pointer ${
          outlookStyles ? `${outlookStyles.bg} border-b ${outlookStyles.border}` : 'bg-slate-50 border-b border-slate-200'
        }`}
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-klm-dark truncate">{idea.name}</h4>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
            {idea.duration && <span>⏱ {idea.duration} days</span>}
            {idea.months.length > 0 && <span>📅 {idea.months.join(', ')}</span>}
            {idea.regions.length > 0 && <span>🌍 {idea.regions.join(', ')}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {outlook && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${outlookStyles.badge}`}>
              {outlook.label}
            </span>
          )}
          {linkedFlights.length > 0 && (
            <span className="text-xs bg-klm-light text-klm-mid px-2 py-0.5 rounded-full font-medium">
              {linkedFlights.length} flight{linkedFlights.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="p-4 space-y-4">
          {idea.notes && (
            <p className="text-sm text-slate-600 italic bg-slate-50 rounded px-3 py-2">{idea.notes}</p>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Linked Flights ({linkedFlights.length})
            </p>
            {linkedFlights.length === 0 ? (
              <p className="text-xs text-slate-400">No flights linked yet. Edit this idea to link sandbox flights.</p>
            ) : (
              <div className="space-y-2">
                {linkedFlights.map((flight) => {
                  const s = getStandbyStatus(flight.openSeats, flight.standbyPax)
                  const st = getStatusStyles(s.status)
                  return (
                    <div key={flight.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${st.border} ${st.bg}`}>
                      <div>
                        <span className="font-semibold text-sm">{formatRoute(flight.origin, flight.destination)}</span>
                        {flight.flightNumber && <span className="text-xs text-klm-blue ml-2">{flight.flightNumber}</span>}
                        {flight.date && <span className="text-xs text-slate-500 ml-2">{flight.date}</span>}
                        {flight.departureTime && <span className="text-xs text-slate-500 ml-1">at {flight.departureTime}</span>}
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.badge} flex-shrink-0`}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Gemini AI Advisor */}
          <GeminiAdvisor
            idea={idea}
            linkedFlights={linkedFlights}
            apiKey={apiKey}
            systemPrompt={systemPrompt}
            onOpenSettings={onOpenSettings}
            savedResponse={idea.savedResponse ?? null}
            savedResponseAt={idea.savedResponseAt ?? null}
            onSaveResponse={(text) =>
              onUpdate(idea.id, {
                savedResponse: text,
                savedResponseAt: text ? new Date().toISOString() : null,
              })
            }
          />

          <div className="flex gap-2 pt-1">
            <button className="btn-secondary flex-1 text-sm" onClick={() => setEditing(true)}>Edit Idea</button>
            <button className="btn-danger" onClick={() => onDelete(idea.id)}>Remove</button>
          </div>
        </div>
      )}
    </div>
  )
}

function IdeaForm({ form, setForm, allFlights, onSubmit, onCancel, submitLabel = 'Save Idea' }) {
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="label">Trip Name *</label>
          <input
            className="input"
            name="name"
            placeholder='e.g. "Japan in September"'
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="label">Duration (days)</label>
          <input
            className="input"
            type="number"
            min="1"
            name="duration"
            placeholder="14"
            value={form.duration}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="label">Notes / Conditions</label>
          <input
            className="input"
            name="notes"
            placeholder="Visa required, peak season, etc."
            value={form.notes}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="label">Possible Months</label>
          <MultiSelect
            options={MONTHS}
            selected={form.months}
            onChange={(v) => setForm((p) => ({ ...p, months: v }))}
            placeholder="Select months…"
          />
        </div>
        <div>
          <label className="label">Target Regions</label>
          <MultiSelect
            options={REGIONS}
            selected={form.regions}
            onChange={(v) => setForm((p) => ({ ...p, regions: v }))}
            placeholder="Select regions…"
          />
        </div>
      </div>

      <div>
        <label className="label">Link Flights from Sandbox</label>
        <FlightLinker
          allFlights={allFlights}
          linkedFlightIds={form.linkedFlightIds}
          onChange={(v) => setForm((p) => ({ ...p, linkedFlightIds: v }))}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">{submitLabel}</button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary px-6">Cancel</button>
        )}
      </div>
    </form>
  )
}

export default function TripIdeation({ tripIdeas, setTripIdeas, flights, apiKey, systemPrompt, onOpenSettings }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_IDEA_FORM })

  const handleAddIdea = (formData) => {
    const newIdea = { ...formData, id: uuidv4(), createdAt: new Date().toISOString() }
    setTripIdeas((prev) => [...prev, newIdea])
    setForm({ ...EMPTY_IDEA_FORM })
    setShowForm(false)
  }

  const handleDeleteIdea = (id) => {
    setTripIdeas((prev) => prev.filter((t) => t.id !== id))
  }

  const handleUpdateIdea = (id, data) => {
    setTripIdeas((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <span>🗺️</span> Trip Ideation
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Brainstorm destinations, set windows and durations, then link sandbox flights to evaluate standby outlooks.
          </p>
        </div>
        {!showForm && (
          <button className="btn-primary text-sm" onClick={() => setShowForm(true)}>
            + New Trip Idea
          </button>
        )}
      </div>

      {/* Hint if no flights */}
      {flights.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
          <span className="flex-shrink-0">💡</span>
          <span>
            You haven't added any flights to the sandbox yet. Go to the{' '}
            <strong>Flight Sandbox</strong> tab and add flights first — then you can link them to trip ideas here.
          </span>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-klm-dark">New Trip Idea</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
          </div>
          <IdeaForm
            form={form}
            setForm={setForm}
            allFlights={flights}
            onSubmit={handleAddIdea}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Idea cards */}
      {tripIdeas.length > 0 && (
        <div className="space-y-3">
          {tripIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              allFlights={flights}
              onDelete={handleDeleteIdea}
              onUpdate={handleUpdateIdea}
              apiKey={apiKey}
              systemPrompt={systemPrompt}
              onOpenSettings={onOpenSettings}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {tripIdeas.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🗺️</div>
          <p className="font-medium">No trip ideas yet</p>
          <p className="text-sm mt-1">Start brainstorming destinations and link your sandbox flights</p>
          <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>
            Create First Idea
          </button>
        </div>
      )}
    </div>
  )
}
