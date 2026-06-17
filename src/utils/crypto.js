// Web Crypto helpers for protecting the Gemini API key.
//
// Local storage: AES-GCM with a non-extractable CryptoKey held in IndexedDB.
//   The raw key bytes never leave the browser's key store, so even code running
//   on the same origin cannot read the key — only use it to encrypt/decrypt.
//
// Cloud storage: AES-GCM with a key derived via PBKDF2 from the user's ID.
//   The userId has 122 bits of entropy (UUID v4), making brute-force infeasible.

const DB_NAME = 'sbp_sec'
const DB_STORE = 'keys'
const LOCAL_KEY_ID = 'gemini_enc_key'

// Fixed salt provides domain separation across apps / key versions.
const CLOUD_SALT = new Uint8Array([
  0x73, 0x62, 0x70, 0x2d, 0x67, 0x65, 0x6d, 0x69,
  0x6e, 0x69, 0x2d, 0x76, 0x31, 0x00, 0x00, 0x00,
])
const PBKDF2_ITERATIONS = 100_000

// ── IndexedDB helpers ──────────────────────────────────────────────────────

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = e => reject(e.target.error)
  })
}

async function openDb() {
  const req = indexedDB.open(DB_NAME, 1)
  req.onupgradeneeded = e => e.target.result.createObjectStore(DB_STORE)
  return idbRequest(req)
}

async function getOrCreateLocalKey() {
  const db = await openDb()
  const tx = db.transaction(DB_STORE, 'readwrite')
  const store = tx.objectStore(DB_STORE)
  const existing = await idbRequest(store.get(LOCAL_KEY_ID))
  if (existing) return existing

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable — raw bytes never accessible to JS
    ['encrypt', 'decrypt'],
  )
  await idbRequest(store.put(key, LOCAL_KEY_ID))
  return key
}

// ── Shared encode/decode ───────────────────────────────────────────────────

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

async function aesgcmEncrypt(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(plaintext)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  // Prepend IV so decrypt can extract it
  const combined = new Uint8Array(12 + cipher.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(cipher), 12)
  return toBase64(combined)
}

async function aesgcmDecrypt(key, b64) {
  const combined = fromBase64(b64)
  const iv = combined.slice(0, 12)
  const cipher = combined.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return new TextDecoder().decode(plain)
}

// ── Local (IndexedDB-backed) encrypt / decrypt ─────────────────────────────

export async function encryptLocal(plaintext) {
  const key = await getOrCreateLocalKey()
  return aesgcmEncrypt(key, plaintext)
}

export async function decryptLocal(b64) {
  const key = await getOrCreateLocalKey()
  return aesgcmDecrypt(key, b64)
}

// ── Cloud (PBKDF2-derived) encrypt / decrypt ───────────────────────────────

async function deriveCloudKey(userId) {
  const password = new TextEncoder().encode(userId)
  const base = await crypto.subtle.importKey('raw', password, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: CLOUD_SALT, iterations: PBKDF2_ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptForCloud(plaintext, userId) {
  const key = await deriveCloudKey(userId)
  return aesgcmEncrypt(key, plaintext)
}

export async function decryptFromCloud(b64, userId) {
  const key = await deriveCloudKey(userId)
  return aesgcmDecrypt(key, b64)
}
