const API_KEY = 'f8f5328d659e4e9342a7d7c44d4b1db6';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

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

  const currentTemp = Math.round(current.temp - 273.15);
  const feelsLike = Math.round(current.feels_like - 273.15);
  const humidity = current.humidity;
  const wind = Math.round(current.wind_speed * 3.6);

  weatherContent.innerHTML = `
    <div class="current-weather">
      <div>
        <h2 class="city-name">${data.city}</h2>
        <div class="temp-row">
          <strong>${currentTemp}°C</strong>
          <span>${getWeatherIcon(current.weather[0].id)}</span>
        </div>
        <p class="forecast-summary">${current.weather[0].description}</p>
      </div>

      <div class="weather-meta">
        <div class="meta-box">
          <p>Feels like</p>
          <strong>${feelsLike}°C</strong>
        </div>
        <div class="meta-box">
          <p>Humidity</p>
          <strong>${humidity}%</strong>
        </div>
        <div class="meta-box">
          <p>Wind</p>
          <strong>${wind} km/h</strong>
        </div>
      </div>
    </div>

    <div class="forecast-grid">
      ${daily
        .map((day) => {
          const high = Math.round(day.temp.max - 273.15);
          const low = Math.round(day.temp.min - 273.15);
          return `
            <article class="forecast-card">
              <p class="day">${formatDay(day.dt * 1000)}</p>
              <p class="icon">${getWeatherIcon(day.weather[0].id)}</p>
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
  const encodedCity = encodeURIComponent(city.trim());

  if (!encodedCity) {
    setStatus('Please enter a city name.', true);
    return;
  }

  setStatus('Loading weather...');

  try {
    const geoResponse = await fetch(
      `${BASE_URL}/weather?q=${encodedCity}&appid=${API_KEY}&units=metric`
    );

    if (!geoResponse.ok) {
      throw new Error('City not found. Please try another location.');
    }

    const geoData = await geoResponse.json();

    const forecastResponse = await fetch(
      `${BASE_URL}/onecall?lat=${geoData.coord.lat}&lon=${geoData.coord.lon}&exclude=minutely,hourly,alerts&appid=${API_KEY}&units=metric`
    );

    if (!forecastResponse.ok) {
      throw new Error('Could not load the forecast right now. Please try again.');
    }

    const forecastData = await forecastResponse.json();
    const data = {
      city: geoData.name,
      current: forecastData.current,
      daily: forecastData.daily,
    };

    renderWeather(data);
    setStatus(`Showing weather for ${geoData.name}.`);
  } catch (error) {
    weatherContent.classList.add('hidden');
    setStatus(error.message || 'Something went wrong. Please try again.', true);
  }
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
