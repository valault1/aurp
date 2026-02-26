export async function getWeather(req: Request) {
  // 1. Get user coords from your DB (simplified example)
  const lat = 32.64;
  const lon = -96.9;

  // 2. Fetch from Open-Meteo (Current + 7-day forecast)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto&temperature_unit=fahrenheit`;

  const response = await fetch(url);
  const data = await response.json();

  return Response.json(data);
}
