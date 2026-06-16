import { useRef, useState } from 'react'
import { getStandbyStatus, getStatusStyles, getStatusEmoji, formatRoute } from '../utils/standbyLogic'

const PLAN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

function PanicSheetPreview({ flights, selectedIds }) {
  const selectedFlights = flights.filter((f) => selectedIds.includes(f.id))

  if (selectedFlights.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <p className="text-lg">Select flights above to preview your Panic Sheet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {selectedFlights.map((flight, idx) => {
        const standby = getStandbyStatus(flight.openSeats, flight.standbyPax)
        const styles = getStatusStyles(standby.status)
        const planLabel = PLAN_LABELS[idx] ?? String(idx + 1)

        return (
          <div
            key={flight.id}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 ${styles.border} ${styles.bg}`}
          >
            {/* Plan label */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-current flex items-center justify-center font-black text-lg shadow-sm"
              style={{ color: standby.status === 'green' ? '#059669' : standby.status === 'yellow' ? '#d97706' : '#dc2626' }}>
              {planLabel}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {formatRoute(flight.origin, flight.destination)}
                </span>
                {flight.flightNumber && (
                  <span className="text-base font-bold text-klm-blue">{flight.flightNumber}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {flight.date && (
                  <span className="text-sm font-semibold text-slate-600">
                    {new Date(flight.date + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                  </span>
                )}
                {flight.departureTime && (
                  <span className="text-sm font-black font-mono text-slate-800">
                    {flight.departureTime}
                  </span>
                )}
                {flight.notes && (
                  <span className="text-xs text-slate-500 italic">{flight.notes}</span>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex-shrink-0 text-right">
              <div className="text-3xl">{getStatusEmoji(standby.status)}</div>
              <div className={`text-xs font-bold mt-1 ${styles.text}`}>{standby.label}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                {flight.openSeats !== '' && flight.standbyPax !== ''
                  ? `${flight.openSeats}S / ${flight.standbyPax}P`
                  : '—'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PanicSheet({ flights, tripIdeas }) {
  const previewRef = useRef(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  const toggleFlight = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => setSelectedIds(flights.map((f) => f.id))
  const clearAll = () => setSelectedIds([])

  const handleExportPDF = async () => {
    if (selectedIds.length === 0) {
      setExportMsg('Select at least one flight first.')
      return
    }
    setExporting(true)
    setExportMsg('')
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const element = previewRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save('standby-panic-sheet.pdf')
      setExportMsg('PDF saved!')
    } catch (err) {
      console.error(err)
      setExportMsg('Export failed — check console.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportImage = async () => {
    if (selectedIds.length === 0) {
      setExportMsg('Select at least one flight first.')
      return
    }
    setExporting(true)
    setExportMsg('')
    try {
      const html2canvas = (await import('html2canvas')).default

      const element = previewRef.current
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'standby-panic-sheet.png'
        a.click()
        URL.revokeObjectURL(url)
        setExportMsg('Image saved! Add to your camera roll.')
        setExporting(false)
      }, 'image/png')
    } catch (err) {
      console.error(err)
      setExportMsg('Export failed — check console.')
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="section-title flex items-center gap-2">
          <span>📋</span> Panic Sheet
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Select your backup flights and export a clean summary to save offline — perfect for checking at the gate.
        </p>
      </div>

      {flights.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-medium">No flights to export</p>
          <p className="text-sm mt-1">Add flights in the Flight Sandbox first, then come back here to generate your Panic Sheet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Flight selector */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-klm-dark text-sm">Select Flights to Include</h3>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-klm-blue hover:underline">All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={clearAll} className="text-xs text-slate-500 hover:underline">None</button>
                </div>
              </div>

              <div className="space-y-2">
                {flights.map((flight, idx) => {
                  const standby = getStandbyStatus(flight.openSeats, flight.standbyPax)
                  const styles = getStatusStyles(standby.status)
                  const checked = selectedIds.includes(flight.id)
                  return (
                    <label
                      key={flight.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? `${styles.bg} ${styles.border}`
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFlight(flight.id)}
                        className="accent-klm-blue flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800">
                          {formatRoute(flight.origin, flight.destination)}
                          {flight.flightNumber && (
                            <span className="text-xs text-klm-blue ml-2">{flight.flightNumber}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {[flight.date, flight.departureTime].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${styles.dot}`}></span>
                    </label>
                  )
                })}
              </div>

              <div className="border-t border-slate-100 mt-4 pt-4 space-y-2">
                <button
                  onClick={handleExportPDF}
                  disabled={exporting || selectedIds.length === 0}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span>📄</span>
                  )}
                  Export as PDF
                </button>
                <button
                  onClick={handleExportImage}
                  disabled={exporting || selectedIds.length === 0}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span>🖼️</span>
                  )}
                  Export as Image (Camera Roll)
                </button>
                {exportMsg && (
                  <p className={`text-xs text-center font-medium mt-1 ${exportMsg.includes('failed') || exportMsg.includes('Select') ? 'text-red-500' : 'text-emerald-600'}`}>
                    {exportMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status Legend</p>
              <div className="space-y-2 text-sm">
                {[
                  { status: 'green', label: 'Safe Bet', desc: 'Gap > 5 — go for it' },
                  { status: 'yellow', label: 'Risky', desc: 'Gap 2–5 — have a backup' },
                  { status: 'red', label: 'Not Recommended', desc: 'Gap < 2 — risk of splitting up' },
                ].map(({ status, label, desc }) => {
                  const s = getStatusStyles(status)
                  return (
                    <div key={status} className="flex items-center gap-2.5">
                      <span className={`text-xl`}>{getStatusEmoji(status)}</span>
                      <div>
                        <span className={`font-bold ${s.text}`}>{label}</span>
                        <span className="text-slate-500 text-xs ml-1.5">{desc}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-3">
            <div className="card overflow-hidden">
              {/* Sheet header */}
              <div
                ref={previewRef}
                className="bg-white p-6"
              >
                {/* Title block */}
                <div className="flex items-center justify-between border-b-2 border-klm-dark pb-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✈️</span>
                      <span className="text-xl font-black text-klm-dark tracking-tight">STANDBY PANIC SHEET</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Generated {new Date().toLocaleDateString('en-GB', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })} · Non-Rev Travel · Couple (need ≥ 2 seats)
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Flights</div>
                    <div className="text-3xl font-black text-klm-dark">{selectedIds.length}</div>
                  </div>
                </div>

                {/* Flight list */}
                <PanicSheetPreview flights={flights} selectedIds={selectedIds} />

                {/* Footer note */}
                {selectedIds.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-dashed border-slate-200 text-xs text-slate-400 flex items-center justify-between">
                    <span>Data current at time of export — verify at gate</span>
                    <span>🔴 No &lt;2 gap · 🟡 Risky 2–5 · 🟢 Safe &gt;5</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
