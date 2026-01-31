/**
 * Weather Service
 * Wrapper around Leonardo's weather skill for dashboard display
 */

const clawdbot = require('./clawdbot');

class WeatherService {
    constructor() {
        this.cache = {
            lastWeather: null,
            lastFetched: null,
            cacheDuration: 30 * 60 * 1000, // 30 minutes
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

        console.log('[Weather] Fetching fresh weather data...');

        try {
            // Ask Leonardo for weather
            const prompt = location
                ? `What's the weather like in ${location}? Just give me the key details: temperature, conditions, and a brief forecast for the next few hours.`
                : `What's the weather like? Just give me the key details: temperature, conditions, and a brief forecast for the next few hours.`;

            const response = await clawdbot.sendMessage(prompt);

            if (response && response.message) {
                const weather = this.parseWeatherResponse(response.message);
                
                // Cache the result
                this.cache.lastWeather = weather;
                this.cache.lastFetched = Date.now();

                return weather;
            } else {
                throw new Error('No weather response from Leonardo');
            }
        } catch (error) {
            console.error('[Weather] Fetch failed:', error.message);
            return this.getFallbackWeather();
        }
    }

    /**
     * Parse Leonardo's weather response
     */
    parseWeatherResponse(message) {
        // Try to extract key information from the response
        // This is basic parsing - Leonardo's response should be structured enough
        
        const tempMatch = message.match(/(\d+)°([CF])/i);
        const temp = tempMatch ? `${tempMatch[1]}°${tempMatch[2]}` : null;

        // Try to detect condition keywords
        let condition = 'Unknown';
        let emoji = '🌤️';
        const lowerMsg = message.toLowerCase();
        
        if (lowerMsg.includes('sunny') || lowerMsg.includes('clear')) {
            condition = 'Sunny';
            emoji = '☀️';
        } else if (lowerMsg.includes('cloud')) {
            condition = 'Cloudy';
            emoji = '☁️';
        } else if (lowerMsg.includes('rain')) {
            condition = 'Rainy';
            emoji = '🌧️';
        } else if (lowerMsg.includes('snow')) {
            condition = 'Snowy';
            emoji = '❄️';
        } else if (lowerMsg.includes('storm') || lowerMsg.includes('thunder')) {
            condition = 'Stormy';
            emoji = '⛈️';
        } else if (lowerMsg.includes('partly')) {
            condition = 'Partly Cloudy';
            emoji = '⛅';
        }

        return {
            success: true,
            temperature: temp,
            condition: condition,
            emoji: emoji,
            fullDescription: message,
            suggestion: this.generateSuggestion(message),
            fetchedAt: Date.now(),
        };
    }

    /**
     * Generate outfit/activity suggestion based on weather
     */
    generateSuggestion(weatherDescription) {
        const lower = weatherDescription.toLowerCase();

        if (lower.includes('rain') || lower.includes('storm')) {
            return '☔ Bring an umbrella';
        } else if (lower.includes('cold') || lower.includes('freez')) {
            return '🧥 Dress warm';
        } else if (lower.includes('hot') || lower.includes('warm')) {
            return '🕶️ Stay hydrated';
        } else if (lower.includes('snow')) {
            return '⛄ Watch for ice';
        } else if (lower.includes('sunny') || lower.includes('clear')) {
            return '😎 Great day for a walk';
        } else if (lower.includes('wind')) {
            return '🍃 Windproof jacket';
        } else {
            return '🌤️ Have a great day';
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
