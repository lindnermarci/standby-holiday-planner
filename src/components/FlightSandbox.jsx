import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getStandbyStatus, getStatusStyles, formatRoute } from '../utils/standbyLogic'

const PLAN_LABELS = ['Plan A', 'Plan B', 'Plan C', 'Plan D', 'Plan E', 'Plan F']

const EMPTY_FORM = {
  flightNumber: '',
  origin: '',
  destination: '',
  date: '',
  departureTime: '',
  openSeats: '',
  standbyPax: '',
  notes: '',
}

function StatusBadge({ status, label }) {
  const styles = getStatusStyles(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${styles.badge}`}>
      <span className={`w-2 h-2 rounded-full ${styles.dot}`}></span>
      {label}
    </span>
  )
}

function FlightCard({ flight, index, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...flight })

  const standby = getStandbyStatus(flight.openSeats, flight.standbyPax)
  const styles = getStatusStyles(standby.status)
  const planLabel = PLAN_LABELS[index] ?? `Plan ${index + 1}`

  const handleSave = () => {
    onUpdate(flight.id, form)
    setEditing(false)
  }

  const handleCancel = () => {
    setForm({ ...flight })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="card p-4 border-2 border-klm-blue">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-klm-blue uppercase tracking-widest">{planLabel} — Editing</span>
        </div>
        <FlightForm
          form={form}
          setForm={setForm}
          onSubmit={handleSave}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    )
  }

  return (
    <div className={`card border-2 ${styles.border} overflow-hidden flex flex-col`}>
      {/* Card header with status color stripe */}
      <div className={`${styles.bg} px-4 py-3 flex items-center justify-between border-b ${styles.border}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{planLabel}</span>
        </div>
        <StatusBadge status={standby.status} label={standby.label} />
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Route */}
        <div>
          <div className="text-xl font-bold text-klm-dark tracking-wide">
            {formatRoute(flight.origin, flight.destination)}
          </div>
          <div className="text-sm font-semibold text-klm-blue mt-0.5">
            {flight.flightNumber || '—'}
          </div>
        </div>

        {/* Date / Time */}
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {flight.date && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">📅</span>
              <span>{new Date(flight.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
          {flight.departureTime && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">🕐</span>
              <span className="font-mono font-semibold">{flight.departureTime}</span>
            </div>
          )}
        </div>

        {/* Seat stats */}
        <div className={`rounded-lg p-3 ${styles.bg} border ${styles.border}`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-slate-800">{flight.openSeats || '—'}</div>
              <div className="text-xs text-slate-500">Open Seats</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{flight.standbyPax || '—'}</div>
              <div className="text-xs text-slate-500">Standby Pax</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${styles.text}`}>
                {flight.openSeats !== '' && flight.standbyPax !== '' ? standby.gap : '—'}
              </div>
              <div className="text-xs text-slate-500">Gap (need ≥2)</div>
            </div>
          </div>
          <p className={`text-xs mt-2 text-center font-medium ${styles.text}`}>
            {flight.openSeats !== '' && flight.standbyPax !== '' ? standby.description : 'Enter seat data above'}
          </p>
        </div>

        {/* Notes */}
        {flight.notes && (
          <p className="text-xs text-slate-500 italic bg-slate-50 rounded px-2 py-1.5">
            {flight.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="btn-secondary flex-1 text-sm py-1.5"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(flight.id)}
          className="btn-danger"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function FlightForm({ form, setForm, onSubmit, onCancel, submitLabel = 'Add Flight' }) {
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  const preview = (form.openSeats !== '' && form.standbyPax !== '')
    ? getStandbyStatus(form.openSeats, form.standbyPax)
    : null
  const previewStyles = preview ? getStatusStyles(preview.status) : null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Flight No.</label>
          <input className="input" name="flightNumber" placeholder="KL 0867" value={form.flightNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Origin (IATA)</label>
          <input className="input uppercase" name="origin" placeholder="AMS" maxLength={4} value={form.origin} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Destination (IATA)</label>
          <input className="input uppercase" name="destination" placeholder="NRT" maxLength={4} value={form.destination} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" name="date" value={form.date} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Departure</label>
          <input className="input" type="time" name="departureTime" value={form.departureTime} onChange={handleChange} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Notes</label>
          <input className="input" name="notes" placeholder="e.g. connections, visa check…" value={form.notes} onChange={handleChange} />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Seat Availability</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Open Seats (S)</label>
            <input className="input" type="number" min="0" name="openSeats" placeholder="12" value={form.openSeats} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Standby Pax (P)</label>
            <input className="input" type="number" min="0" name="standbyPax" placeholder="4" value={form.standbyPax} onChange={handleChange} required />
          </div>
        </div>

        {/* Live preview */}
        {preview && (
          <div className={`mt-3 rounded-lg px-3 py-2 border ${previewStyles.border} ${previewStyles.bg} flex items-center gap-2`}>
            <span className={`w-2.5 h-2.5 rounded-full ${previewStyles.dot} flex-shrink-0`}></span>
            <span className={`text-sm font-semibold ${previewStyles.text}`}>{preview.label}</span>
            <span className={`text-xs ${previewStyles.text} opacity-80`}>— {preview.description}</span>
          </div>
        )}
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

export default function FlightSandbox({ flights, setFlights }) {
  const [showForm, setShowForm] = useState(flights.length === 0)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const handleAddFlight = (formData) => {
    const newFlight = { ...formData, id: uuidv4() }
    setFlights((prev) => [...prev, newFlight])
    setForm({ ...EMPTY_FORM })
    setShowForm(false)
  }

  const handleDeleteFlight = (id) => {
    setFlights((prev) => prev.filter((f) => f.id !== id))
  }

  const handleUpdateFlight = (id, updatedData) => {
    setFlights((prev) => prev.map((f) => (f.id === id ? { ...f, ...updatedData } : f)))
  }

  const handleClearAll = () => {
    if (window.confirm('Remove all flights from the sandbox? This cannot be undone.')) {
      setFlights([])
      setShowForm(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <span>🛫</span> Flight Sandbox
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Compare up to {PLAN_LABELS.length} flight options side-by-side. Enter seat data to see your standby probability.
          </p>
        </div>
        <div className="flex gap-2">
          {!showForm && flights.length < PLAN_LABELS.length && (
            <button className="btn-primary text-sm" onClick={() => setShowForm(true)}>
              + Add Flight
            </button>
          )}
          {flights.length > 0 && (
            <button className="btn-secondary text-sm" onClick={handleClearAll}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { status: 'green', label: 'Safe Bet (gap > 5)' },
          { status: 'yellow', label: 'Risky (gap 2–5)' },
          { status: 'red', label: 'Not Recommended (gap < 2)' },
        ].map(({ status, label }) => {
          const s = getStatusStyles(status)
          return (
            <div key={status} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.badge}`}>
              <span className={`w-2 h-2 rounded-full ${s.dot}`}></span>
              {label}
            </div>
          )
        })}
        <div className="flex items-center gap-1.5 text-slate-500 ml-1">
          <span className="font-mono font-bold">Gap = S − P</span>
          <span className="text-slate-400">· need ≥ 2 for a couple</span>
        </div>
      </div>

      {/* Add Flight Form */}
      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-klm-dark flex items-center gap-2">
              <span className="text-klm-blue">+</span> Add a Flight to Compare
            </h3>
            {flights.length > 0 && (
              <button
                onClick={() => { setForm({ ...EMPTY_FORM }); setShowForm(false) }}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕ Cancel
              </button>
            )}
          </div>
          <FlightForm
            form={form}
            setForm={setForm}
            onSubmit={handleAddFlight}
            onCancel={flights.length > 0 ? () => setShowForm(false) : undefined}
          />
        </div>
      )}

      {/* Flight Cards Grid */}
      {flights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {flights.map((flight, idx) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              index={idx}
              onDelete={handleDeleteFlight}
              onUpdate={handleUpdateFlight}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {flights.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🛫</div>
          <p className="font-medium">No flights added yet</p>
          <p className="text-sm mt-1">Add your first flight option to get started</p>
          <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>
            Add First Flight
          </button>
        </div>
      )}
    </div>
  )
}
