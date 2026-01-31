// Weather Widget functionality

let weatherData = null;

/**
 * Load and display weather
 */
async function loadWeather() {
    try {
        const response = await fetch('/api/weather');
        weatherData = await response.json();
        displayWeather();
    } catch (error) {
        console.error('[Weather] Failed to load:', error);
        showWeatherError();
    }
}

/**
 * Display weather in the UI
 */
function displayWeather() {
    const container = document.getElementById('weather-widget');
    if (!container) return;

    if (!weatherData) {
        showWeatherError();
        return;
    }

    const temp = weatherData.temperature || '??';
    const condition = weatherData.condition || 'Unknown';
    const emoji = weatherData.emoji || '🌤️';
    const suggestion = weatherData.suggestion || 'Have a great day!';

    container.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-5xl">${emoji}</span>
                    <div>
                        <div class="text-3xl font-bold">${escapeHtml(temp)}</div>
                        <div class="text-sm text-slate-400">${escapeHtml(condition)}</div>
                    </div>
                </div>
                <div class="text-sm text-slate-300 mt-3">
                    ${escapeHtml(suggestion)}
                </div>
            </div>
            <button onclick="refreshWeather()" class="text-slate-400 hover:text-white transition text-xs">
                🔄
            </button>
        </div>
    `;
}

/**
 * Show error state
 */
function showWeatherError() {
    const container = document.getElementById('weather-widget');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center text-slate-400 py-4">
            <div class="text-3xl mb-2">🌤️</div>
            <div class="text-sm">Weather unavailable</div>
            <button onclick="refreshWeather()" class="text-blue-400 hover:text-blue-300 text-xs mt-2">
                Try again
            </button>
        </div>
    `;
}

/**
 * Refresh weather data
 */
async function refreshWeather() {
    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳';
    }

    try {
        const response = await fetch('/api/weather/refresh', { method: 'POST' });
        weatherData = await response.json();
        displayWeather();
    } catch (error) {
        console.error('[Weather] Refresh failed:', error);
        showWeatherError();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔄';
        }
    }
}
