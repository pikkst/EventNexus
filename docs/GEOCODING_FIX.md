// Improved Geocoding Helper Function
// Fixes address normalization and search strategy for better success rate

/**
 * Enhanced geocoding with 6+ search strategies:
 * 1. Full address as-is + country
 * 2. Venue name only + city + country
 * 3. Venue + city (without extra details)
 * 4. City + venue (reversed)
 * 5. Address without building/room numbers
 * 6. Just venue name + country code

 * ADD THIS TO parse-event-ai/index.ts to replace geocodeAddress function
 */

async function geocodeAddress(
  address: string, 
  country: string, 
  countryCode: string, 
  supabaseClient: any,
  debugMetrics: DebugMetrics
): Promise<{ lat: number; lng: number } | null> {
  debugMetrics.geocodingStats.attempts++
  const geocodeStart = Date.now()
  
  try {
    // Add 1.1 second delay to respect Nominatim rate limit
    await new Promise(resolve => setTimeout(resolve, 1100))
    
    // 🔧 ENHANCED: Prepare MANY search variations (try multiple approaches)
    const searchVariations: string[] = []
    
    // Parse address components
    const parts = address.split(',').map(p => p.trim())
    const venueName = parts[0] || ''
    const cityName = parts[parts.length - 1]?.trim() || parts[1]?.trim() || ''
    
    const lowerAddress = address.toLowerCase()
    const lowerCountry = country.toLowerCase()
    
    // 1. Full address with country (if not present)
    if (!lowerAddress.includes(lowerCountry)) {
      searchVariations.push(`${address}, ${country}`)
    } else {
      searchVariations.push(address)
    }
    
    // 2. Venue name + city + country (most specific)
    if (venueName && cityName && venueName !== cityName) {
      searchVariations.push(`${venueName}, ${cityName}, ${country}`)
    }
    
    // 3. Venue name only + country (for institutional names)
    if (venueName && venueName !== address) {
      searchVariations.push(`${venueName}, ${country}`)
    }
    
    // 4. Remove building/room numbers (e.g., "Room 123" → venue name only)
    const cleanVenue = venueName.replace(/\b(room|suite|floor|bldg|building|apt|#)\s*\d+\w*/gi, '').trim()
    if (cleanVenue && cleanVenue !== venueName && cleanVenue.length > 3) {
      searchVariations.push(`${cleanVenue}, ${country}`)
    }
    
    // 5. City + venue (reversed order - sometimes works better)
    if (cityName && venueName && cityName !== venueName) {
      searchVariations.push(`${cityName}, ${venueName}, ${country}`)
    }
    
    // 6. Just venue name + city (no country - sometimes helps)
    if (venueName && cityName && venueName !== cityName) {
      searchVariations.push(`${venueName}, ${cityName}`)
    }
    
    // 7. Remove special characters that might confuse geocoder
    const cleanAddress = address.replace(/[()[\]]/g, '').replace(/\s+/g, ' ').trim()
    if (cleanAddress !== address) {
      searchVariations.push(`${cleanAddress}, ${country}`)
    }
    
    // 8. If address contains street number, try without it
    const addressWithoutNumber = address.replace(/\b\d+\w*\b/g, '').replace(/\s+/g, ' ').trim()
    if (addressWithoutNumber !== address && addressWithoutNumber.length > 5) {
      searchVariations.push(`${addressWithoutNumber}, ${country}`)
    }
    
    // Remove duplicates while preserving order
    const uniqueVariations = [...new Set(searchVariations)]
    
    console.log(`🔍 Trying ${uniqueVariations.length} geocoding variations for: "${address}"`)
    
    // Try each search variation
    for (const searchAddress of uniqueVariations) {
      console.log(`  → Trying: "${searchAddress}"`)
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&countrycodes=${countryCode}`,
        {
          headers: {
            'User-Agent': 'EventNexus/1.0 (https://www.eventnexus.eu)',
            'Accept-Language': 'et,en'
          }
        }
      )

      if (!response.ok) {
        console.error(`❌ Nominatim API error ${response.status}`)
        await log(supabaseClient, 'parse-event-ai', 'error', 'Nominatim API error', { status: response.status, address, searchAddress })
        continue // Try next variation
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        debugMetrics.geocodingStats.successes++
        debugMetrics.performance.geocodeTime += (Date.now() - geocodeStart) / 1000
        
        console.log(`✅ Geocoded: "${address}" → ${data[0].lat}, ${data[0].lon} (using: "${searchAddress}")`)
        await log(supabaseClient, 'parse-event-ai', 'success', 'Geocoded address', { 
          original: address, 
          search_query: searchAddress,
          lat: data[0].lat, 
          lng: data[0].lon 
        })
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        }
      }
      
      // Wait before trying next variation (respect rate limit)
      if (uniqueVariations.indexOf(searchAddress) < uniqueVariations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1100))
      }
    }
    
    debugMetrics.geocodingStats.failures++
    const reason = 'No results found'
    debugMetrics.geocodingStats.failureReasons[reason] = (debugMetrics.geocodingStats.failureReasons[reason] || 0) + 1
    
    console.log(`⚠️ Nominatim found no results for any of ${uniqueVariations.length} variations of: ${address}`)
    await log(supabaseClient, 'parse-event-ai', 'warning', 'Geocoding failed - no results', { address, tried: uniqueVariations })
  } catch (error) {
    debugMetrics.geocodingStats.failures++
    const reason = error.message || 'Unknown error'
    debugMetrics.geocodingStats.failureReasons[reason] = (debugMetrics.geocodingStats.failureReasons[reason] || 0) + 1
    
    console.error('❌ Geocoding failed:', error)
    await log(supabaseClient, 'parse-event-ai', 'error', 'Geocoding exception', { address, error: String(error) })
  }
  return null
}
