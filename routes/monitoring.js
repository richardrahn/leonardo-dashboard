const express = require('express');
const router = express.Router();
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * GET /api/monitoring/health
 * Overall system health check
 */
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: await checkServices(),
            system: getSystemStats(),
        };

        const unhealthyServices = Object.values(health.services).filter(s => !s.healthy);
        if (unhealthyServices.length > 0) {
            health.status = 'degraded';
        }

        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
        });
    }
});

/**
 * GET /api/monitoring/pm2
 * PM2 process information
 */
router.get('/pm2', async (req, res) => {
    try {
        const { stdout } = await execPromise('pm2 jlist');
        const processes = JSON.parse(stdout);
        
        const leonardoProcess = processes.find(p => p.name === 'leonardo-dashboard');
        
        if (leonardoProcess) {
            res.json({
                success: true,
                process: {
                    name: leonardoProcess.name,
                    status: leonardoProcess.pm2_env.status,
                    uptime: leonardoProcess.pm2_env.pm_uptime,
                    restarts: leonardoProcess.pm2_env.restart_time,
                    memory: leonardoProcess.monit.memory,
                    cpu: leonardoProcess.monit.cpu,
                    pid: leonardoProcess.pid,
                },
            });
        } else {
            res.json({
                success: false,
                message: 'Process not found in PM2',
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/monitoring/logs
 * Recent error logs
 */
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const { stdout } = await execPromise(`pm2 logs leonardo-dashboard --lines ${limit} --nostream --raw`);
        
        const lines = stdout.split('\n').filter(line => line.trim()).slice(-limit);
        
        res.json({
            success: true,
            logs: lines,
            count: lines.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * Check health of various services
 */
async function checkServices() {
    const services = {};

    // Calendar
    try {
        const calendarService = require('../services/google-calendar');
        const configured = await calendarService.isConfigured();
        services.calendar = {
            name: 'Google Calendar',
            healthy: configured,
            status: configured ? 'connected' : 'not configured',
        };
    } catch (error) {
        services.calendar = {
            name: 'Google Calendar',
            healthy: false,
            status: 'error',
            error: error.message,
        };
    }

    // Weather
    try {
        const weatherService = require('../services/weather');
        const weather = await weatherService.getCurrentWeather();
        services.weather = {
            name: 'Weather',
            healthy: weather.success === true,
            status: weather.success ? 'operational' : 'degraded',
        };
    } catch (error) {
        services.weather = {
            name: 'Weather',
            healthy: false,
            status: 'error',
            error: error.message,
        };
    }

    // Database
    try {
        const db = require('../database/db');
        db.getSettings(); // Simple query to check DB is working
        services.database = {
            name: 'Database',
            healthy: true,
            status: 'operational',
        };
    } catch (error) {
        services.database = {
            name: 'Database',
            healthy: false,
            status: 'error',
            error: error.message,
        };
    }

    return services;
}

/**
 * Get system statistics
 */
function getSystemStats() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAvg: os.loadavg(),
        cpu: {
            model: os.cpus()[0].model,
            cores: os.cpus().length,
        },
        memory: {
            total: totalMem,
            free: freeMem,
            used: usedMem,
            percentUsed: ((usedMem / totalMem) * 100).toFixed(2),
        },
        node: process.version,
    };
}

module.exports = router;
