/**
 * Core standby probability calculator.
 *
 * The user travels WITH their partner and will NOT split up.
 * Therefore a minimum of 2 open seats (after standby passengers) is required.
 *
 * @param {number} openSeats      - S: seats currently shown as open
 * @param {number} standbyPax    - P: number of standby passengers ahead in queue
 * @returns {{ status: string, label: string, score: number, gap: number }}
 */
export function getStandbyStatus(openSeats, standbyPax) {
  const S = Number(openSeats) || 0
  const P = Number(standbyPax) || 0
  const gap = S - P

  if (gap > 5) {
    return {
      status: 'green',
      label: 'Safe Bet',
      score: 3,
      gap,
      description: `${gap} seats buffer — looking good for both of you`,
    }
  } else if (gap >= 2) {
    return {
      status: 'yellow',
      label: 'Risky',
      score: 2,
      gap,
      description: `${gap} seat${gap !== 1 ? 's' : ''} buffer — have a backup plan`,
    }
  } else {
    return {
      status: 'red',
      label: 'Not Recommended',
      score: 1,
      gap,
      description: gap <= 0
        ? `No room — ${Math.abs(gap)} standby ahead of open seats`
        : `Only ${gap} seat buffer — you risk being split up`,
    }
  }
}

/**
 * Returns Tailwind utility classes for a given status.
 */
export function getStatusStyles(status) {
  switch (status) {
    case 'green':
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-800',
        dot: 'bg-emerald-500',
        indicator: 'border-emerald-400',
      }
    case 'yellow':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-800',
        dot: 'bg-amber-500',
        indicator: 'border-amber-400',
      }
    case 'red':
    default:
      return {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-800',
        dot: 'bg-red-500',
        indicator: 'border-red-400',
      }
  }
}

/**
 * Returns a single emoji for quick visual scanning on the panic sheet.
 */
export function getStatusEmoji(status) {
  return { green: '🟢', yellow: '🟡', red: '🔴' }[status] ?? '⚪'
}

/**
 * Formats IATA route as "AMS → NRT"
 */
export function formatRoute(origin, destination) {
  const o = (origin || '???').toUpperCase().slice(0, 4)
  const d = (destination || '???').toUpperCase().slice(0, 4)
  return `${o} → ${d}`
}
