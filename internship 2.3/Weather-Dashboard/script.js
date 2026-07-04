// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const themeToggle = document.getElementById('theme-toggle');
const unitToggle = document.getElementById('unit-toggle');
const errorMessage = document.getElementById('error-message');
const weatherContent = document.getElementById('weather-content');
const loadingSpinner = document.getElementById('loading-spinner');
const recentSearchesContainer = document.getElementById('recent-searches');
const refreshBtn = document.getElementById('refresh-btn');

// Weather DOM Elements
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const weatherIconEl = document.getElementById('weather-icon');
const currentTempEl = document.getElementById('current-temp');
const weatherConditionEl = document.getElementById('weather-condition');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const pressureEl = document.getElementById('pressure');
const uvIndexEl = document.getElementById('uv-index');
const forecastContainer = document.getElementById('forecast-container');
const updateTimeEl = document.getElementById('update-time');
const unitLabels = document.querySelectorAll('.unit');

// State Variables
let currentUnit = localStorage.getItem('weatherUnit') || 'celsius'; // 'celsius' or 'fahrenheit'
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
let lastFetchedCity = null;

// Initialize
function init() {
    // Set theme
    if (isDarkMode) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    // Set Unit Toggle Button
    unitToggle.textContent = currentUnit === 'celsius' ? '°F' : '°C';
    updateUnitLabels();

    // Render Search History
    renderSearchHistory();

    // Event Listeners
    searchBtn.addEventListener('click', () => handleSearch(cityInput.value));
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch(cityInput.value);
    });
    
    locationBtn.addEventListener('click', getCurrentLocation);
    themeToggle.addEventListener('click', toggleTheme);
    unitToggle.addEventListener('click', toggleUnit);
    refreshBtn.addEventListener('click', () => {
        if (lastFetchedCity) {
            handleSearch(lastFetchedCity.name, false); // Don't add to history again
        }
    });

    // Default city or geolocation on load
    if (navigator.geolocation && !lastFetchedCity) {
       // Optional: Auto fetch based on location on load if permission is already granted,
       // but it's better to let user click the button to avoid prompt on load.
       // We'll load a default city
       handleSearch('London', false);
    } else {
        handleSearch('London', false);
    }
}

// APIs
const GEOCODE_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

// Fetch Coordinates by City Name
async function getCoordinates(city) {
    try {
        const response = await fetch(`${GEOCODE_API_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            throw new Error('City not found');
        }
        
        return data.results[0]; // Returns { name, latitude, longitude, country_code, timezone }
    } catch (error) {
        throw error;
    }
}

// Fetch Weather Data by Coordinates
async function getWeatherData(lat, lon, timezone = 'auto') {
    try {
        const url = `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=${timezone}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch weather data');
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Main Search Handler
async function handleSearch(query, addToHistory = true) {
    if (!query.trim()) return;
    
    showLoading();
    hideError();
    
    try {
        // 1. Get Coordinates
        const locationData = await getCoordinates(query);
        
        // 2. Get Weather
        const weatherData = await getWeatherData(locationData.latitude, locationData.longitude, locationData.timezone);
        
        // 3. Process & Display
        displayCurrentWeather(locationData, weatherData.current);
        displayForecast(weatherData.daily);
        updateLastUpdatedTime();
        
        lastFetchedCity = locationData;
        
        if (addToHistory) {
            updateSearchHistory(locationData.name);
        }
        
        showWeatherContent();
        cityInput.value = ''; // clear input
    } catch (error) {
        console.error(error);
        showError('City not found. Please check the spelling and try again.');
        hideLoading();
        // Hide content if we don't have previous data
        if (!lastFetchedCity) {
            weatherContent.classList.add('hidden');
        }
    }
}

// Display Current Weather
function displayCurrentWeather(location, current) {
    // Info
    cityNameEl.textContent = `${location.name}${location.country_code ? ', ' + location.country_code : ''}`;
    
    // Format Date & Time based on timezone
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    
    // If API provided timezone string, format for that timezone
    let dateStr = now.toLocaleDateString('en-US', options);
    if (location.timezone) {
        try {
           dateStr = new Intl.DateTimeFormat('en-US', { ...options, timeZone: location.timezone }).format(now);
        } catch(e) {}
    }
    currentDateEl.textContent = dateStr;

    // Weather Data
    let tempC = current.temperature_2m;
    let feelsLikeC = current.apparent_temperature;
    
    currentTempEl.textContent = Math.round(convertTemp(tempC));
    feelsLikeEl.textContent = Math.round(convertTemp(feelsLikeC));
    
    humidityEl.textContent = `${current.relative_humidity_2m}%`;
    windSpeedEl.textContent = `${current.wind_speed_10m} km/h`;
    pressureEl.textContent = `${current.pressure_msl} hPa`;
    
    // Interpret Weather Code
    const weatherInfo = getWeatherInfo(current.weather_code, current.is_day);
    weatherConditionEl.textContent = weatherInfo.description;
    
    // Set Icon (using local SVG or openweatermap icons equivalent mapping)
    // Here we'll use a public CDN for icons based on weather code mapping
    weatherIconEl.src = weatherInfo.iconUrl;
    weatherIconEl.alt = weatherInfo.description;
}

// Display Forecast
function displayForecast(daily) {
    forecastContainer.innerHTML = '';
    
    // Skip today (index 0), show next 5 days
    for (let i = 1; i <= 5; i++) {
        if (!daily.time[i]) break;
        
        const dateObj = new Date(daily.time[i]);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        
        const maxTempC = daily.temperature_2m_max[i];
        const minTempC = daily.temperature_2m_min[i];
        const maxTemp = Math.round(convertTemp(maxTempC));
        const minTemp = Math.round(convertTemp(minTempC));
        
        const weatherInfo = getWeatherInfo(daily.weather_code[i], 1); // Day icons for forecast
        
        const card = document.createElement('div');
        card.className = 'forecast-card glass-card';
        card.innerHTML = `
            <p class="forecast-date">${dayName}</p>
            <img class="forecast-icon" src="${weatherInfo.iconUrl}" alt="${weatherInfo.description}">
            <div class="forecast-temps">
                <span class="temp-max">${maxTemp}°</span>
                <span class="temp-min">${minTemp}°</span>
            </div>
        `;
        forecastContainer.appendChild(card);
    }
    
    // Update UV Index (from today's max)
    if (daily.uv_index_max && daily.uv_index_max[0] !== undefined) {
        uvIndexEl.textContent = daily.uv_index_max[0].toFixed(1);
    } else {
        uvIndexEl.textContent = 'N/A';
    }
}

// WMO Weather interpretation codes mapping
function getWeatherInfo(code, isDay) {
    let description = 'Unknown';
    let iconCode = '03d'; // default cloud
    
    // Code mapping based on Open-Meteo docs
    if (code === 0) { description = 'Clear sky'; iconCode = isDay ? '01d' : '01n'; }
    else if (code === 1) { description = 'Mainly clear'; iconCode = isDay ? '02d' : '02n'; }
    else if (code === 2) { description = 'Partly cloudy'; iconCode = isDay ? '03d' : '03n'; }
    else if (code === 3) { description = 'Overcast'; iconCode = '04d'; }
    else if (code === 45 || code === 48) { description = 'Fog'; iconCode = '50d'; }
    else if (code >= 51 && code <= 55) { description = 'Drizzle'; iconCode = '09d'; }
    else if (code >= 56 && code <= 57) { description = 'Freezing Drizzle'; iconCode = '09d'; }
    else if (code >= 61 && code <= 65) { description = 'Rain'; iconCode = '10d'; }
    else if (code >= 66 && code <= 67) { description = 'Freezing Rain'; iconCode = '13d'; }
    else if (code >= 71 && code <= 77) { description = 'Snow fall'; iconCode = '13d'; }
    else if (code >= 80 && code <= 82) { description = 'Rain showers'; iconCode = '09d'; }
    else if (code >= 85 && code <= 86) { description = 'Snow showers'; iconCode = '13d'; }
    else if (code === 95) { description = 'Thunderstorm'; iconCode = '11d'; }
    else if (code >= 96 && code <= 99) { description = 'Thunderstorm with hail'; iconCode = '11d'; }
    
    // We use openweathermap free icon CDN for simplicity visually
    return {
        description,
        iconUrl: `https://openweathermap.org/img/wn/${iconCode}@4x.png`
    };
}

// Utility: Convert Temperature
function convertTemp(celsius) {
    if (currentUnit === 'fahrenheit') {
        return (celsius * 9/5) + 32;
    }
    return celsius;
}

// Toggle Unit
function toggleUnit() {
    currentUnit = currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
    localStorage.setItem('weatherUnit', currentUnit);
    unitToggle.textContent = currentUnit === 'celsius' ? '°F' : '°C';
    updateUnitLabels();
    
    // Re-render data if we have it
    if (lastFetchedCity) {
        handleSearch(lastFetchedCity.name, false);
    }
}

function updateUnitLabels() {
    const symbol = currentUnit === 'celsius' ? '°C' : '°F';
    unitLabels.forEach(label => {
        label.textContent = symbol;
    });
}

// Toggle Theme
function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    
    if (isDarkMode) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

// Geolocation Handler
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser.");
        return;
    }
    
    showLoading();
    hideError();
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Reverse geocode to get city name
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
            const data = await response.json();
            
            let cityName = "Current Location";
            if (data.address) {
                cityName = data.address.city || data.address.town || data.address.village || data.address.county || "Local Area";
            }
            
            const weatherData = await getWeatherData(lat, lon);
            
            const locationData = {
                name: cityName,
                country_code: data.address ? data.address.country_code.toUpperCase() : '',
                latitude: lat,
                longitude: lon,
                timezone: 'auto'
            };
            
            displayCurrentWeather(locationData, weatherData.current);
            displayForecast(weatherData.daily);
            updateLastUpdatedTime();
            
            lastFetchedCity = locationData;
            showWeatherContent();
            
        } catch (error) {
            console.error(error);
            showError("Unable to retrieve weather for your location.");
            hideLoading();
        }
    }, (error) => {
        console.error(error);
        showError("Location access denied or unavailable.");
        hideLoading();
    });
}

// Search History Management
function updateSearchHistory(city) {
    // Remove if exists
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== city.toLowerCase());
    // Add to beginning
    searchHistory.unshift(city);
    // Keep max 5
    if (searchHistory.length > 5) {
        searchHistory.pop();
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    renderSearchHistory();
}

function renderSearchHistory() {
    recentSearchesContainer.innerHTML = '';
    searchHistory.forEach(city => {
        const span = document.createElement('span');
        span.className = 'history-tag';
        span.textContent = city;
        span.addEventListener('click', () => {
            cityInput.value = city;
            handleSearch(city);
        });
        recentSearchesContainer.appendChild(span);
    });
}

// UI State Helpers
function showLoading() {
    loadingSpinner.classList.remove('hidden');
    weatherContent.classList.add('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showWeatherContent() {
    hideLoading();
    weatherContent.classList.remove('hidden');
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    updateTimeEl.textContent = timeStr;
}

// Start app
init();
