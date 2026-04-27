
'use server';

/**
 * Server Action to fetch exchange rates from Central Bank of Myanmar.
 * This bypasses CORS restrictions that occur when fetching from the client.
 */
export async function getCbmRates() {
  try {
    const response = await fetch("https://forex.cbm.gov.mm/api/latest", {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`CBM API returned status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching CBM rates on server:", error);
    return null;
  }
}
