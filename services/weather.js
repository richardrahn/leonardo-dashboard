/**
 * Weather Service
 * Uses Open-Meteo API for weather data (no API key required)
 */

const https = require('https');

class WeatherService {
    constructor() {
        this.cache = {
            lastWeather: null,
            lastFetched: null,
            cacheDuration: 30 * 60 * 1000, // 30 minutes
        };
        
        // Boulder, Colorado coordinates
        this.location = {
            name: 'Boulder, CO',
            latitude: 40.0150,
            longitude: -105.2705
        };
    }

    /**
     * Get current weather
     */
    async getCurrentWeather(location = null) {
        // Check cache first
        if (this.cache.lastWeather &&
            this.cache.lastFetched &&
            Date.now() - this.cache.lastFetched < this.cacheDuration) {
            console.log('[Weather] Returning cached weather');
            return this.cache.lastWeather;
        }

        console.log('[Weather] Fetching fresh weather data from Open-Meteo...');

        try {
            const weatherData = await this.fetchOpenMeteo();
            const weather = this.parseWeatherData(weatherData);
            
            // Cache the result
            this.cache.lastWeather = weather;
            this.cache.lastFetched = Date.now();

            return weather;
        } catch (error) {
            console.error('[Weather] Fetch failed:', error.message);
            return this.getFallbackWeather();
        }
    }

    /**
     * Fetch weather from Open-Meteo API
     */
    fetchOpenMeteo() {
        return new Promise((resolve, reject) => {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.location.latitude}&longitude=${this.location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Denver`;

            https.get(url, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (error) {
                        reject(new Error('Failed to parse weather data'));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Parse Open-Meteo weather data
     */
    parseWeatherData(data) {
        const current = data.current;
        const temp = Math.round(current.temperature_2m);
        const feelsLike = Math.round(current.apparent_temperature);
        const weatherCode = current.weather_code;
        const windSpeed = Math.round(current.wind_speed_10m);
        
        const condition = this.getConditionFromCode(weatherCode);
        const emoji = this.getEmojiFromCode(weatherCode);
        const suggestion = this.generateSuggestion(temp, weatherCode, windSpeed);

        return {
            success: true,
            temperature: `${temp}°F`,
            feelsLike: `${feelsLike}°F`,
            condition: condition,
            emoji: emoji,
            windSpeed: `${windSpeed} mph`,
            humidity: `${current.relative_humidity_2m}%`,
            fullDescription: `${temp}°F and ${condition.toLowerCase()} in ${this.location.name}. Feels like ${feelsLike}°F.`,
            suggestion: suggestion,
            fetchedAt: Date.now(),
        };
    }

    /**
     * Convert WMO weather code to condition string
     */
    getConditionFromCode(code) {
        const conditions = {
            0: 'Clear',
            1: 'Mostly Clear',
            2: 'Partly Cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Foggy',
            51: 'Light Drizzle',
            53: 'Drizzle',
            55: 'Heavy Drizzle',
            61: 'Light Rain',
            63: 'Rain',
            65: 'Heavy Rain',
            71: 'Light Snow',
            73: 'Snow',
            75: 'Heavy Snow',
            77: 'Snow Grains',
            80: 'Light Showers',
            81: 'Showers',
            82: 'Heavy Showers',
            85: 'Light Snow Showers',
            86: 'Snow Showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with Hail',
            99: 'Heavy Thunderstorm'
        };
        return conditions[code] || 'Unknown';
    }

    /**
     * Get emoji for weather code
     */
    getEmojiFromCode(code) {
        if (code === 0) return '☀️';
        if (code <= 2) return '🌤️';
        if (code === 3) return '☁️';
        if (code >= 45 && code <= 48) return '🌫️';
        if (code >= 51 && code <= 55) return '🌦️';
        if (code >= 61 && code <= 67) return '🌧️';
        if (code >= 71 && code <= 77) return '❄️';
        if (code >= 80 && code <= 82) return '🌧️';
        if (code >= 85 && code <= 86) return '🌨️';
        if (code >= 95) return '⛈️';
        return '🌤️';
    }

    /**
     * Generate outfit/activity suggestion
     */
    generateSuggestion(temp, weatherCode, windSpeed) {
        // Rain/snow conditions
        if (weatherCode >= 61 && weatherCode <= 67) {
            return '☔ Bring an umbrella';
        }
        if (weatherCode >= 71 && weatherCode <= 86) {
            return '⛄ Watch for ice and snow';
        }
        if (weatherCode >= 95) {
            return '⚠️ Stay safe - thunderstorms';
        }

        // Temperature-based
        if (temp < 32) {
            return '🧥 Bundle up - freezing temps';
        } else if (temp < 45) {
            return '🧥 Dress warm';
        } else if (temp < 60) {
            return '👕 Light jacket weather';
        } else if (temp < 75) {
            return '😎 Perfect weather!';
        } else if (temp < 85) {
            return '🕶️ Stay hydrated';
        } else {
            return '♨️ Hot! Stay cool & hydrated';
        }
    }

    /**
     * Get fallback weather when fetch fails
     */
    getFallbackWeather() {
        return {
            success: false,
            temperature: null,
            condition: 'Unknown',
            emoji: '🌤️',
            fullDescription: 'Weather information unavailable. Check back soon!',
            suggestion: '🌤️ Have a great day',
            fetchedAt: Date.now(),
        };
    }

    /**
     * Clear cache (force refresh)
     */
    clearCache() {
        this.cache.lastWeather = null;
        this.cache.lastFetched = null;
    }
}

module.exports = new WeatherService();
