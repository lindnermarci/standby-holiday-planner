import { useState } from 'react'

export default function AuthModal({ onSendMagicLink, onClose }) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState('input') // 'input' | 'sent' | 'error'
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setErrorMsg('')
    try {
      await onSendMagicLink(email.trim())
      setPhase('sent')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send magic link. Please try again.')
      setPhase('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-klm-dark">Sign in</h2>
            <p className="text-xs text-slate-500 mt-0.5">No password needed — we email you a link</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {phase !== 'sent' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            {phase === 'error' && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
            <p className="text-xs text-slate-400 text-center">
              Your flights and trips will sync securely across devices.
            </p>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-5xl">📬</div>
            <div>
              <p className="font-semibold text-klm-dark">Check your inbox</p>
              <p className="text-sm text-slate-500 mt-1">
                We sent a sign-in link to{' '}
                <span className="font-medium text-klm-dark">{email}</span>
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Click the link in the email to sign in. This tab will update automatically.
            </p>
            <button onClick={onClose} className="btn-secondary w-full">Close</button>
          </div>
        )}
      </div>
    </div>
  )
}
