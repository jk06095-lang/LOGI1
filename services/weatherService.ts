
export interface WeatherData {
  date: string;
  waveHeight: number; // m
  precipitation: number; // mm
}

export const fetchBusanWeather = async (year: number, month: number): Promise<Record<string, WeatherData>> => {
  // Busan Offshore approximate coordinates
  const lat = 35.05;
  const lon = 129.1;
  
  // 1. Determine "Today" in Local Time (Client)
  const today = new Date();
  today.setHours(0,0,0,0);

  // 2. Determine Forecast Limit (Today + 7 days)
  const forecastLimit = new Date(today);
  forecastLimit.setDate(today.getDate() + 7);

  // 3. Determine View Range (Selected Month)
  const viewStart = new Date(year, month, 1);
  const viewEnd = new Date(year, month + 1, 0);

  // 4. Intersect View Range with Forecast Range
  // We only fetch weather if the calendar view overlaps with the available forecast window
  let start = viewStart < today ? today : viewStart;
  let end = viewEnd > forecastLimit ? forecastLimit : viewEnd;

  // If the viewed month is entirely in the past or too far in the future, return empty
  if (start > end) return {};

  // Helper for YYYY-MM-DD
  const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
  };

  const startStr = formatDate(start);
  const endStr = formatDate(end);

  try {
    // Fetch hourly marine data: Wave Height and Precipitation
    // Requested range is now guaranteed to be within [Today, Today+7]
    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,precipitation&timezone=Asia%2FSeoul&start_date=${startStr}&end_date=${endStr}`
    );
    
    if (!response.ok) return {};
    
    const json = await response.json();
    const result: Record<string, WeatherData> = {};
    
    if (json.hourly && json.hourly.time) {
        json.hourly.time.forEach((t: string, i: number) => {
            // Extract data for 08:00 KST
            if (t.endsWith("08:00")) {
                const dateKey = t.split("T")[0];
                const waveHeight = json.hourly.wave_height[i];
                const precip = json.hourly.precipitation[i];

                if (waveHeight !== null && waveHeight !== undefined) {
                    result[dateKey] = {
                        date: dateKey,
                        waveHeight: waveHeight,
                        precipitation: precip || 0
                    };
                }
            }
        });
    }
    return result;
  } catch (error) {
    console.error("Weather fetch failed:", error);
    return {};
  }
};
