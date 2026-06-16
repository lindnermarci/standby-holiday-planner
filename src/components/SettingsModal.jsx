import { useState } from 'react'
import { DEFAULT_SYSTEM_PROMPT } from '../utils/gemini'
import {
  DAILY_EXPLORER_SYSTEM_PROMPT,
  DAILY_PLAN_SYSTEM_PROMPT,
  TRIP_PLANNER_SYSTEM_PROMPT,
  TRAVEL_CHAT_SYSTEM_PROMPT,
} from '../utils/travelPrompts'

const PROMPT_TABS = [
  {
    id: 'tripideas',
    label: 'Trip Ideas',
    icon: '🗺️',
    description: 'Sent to Gemini when analysing a trip idea in the Trip Ideas tab.',
    defaultPrompt: DEFAULT_SYSTEM_PROMPT,
  },
  {
    id: 'explorer',
    label: 'Daily Explorer',
    icon: '🌅',
    description: 'Instructs Gemini to suggest today\'s activities as structured JSON. Edit with care — the JSON schema must be preserved.',
    defaultPrompt: DAILY_EXPLORER_SYSTEM_PROMPT,
  },
  {
    id: 'dayplan',
    label: 'Day Planner',
    icon: '📅',
    description: 'Used when building a timeline from your selected activities in the Daily Explorer.',
    defaultPrompt: DAILY_PLAN_SYSTEM_PROMPT,
  },
  {
    id: 'planner',
    label: 'Trip Planner',
    icon: '🗓️',
    description: 'Controls how Gemini writes your multi-day itinerary in the Trip Planner tab.',
    defaultPrompt: TRIP_PLANNER_SYSTEM_PROMPT,
  },
  {
    id: 'chat',
    label: 'Scout AI',
    icon: '💬',
    description: 'Defines Scout\'s personality and knowledge in the travel chat.',
    defaultPrompt: TRAVEL_CHAT_SYSTEM_PROMPT,
  },
]

export default function SettingsModal({
  apiKey, setApiKey,
  systemPrompt, setSystemPrompt,
  explorerPrompt, setExplorerPrompt,
  dayPlanPrompt, setDayPlanPrompt,
  plannerPrompt, setPlannerPrompt,
  chatPrompt, setChatPrompt,
  onClose,
}) {
  const [localKey, setLocalKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activePromptTab, setActivePromptTab] = useState('tripideas')

  // Local editable copies of all prompts
  const [localPrompts, setLocalPrompts] = useState({
    tripideas: systemPrompt,
    explorer: explorerPrompt,
    dayplan: dayPlanPrompt,
    planner: plannerPrompt,
    chat: chatPrompt,
  })

  const setLocalPrompt = (id, value) =>
    setLocalPrompts((prev) => ({ ...prev, [id]: value }))

  const handleReset = (id) => {
    const tab = PROMPT_TABS.find((t) => t.id === id)
    if (tab) setLocalPrompt(id, tab.defaultPrompt)
  }

  const handleSave = () => {
    setApiKey(localKey.trim())
    setSystemPrompt(localPrompts.tripideas)
    setExplorerPrompt(localPrompts.explorer)
    setDayPlanPrompt(localPrompts.dayplan)
    setPlannerPrompt(localPrompts.planner)
    setChatPrompt(localPrompts.chat)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const activeTab = PROMPT_TABS.find((t) => t.id === activePromptTab)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-klm-dark">AI Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">API key and system prompts for every feature</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* API Key section */}
          <div>
            <label className="label">Gemini API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className="input pr-20"
                placeholder="AIza…"
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Stored only in this browser's localStorage — sent directly to Google's Gemini API only.
              Get a free key at{' '}
              <span className="text-klm-blue font-medium">aistudio.google.com</span>.
            </p>
          </div>

          {/* System prompts section */}
          <div>
            <p className="label mb-2">System Prompts</p>
            <p className="text-xs text-slate-400 mb-3">
              Each feature has its own prompt. Edit freely — changes are saved when you click Save.
            </p>

            {/* Prompt tab selector */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {PROMPT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePromptTab(tab.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    activePromptTab === tab.id
                      ? 'bg-klm-blue border-klm-blue text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Active prompt editor */}
            {activeTab && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-slate-500">{activeTab.description}</p>
                  <button
                    type="button"
                    onClick={() => handleReset(activeTab.id)}
                    className="text-xs text-slate-400 hover:text-klm-blue transition-colors ml-3 flex-shrink-0"
                  >
                    ↺ Reset
                  </button>
                </div>
                <textarea
                  className="input font-mono text-xs leading-relaxed resize-y"
                  rows={14}
                  value={localPrompts[activeTab.id]}
                  onChange={(e) => setLocalPrompt(activeTab.id, e.target.value)}
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2 min-w-32 justify-center">
            {saved ? <><span>✓</span> Saved!</> : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
