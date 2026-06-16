import { useState } from 'react'
import { askGemini, buildTripPrompt } from '../utils/gemini'
import { getStandbyStatus } from '../utils/standbyLogic'
import MarkdownResponse from './MarkdownResponse'

/**
 * GeminiAdvisor — inline AI panel shown inside an expanded IdeaCard.
 *
 * Props:
 *  idea         — the trip idea object
 *  linkedFlights — flights linked to this idea (already filtered)
 *  apiKey       — Gemini API key from localStorage
 *  systemPrompt — the editable system context from localStorage
 *  onOpenSettings — callback to open the settings modal
 */
export default function GeminiAdvisor({ idea, linkedFlights, apiKey, systemPrompt, onOpenSettings }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [showPromptPreview, setShowPromptPreview] = useState(false)

  const userMessage = buildTripPrompt(idea, linkedFlights)

  const hasApiKey = !!apiKey?.trim()
  const hasFlights = linkedFlights.length > 0

  // Quick status summary for the button label
  const statusCounts = linkedFlights.reduce((acc, f) => {
    const s = getStandbyStatus(f.openSeats, f.standbyPax)
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {})

  const handleAsk = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const text = await askGemini(apiKey, systemPrompt, userMessage)
      setResponse(text)
    } catch (err) {
      setError(err.message || 'Unexpected error calling Gemini.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    setOpen((o) => !o)
  }

  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden bg-purple-50/40">
      {/* Panel trigger row */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-purple-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="font-semibold text-purple-800 text-sm">Ask Gemini AI</span>
          {response && !open && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              Response ready
            </span>
          )}
          {!hasApiKey && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              API key needed
            </span>
          )}
        </div>
        <span className="text-purple-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-purple-200">

          {/* No API key warning */}
          {!hasApiKey && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 text-sm flex items-start gap-2">
              <span className="flex-shrink-0">🔑</span>
              <div>
                <p className="font-semibold text-amber-800">No API key configured</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Add your Gemini API key in Settings to use AI features.
                </p>
                <button
                  onClick={onOpenSettings}
                  className="mt-2 text-xs font-semibold text-klm-blue hover:underline"
                >
                  Open Settings →
                </button>
              </div>
            </div>
          )}

          {/* Prompt preview toggle */}
          <div className="mt-3">
            <button
              onClick={() => setShowPromptPreview((s) => !s)}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
            >
              <span>{showPromptPreview ? '▲' : '▼'}</span>
              {showPromptPreview ? 'Hide' : 'Preview'} prompt that will be sent
            </button>

            {showPromptPreview && (
              <div className="mt-2 bg-slate-900 text-slate-300 rounded-lg p-3 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-700">
                <p className="text-slate-500 text-xs mb-2 font-sans font-semibold not-italic">— System prompt (from Settings) —</p>
                <p className="text-purple-300 whitespace-pre-wrap">{systemPrompt}</p>
                <p className="text-slate-500 text-xs mt-3 mb-2 font-sans font-semibold">— User message (auto-generated from your trip idea) —</p>
                <p className="whitespace-pre-wrap">{userMessage}</p>
              </div>
            )}
          </div>

          {/* Ask button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAsk}
              disabled={loading || !hasApiKey}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block">⏳</span>
                  Thinking…
                </>
              ) : (
                <>
                  <span>✨</span>
                  {response ? 'Ask Again' : 'Get AI Recommendation'}
                </>
              )}
            </button>
            {hasFlights ? (
              <span className="text-xs text-slate-500">
                Analysing {linkedFlights.length} flight{linkedFlights.length !== 1 ? 's' : ''}
                {statusCounts.green ? ` · ${statusCounts.green}🟢` : ''}
                {statusCounts.yellow ? ` · ${statusCounts.yellow}🟡` : ''}
                {statusCounts.red ? ` · ${statusCounts.red}🔴` : ''}
              </span>
            ) : (
              <span className="text-xs text-slate-400 italic">No flights linked — will advise on destination generally</span>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-3 text-sm">
              <p className="font-semibold text-red-700">Error</p>
              <p className="text-red-600 text-xs mt-1">{error}</p>
              {error.includes('API key') && (
                <button onClick={onOpenSettings} className="mt-2 text-xs font-semibold text-klm-blue hover:underline">
                  Open Settings →
                </button>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-purple-100 rounded w-3/4"></div>
              <div className="h-3 bg-purple-100 rounded w-full"></div>
              <div className="h-3 bg-purple-100 rounded w-5/6"></div>
              <div className="h-3 bg-purple-100 rounded w-2/3"></div>
              <div className="h-4 bg-purple-100 rounded w-1/2 mt-3"></div>
              <div className="h-3 bg-purple-100 rounded w-full"></div>
              <div className="h-3 bg-purple-100 rounded w-4/5"></div>
            </div>
          )}

          {/* Response */}
          {response && !loading && (
            <div className="bg-white border border-purple-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="text-base">✨</span>
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Gemini AI Recommendation</span>
                <span className="ml-auto text-xs text-slate-400">for "{idea.name}"</span>
              </div>
              <MarkdownResponse text={response} />
              <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100 italic">
                AI-generated advice — always verify seat data and conditions at the gate.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
