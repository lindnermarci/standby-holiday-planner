/**
 * Geocodes a place name → { lat, lng, displayName } using OpenStreetMap Nominatim.
 * Free, no API key. Respects a 250ms gap between sequential calls.
 */
export async function geocodePlace(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en-US,en' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name }
  } catch {
    return null
  }
}

/**
 * Geocodes an array of queries sequentially with a polite 250ms delay.
 */
export async function geocodePlaces(queries) {
  const results = []
  for (const query of queries) {
    results.push(await geocodePlace(query))
    await new Promise((r) => setTimeout(r, 250))
  }
  return results
}
