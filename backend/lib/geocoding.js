

/**
 * Resolves latitude and longitude coordinates to a human-readable city/area.
 * Uses OpenStreetMap Nominatim API (free, but has rate limits).
 * 
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @returns {Promise<{city: string, area: string, fullName: string} | null>} 
 */
export async function reverseGeocode(lat, lon) {
  if (!lat || !lon) return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Employee-Service/1.0 (admin@yourdomain.com)' 
        }
      }
    );

    if (!response.ok) {
      console.warn(`Geocoding API responded with status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.address) return null;

    const city = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown City';
    const area = data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.road || 'Unknown Area';

    return {
      city: city,
      area: area,
      fullName: data.display_name
    };
  } catch (error) {
    console.error('CRITICAL: Geocoding error:', error);
    return null;
  }
}

/**
 * Resolves an IP address to geographical coordinates and city/area.
 * Uses ip-api.com (free for non-commercial use, 45 requests/min).
 * 
 * @param {string} ip IP Address
 * @returns {Promise<{lat: number, lon: number, city: string, area: string} | null>}
 */
export async function geocodeIP(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('172.')) return null;

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 'success') return null;

    return {
      lat: data.lat,
      lon: data.lon,
      city: data.city || 'Unknown City',
      area: data.regionName || 'Unknown region'
    };
  } catch (error) {
    console.error('CRITICAL: IP Geocoding error:', error);
    return null;
  }
}
