const BASE_URL = 'https://geocoding-api.open-meteo.com/v1';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const weatherContent = document.getElementById('weather-content');
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const statusMessage = document.getElementById('status-message');

let searchTimeout;

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
}

function getWeatherIcon(code) {
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌧️';
  if (code >= 500 && code < 600) return '🌦️';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫️';
  if (code === 800) return '☀️';
  return '☁️';
}

function formatDay(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, { weekday: 'short' });
}

function renderWeather(data) {
  const current = data.current;
  const daily = data.daily.slice(0, 5);

  weatherContent.innerHTML = `
    <div class="current-weather">
      <div>
        <h2 class="city-name">${data.city}</h2>
        <div class="temp-row">
          <strong>${Math.round(current.temperature)}°C</strong>
          <span>${getWeatherIcon(current.weathercode)}</span>
        </div>
        <p class="forecast-summary">${data.description}</p>
      </div>

      <div class="weather-meta">
        <div class="meta-box">
          <p>Feels like</p>
          <strong>${Math.round(current.apparent_temperature)}°C</strong>
        </div>
        <div class="meta-box">
          <p>Humidity</p>
          <strong>${current.relative_humidity_2m}%</strong>
        </div>
        <div class="meta-box">
          <p>Wind</p>
          <strong>${Math.round(current.wind_speed_10m)} km/h</strong>
        </div>
      </div>
    </div>

    <div class="forecast-grid">
      ${daily
        .map((day) => {
          const high = Math.round(day.temperature_2m_max);
          const low = Math.round(day.temperature_2m_min);
          return `
            <article class="forecast-card">
              <p class="day">${formatDay(day.time)}</p>
              <p class="icon">${getWeatherIcon(day.weathercode)}</p>
              <p class="forecast-temp">${high}° / ${low}°</p>
            </article>
          `;
        })
        .join('')}
    </div>
  `;

  weatherContent.classList.remove('hidden');
}

async function fetchWeather(city) {
  const trimmedCity = city.trim();

  if (!trimmedCity) {
    setStatus('Please enter a city name.', true);
    return;
  }

  setStatus('Loading weather...');

  try {
    const geoResponse = await fetch(
      `${BASE_URL}/search?name=${encodeURIComponent(trimmedCity)}&count=1&language=en&format=json`
    );

    if (!geoResponse.ok) {
      throw new Error('Could not connect to the weather service.');
    }

    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error('City not found. Please try another location.');
    }

    const location = geoData.results[0];

    const forecastResponse = await fetch(
      `${FORECAST_URL}?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
    );

    if (!forecastResponse.ok) {
      throw new Error('Could not load the forecast right now. Please try again.');
    }

    const forecastData = await forecastResponse.json();

    const data = {
      city: `${location.name}${location.country ? ', ' + location.country : ''}`,
      current: forecastData.current,
      daily: forecastData.daily.time.map((time, index) => ({
        time,
        weathercode: forecastData.daily.weathercode[index],
        temperature_2m_max: forecastData.daily.temperature_2m_max[index],
        temperature_2m_min: forecastData.daily.temperature_2m_min[index],
      })),
      description: getWeatherDescription(forecastData.current.weathercode),
    };

    renderWeather(data);
    setStatus(`Showing weather for ${data.city}.`);
  } catch (error) {
    weatherContent.classList.add('hidden');
    setStatus(error.message || 'Something went wrong. Please try again.', true);
  }
}

function getWeatherDescription(code) {
  if (code >= 200 && code < 300) return 'Thunderstorms';
  if (code >= 300 && code < 400) return 'Light rain';
  if (code >= 500 && code < 600) return 'Rain';
  if (code >= 600 && code < 700) return 'Snow';
  if (code >= 700 && code < 800) return 'Foggy';
  if (code === 800) return 'Clear sky';
  return 'Cloudy';
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const city = cityInput.value;

  window.clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(() => {
    fetchWeather(city);
  }, 300);
});

cityInput.addEventListener('input', () => {
  if (!cityInput.value.trim()) {
    setStatus('');
    weatherContent.classList.add('hidden');
  }
});

fetchWeather('London');
