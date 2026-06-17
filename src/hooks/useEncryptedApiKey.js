import { useState, useEffect, useCallback } from 'react'
import { encryptLocal, decryptLocal } from '../utils/crypto'

const STORAGE_KEY = 'sbp_gemini_key'

/**
 * Like useLocalStorage but encrypts the value with AES-GCM before persisting.
 * The CryptoKey lives in IndexedDB as non-extractable — JS code can never read
 * the raw key bytes, only use them to encrypt/decrypt.
 *
 * Migration: if an existing value fails decryption (plaintext from the old
 * format) it is used as-is and immediately re-encrypted.
 */
export function useEncryptedApiKey() {
  const [apiKey, setApiKeyState] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return

    decryptLocal(stored)
      .then(setApiKeyState)
      .catch(() => {
        // Pre-encryption plaintext value — use it and re-encrypt in place.
        setApiKeyState(stored)
        encryptLocal(stored).then(enc => localStorage.setItem(STORAGE_KEY, enc))
      })
  }, [])

  const setApiKey = useCallback((value) => {
    setApiKeyState(value)
    if (value) {
      encryptLocal(value).then(enc => localStorage.setItem(STORAGE_KEY, enc))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return [apiKey, setApiKey]
}
