# Standby Holiday Planner ✈️

An AI-powered, offline-ready single-page app for airline staff planning non-rev (standby) travel. Built with React + Vite + Tailwind CSS. No backend — all data lives in `localStorage`.

## Features

| Tab | Description |
|---|---|
| 🌅 **Daily Explorer** | Pick a travel vibe → Gemini generates activities → pins plotted on an interactive Leaflet map → chain into a full day timeline |
| 📅 **Trip Planner** | Fill in a trip form → Gemini generates a markdown itinerary → save up to 10 itineraries |
| 💬 **Scout AI** | Multi-turn travel chat with trip idea context, quick-prompt chips, and persistent history |
| 🛫 **Flights** | Add/edit/delete standby flights with seat counts and passenger counts; live go/no-go status preview |
| 🗺️ **Trip Ideas** | Brainstorm destinations, filter by month/region, link flights, get Gemini travel advice per idea |
| 📋 **Panic Sheet** | Select flights and export a quick-reference sheet as PDF or PNG |

### Standby Status Logic

Gap = Open Seats − Standby Passengers Ahead

- Gap < 2 → 🔴 Not Recommended
- Gap 2–5 → 🟡 Risky
- Gap > 5 → 🟢 Safe Bet

Couple travel mode requires ≥ 2 seats (will not split up).

## Tech Stack

- **React 18** + **Vite 5**
- **Tailwind CSS 3** (KLM Blue `#00A1E4` theme)
- **Gemini 2.0 Flash** via `@google/generative-ai`
- **react-leaflet 4** + **Leaflet** + Nominatim geocoding for maps
- **jspdf** + **html2canvas** for PDF/PNG export
- **uuid** for ID generation
- All data persisted in **localStorage** (no account needed)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier available)

### Install & Run

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

### First-Time Setup

1. Click **✨ Setup AI** in the top-right header.
2. Paste your Gemini API key and click **Save**.
3. All AI features (Daily Explorer, Trip Planner, Scout AI, Trip Ideas advisor) become active immediately.

### Build for Production

```bash
npm run build
npm run preview
```

The `dist/` folder is a fully static site — drop it anywhere (Nginx, GitHub Pages, etc.).

## Project Structure

```
src/
├── App.jsx                   # Root layout, tab nav, shared state
├── hooks/
│   └── useLocalStorage.js    # Custom hook, syncs across tabs
├── utils/
│   ├── standbyLogic.js       # Go/no-go status calculation
│   ├── gemini.js             # Gemini API helpers (askGemini, askGeminiChat, etc.)
│   ├── travelPrompts.js      # System prompts for each AI feature
│   └── geocode.js            # Nominatim geocoding with rate-limit delay
└── components/
    ├── FlightSandbox.jsx     # Flight management
    ├── TripIdeation.jsx      # Trip idea cards with Gemini advisor
    ├── PanicSheet.jsx        # PDF/PNG export
    ├── DailyExplorer.jsx     # Vibe → map → day plan
    ├── TripPlanner.jsx       # Itinerary generator
    ├── TravelChat.jsx        # Scout AI chat interface
    ├── ActivityMap.jsx       # Leaflet map (lazy-loaded)
    ├── GeminiAdvisor.jsx     # Inline AI panel for trip ideas
    ├── SettingsModal.jsx     # API key + system prompt editor
    └── MarkdownResponse.jsx  # Shared markdown renderer
```

## localStorage Keys

| Key | Contents |
|---|---|
| `sbp_flights` | Array of flight objects |
| `sbp_trip_ideas` | Array of trip idea objects |
| `sbp_gemini_key` | Gemini API key |
| `sbp_gemini_prompt` | System prompt for Trip Ideas advisor |
| `sbp_prompt_explorer` | System prompt for Daily Explorer |
| `sbp_prompt_dayplan` | System prompt for day plan chaining |
| `sbp_prompt_planner` | System prompt for Trip Planner |
| `sbp_prompt_chat` | System prompt for Scout AI chat |

## Notes

- **Offline-ready**: once loaded, the app works without an internet connection (AI features require connectivity to reach Gemini).
- **Non-rev use only**: this tool is designed for personal standby travel planning and is not affiliated with any airline.
