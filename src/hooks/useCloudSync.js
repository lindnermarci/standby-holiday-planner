import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../utils/supabase'

const SYNC_KEYS = [
  'sbp_flights',
  'sbp_trip_ideas',
  'sbp_itineraries',
  'sbp_saved_explorations',
  'sbp_chat_messages',
]

const KEY_TO_COLUMN = {
  sbp_flights:            'flights',
  sbp_trip_ideas:         'trip_ideas',
  sbp_itineraries:        'itineraries',
  sbp_saved_explorations: 'saved_explorations',
  sbp_chat_messages:      'chat_messages',
}

const DEBOUNCE_MS = 500

/**
 * Syncs app data between localStorage and Supabase.
 *
 * @param {object} params
 * @param {string|null} params.userId
 * @param {object} params.data - { flights, tripIdeas, itineraries, savedExplorations, chatMessages }
 * @param {object} params.setters - { setFlights, setTripIdeas, setSavedItineraries, setSavedExplorations, setChatMessages }
 * @param {function} [params.onMigrationComplete] - called once when existing localStorage data is uploaded on first login
 */
export function useCloudSync({ userId, data, setters, onMigrationComplete }) {
  const debounceRef = useRef(null)
  const hasPulledRef = useRef(false)
  const isMigratingRef = useRef(false)

  // ── PULL: fetch from Supabase on login, migrate or overwrite ──
  useEffect(() => {
    if (!supabase || !userId || hasPulledRef.current) return

    hasPulledRef.current = true
    isMigratingRef.current = true

    ;(async () => {
      try {
        const { data: row, error } = await supabase
          .from('user_data')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) throw error

        if (!row) {
          // First login — check if localStorage has data worth migrating
          const hasLocalData = SYNC_KEYS.some((key) => {
            try {
              const v = JSON.parse(localStorage.getItem(key) || '[]')
              return Array.isArray(v) && v.length > 0
            } catch { return false }
          })

          if (hasLocalData) {
            const payload = { user_id: userId }
            SYNC_KEYS.forEach((key) => {
              try {
                payload[KEY_TO_COLUMN[key]] = JSON.parse(localStorage.getItem(key) || '[]')
              } catch { payload[KEY_TO_COLUMN[key]] = [] }
            })
            await supabase.from('user_data').upsert(payload, { onConflict: 'user_id' })
            onMigrationComplete?.()
          }
          // localStorage already has the right data — no setter calls needed
        } else {
          // Returning user on new device — cloud is source of truth
          const colToSetter = {
            flights:            setters.setFlights,
            trip_ideas:         setters.setTripIdeas,
            itineraries:        setters.setSavedItineraries,
            saved_explorations: setters.setSavedExplorations,
            chat_messages:      setters.setChatMessages,
          }
          Object.entries(colToSetter).forEach(([col, setter]) => {
            if (row[col] !== undefined) setter(row[col])
          })
        }
      } catch (err) {
        console.warn('Cloud sync pull failed:', err.message)
      } finally {
        isMigratingRef.current = false
      }
    })()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── PUSH: debounced on every data change ──
  const pushToCloud = useCallback(() => {
    if (!supabase || !userId || isMigratingRef.current) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await supabase.from('user_data').upsert({
          user_id:            userId,
          flights:            data.flights,
          trip_ideas:         data.tripIdeas,
          itineraries:        data.itineraries,
          saved_explorations: data.savedExplorations,
          chat_messages:      data.chatMessages,
        }, { onConflict: 'user_id' })
      } catch (err) {
        console.warn('Cloud sync push failed:', err.message)
      }
    }, DEBOUNCE_MS)
  }, [userId, data.flights, data.tripIdeas, data.itineraries, data.savedExplorations, data.chatMessages]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userId && !isMigratingRef.current) pushToCloud()
  }, [pushToCloud, userId])

  // ── LOGOUT: reset pull guard so next login re-pulls ──
  useEffect(() => {
    if (!userId) {
      hasPulledRef.current = false
      clearTimeout(debounceRef.current)
    }
  }, [userId])
}
