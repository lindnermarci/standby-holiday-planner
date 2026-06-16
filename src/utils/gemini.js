import { GoogleGenerativeAI } from '@google/generative-ai'
import { getStandbyStatus, formatRoute } from './standbyLogic'

/**
 * Default system prompt — describes context to Gemini.
 * Stored in localStorage so the user can edit it freely.
 */
export const DEFAULT_SYSTEM_PROMPT = `You are a knowledgeable travel advisor helping an airline employee plan non-revenue (non-rev / standby) travel with their girlfriend.

Key context about this traveler:
- They are an airline staff member using their non-rev (standby) travel benefits
- They are always traveling WITH their girlfriend — they will NOT split up under any circumstances
- This means they need a MINIMUM of 2 confirmed seats on every flight
- They board last, after paying passengers, and can be offloaded even with a seat assigned
- Flight loads fluctuate and historical data is used — not real-time feeds

How standby probability is calculated (Gap = Open Seats − Standby Pax ahead):
- 🟢 Safe Bet: Gap > 5 (comfortable buffer for a couple)
- 🟡 Risky: Gap 2–5 (possible but plan a backup)
- 🔴 Not Recommended: Gap < 2 (likely won't clear as a couple)

When analysing a trip idea, please provide:
1. **Overall verdict** — should they attempt this trip and when?
2. **Best flight option** — which flight(s) look most promising and why?
3. **Risk factors** — what could go wrong (peak season, connections, visa issues, etc.)?
4. **Backup strategy** — alternative routes, dates, or bail-out points to consider
5. **Destination tips** — any practical non-rev tips for this destination (airport, transit, hotel near airport as backup, etc.)

Be concise, practical, and honest. Flag anything that looks risky. Use bullet points and short paragraphs.`

/**
 * Builds the structured user message from a trip idea + linked flights.
 * This is what gets sent as the "user turn" after the system prompt.
 */
export function buildTripPrompt(idea, linkedFlights) {
  const lines = []

  lines.push(`## Trip Idea: ${idea.name}`)
  if (idea.duration) lines.push(`- **Duration:** ${idea.duration} days`)
  if (idea.months?.length) lines.push(`- **Preferred months:** ${idea.months.join(', ')}`)
  if (idea.regions?.length) lines.push(`- **Target region(s):** ${idea.regions.join(', ')}`)
  if (idea.notes) lines.push(`- **Notes / conditions:** ${idea.notes}`)

  lines.push('')
  lines.push(`## Linked Flights (${linkedFlights.length})`)

  if (linkedFlights.length === 0) {
    lines.push('No flights linked — please advise on the destination generally.')
  } else {
    linkedFlights.forEach((flight, idx) => {
      const s = getStandbyStatus(flight.openSeats, flight.standbyPax)
      const emoji = s.status === 'green' ? '🟢' : s.status === 'yellow' ? '🟡' : '🔴'
      const parts = [
        `**Option ${idx + 1}:** ${formatRoute(flight.origin, flight.destination)}`,
        flight.flightNumber && `Flight ${flight.flightNumber}`,
        flight.date && `Date: ${flight.date}`,
        flight.departureTime && `Dep: ${flight.departureTime}`,
        `Open seats: ${flight.openSeats ?? '?'}`,
        `Standby pax ahead: ${flight.standbyPax ?? '?'}`,
        `Gap: ${s.gap}`,
        `Status: ${emoji} ${s.label}`,
        flight.notes && `Notes: ${flight.notes}`,
      ].filter(Boolean)
      lines.push(parts.join(' | '))
    })
  }

  lines.push('')
  lines.push('Please analyse this trip idea and advise.')

  return lines.join('\n')
}

/**
 * Calls the Gemini API and returns the response text.
 * @param {string} apiKey
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {string} model - defaults to gemini-2.0-flash
 * @returns {Promise<string>}
 */
export async function askGemini(apiKey, systemPrompt, userMessage, model = 'gemini-3-flash-preview') {
  if (!apiKey?.trim()) {
    throw new Error('No Gemini API key set. Open Settings (⚙️) to add your key.')
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim())
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  })

  const result = await geminiModel.generateContent(userMessage)
  const response = result.response
  return response.text()
}

/**
 * Like askGemini but parses the response as JSON.
 * Strips markdown code fences Gemini sometimes wraps around JSON.
 */
export async function askGeminiStructured(apiKey, systemPrompt, userMessage, model = 'gemini-3-flash-preview') {
  const text = await askGemini(apiKey, systemPrompt, userMessage, model)
  // Strip ```json ... ``` or ``` ... ``` wrappers if present
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(stripped)
}

/**
 * Sends a multi-turn conversation to Gemini and returns the reply text.
 * @param {string} apiKey
 * @param {string} systemPrompt
 * @param {{ role: 'user'|'model', parts: [{text: string}] }[]} history
 * @param {string} newMessage
 */
export async function askGeminiChat(apiKey, systemPrompt, history, newMessage, model = 'gemini-3-flash-preview') {
  if (!apiKey?.trim()) {
    throw new Error('No Gemini API key set. Open Settings (⚙️) to add your key.')
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim())
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  })

  const chat = geminiModel.startChat({ history })
  const result = await chat.sendMessage(newMessage)
  return result.response.text()
}
