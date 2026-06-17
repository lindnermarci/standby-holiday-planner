import { useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useAuth } from './hooks/useAuth'
import { useCloudSync } from './hooks/useCloudSync'
import { DEFAULT_SYSTEM_PROMPT } from './utils/gemini'
import {
  DAILY_EXPLORER_SYSTEM_PROMPT,
  DAILY_PLAN_SYSTEM_PROMPT,
  TRIP_PLANNER_SYSTEM_PROMPT,
  TRAVEL_CHAT_SYSTEM_PROMPT,
} from './utils/travelPrompts'
import FlightSandbox from './components/FlightSandbox'
import TripIdeation from './components/TripIdeation'
import PanicSheet from './components/PanicSheet'
import SettingsModal from './components/SettingsModal'
import AuthModal from './components/AuthModal'
import DailyExplorer from './components/DailyExplorer'
import TripPlanner from './components/TripPlanner'
import TravelChat from './components/TravelChat'

const TABS = [
  { id: 'explorer', label: 'Daily Explorer', icon: '🌅', badge: 'NEW' },
  { id: 'planner', label: 'Trip Planner', icon: '📅', badge: 'NEW' },
  { id: 'chat', label: 'Scout AI', icon: '💬', badge: 'NEW' },
  { id: 'sandbox', label: 'Flights', icon: '🛫' },
  { id: 'ideation', label: 'Trip Ideas', icon: '🗺️' },
  { id: 'panic', label: 'Panic Sheet', icon: '📋' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('explorer')

  // Synced data (these 5 keys go to Supabase)
  const [flights, setFlights] = useLocalStorage('sbp_flights', [])
  const [tripIdeas, setTripIdeas] = useLocalStorage('sbp_trip_ideas', [])
  const [savedItineraries, setSavedItineraries] = useLocalStorage('sbp_itineraries', [])
  const [savedExplorations, setSavedExplorations] = useLocalStorage('sbp_saved_explorations', [])
  const [chatMessages, setChatMessages] = useLocalStorage('sbp_chat_messages', [])

  // Device-local (API key and prompts stay on-device)
  const [apiKey, setApiKey] = useLocalStorage('sbp_gemini_key', '')
  const [systemPrompt, setSystemPrompt] = useLocalStorage('sbp_gemini_prompt', DEFAULT_SYSTEM_PROMPT)
  const [explorerPrompt, setExplorerPrompt] = useLocalStorage('sbp_prompt_explorer', DAILY_EXPLORER_SYSTEM_PROMPT)
  const [dayPlanPrompt, setDayPlanPrompt] = useLocalStorage('sbp_prompt_dayplan', DAILY_PLAN_SYSTEM_PROMPT)
  const [plannerPrompt, setPlannerPrompt] = useLocalStorage('sbp_prompt_planner', TRIP_PLANNER_SYSTEM_PROMPT)
  const [chatPrompt, setChatPrompt] = useLocalStorage('sbp_prompt_chat', TRAVEL_CHAT_SYSTEM_PROMPT)

  // Auth
  const { user, isAuthenticated, loading: authLoading, sendMagicLink, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [migrationToast, setMigrationToast] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Cloud sync — pull on login, push on data changes
  useCloudSync({
    userId: user?.id ?? null,
    data: { flights, tripIdeas, itineraries: savedItineraries, savedExplorations, chatMessages, apiKey },
    setters: { setFlights, setTripIdeas, setSavedItineraries, setSavedExplorations, setChatMessages, setApiKey },
    onMigrationComplete: () => {
      setMigrationToast(true)
      setTimeout(() => setMigrationToast(false), 4000)
    },
  })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-klm-dark text-white shadow-lg flex-shrink-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <span className="text-xl">✈️</span>
              <div>
                <h1 className="text-base font-black leading-none tracking-tight">Standby Planner</h1>
                <p className="text-xs text-slate-400 leading-none mt-0.5">AI-Powered · Non-Rev Travel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-klm-mid/30 px-2.5 py-1 rounded-full">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${isAuthenticated ? 'bg-klm-blue' : 'bg-emerald-400 animate-pulse'}`}></span>
                {isAuthenticated ? 'Syncing' : 'Offline-ready'}
              </div>

              {/* Auth button */}
              {!authLoading && (
                isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-xs text-slate-400 truncate max-w-[140px]" title={user.email}>{user.email}</span>
                    <button
                      onClick={signOut}
                      className="text-xs px-3 py-1.5 rounded-full bg-slate-500/20 text-slate-300 hover:bg-slate-500/30 font-semibold transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-xs px-3 py-1.5 rounded-full bg-klm-blue/80 text-white hover:bg-klm-blue font-semibold transition-colors"
                  >
                    Sign in
                  </button>
                )
              )}

              <button
                onClick={() => setShowSettings(true)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  apiKey
                    ? 'bg-purple-500/30 text-purple-200 hover:bg-purple-500/50'
                    : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 animate-pulse'
                }`}
                title="AI Settings"
              >
                <span>✨</span>
                <span className="hidden sm:inline">{apiKey ? 'Gemini Ready' : 'Setup AI'}</span>
                <span className="opacity-60">⚙</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm flex-shrink-0">
        <div className="max-w-[1400px] mx-auto px-2 sm:px-4">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 sm:px-5 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors duration-150 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-klm-blue text-klm-blue'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="hidden sm:inline ml-1 bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`flex-1 ${activeTab === 'explorer' ? 'flex flex-col lg:overflow-hidden' : activeTab === 'chat' ? '' : 'max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-6'}`}>
        {activeTab === 'explorer' && (
          <DailyExplorer
            apiKey={apiKey}
            explorerPrompt={explorerPrompt}
            dayPlanPrompt={dayPlanPrompt}
            onOpenSettings={() => setShowSettings(true)}
            savedPlans={savedExplorations}
            setSavedPlans={setSavedExplorations}
          />
        )}
        {activeTab === 'planner' && (
          <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-6">
            <TripPlanner
              apiKey={apiKey}
              plannerPrompt={plannerPrompt}
              onOpenSettings={() => setShowSettings(true)}
              savedItineraries={savedItineraries}
              setSavedItineraries={setSavedItineraries}
            />
          </div>
        )}
        {activeTab === 'chat' && (
          <TravelChat
            apiKey={apiKey}
            chatPrompt={chatPrompt}
            tripIdeas={tripIdeas}
            onOpenSettings={() => setShowSettings(true)}
            messages={chatMessages}
            setMessages={setChatMessages}
          />
        )}
        {activeTab === 'sandbox' && (
          <FlightSandbox flights={flights} setFlights={setFlights} />
        )}
        {activeTab === 'ideation' && (
          <TripIdeation
            tripIdeas={tripIdeas}
            setTripIdeas={setTripIdeas}
            flights={flights}
            apiKey={apiKey}
            systemPrompt={systemPrompt}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
        {activeTab === 'panic' && (
          <PanicSheet flights={flights} tripIdeas={tripIdeas} />
        )}
      </main>

      {/* Footer — hidden on immersive tabs */}
      {!['explorer', 'chat'].includes(activeTab) && (
        <footer className="text-center text-xs text-slate-400 py-3 border-t border-slate-200 bg-white flex-shrink-0">
          Standby Planner · Powered by Gemini · Non-rev use only
        </footer>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          apiKey={apiKey}
          setApiKey={setApiKey}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          explorerPrompt={explorerPrompt}
          setExplorerPrompt={setExplorerPrompt}
          dayPlanPrompt={dayPlanPrompt}
          setDayPlanPrompt={setDayPlanPrompt}
          plannerPrompt={plannerPrompt}
          setPlannerPrompt={setPlannerPrompt}
          chatPrompt={chatPrompt}
          setChatPrompt={setChatPrompt}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onSendMagicLink={sendMagicLink}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Migration toast */}
      {migrationToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-klm-dark text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <span>☁️</span>
          <span>Your local data has been backed up to your account.</span>
        </div>
      )}
    </div>
  )
}
