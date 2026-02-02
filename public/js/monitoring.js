// System Monitoring functionality

let monitoringRefreshInterval = null;

/**
 * Load monitoring data
 */
async function loadMonitoring() {
    try {
        await Promise.all([
            loadHealthStatus(),
            loadPM2Status(),
            loadRecentLogs(),
        ]);

        // Auto-refresh every 30 seconds
        if (monitoringRefreshInterval) {
            clearInterval(monitoringRefreshInterval);
        }
        monitoringRefreshInterval = setInterval(refreshMonitoring, 30000);
    } catch (error) {
        console.error('[Monitoring] Failed to load:', error);
    }
}

/**
 * Refresh all monitoring data
 */
async function refreshMonitoring() {
    await loadMonitoring();
}

/**
 * Load overall health status
 */
async function loadHealthStatus() {
    try {
        const response = await fetch('/api/monitoring/health');
        const data = await response.json();

        // Update health icon
        const healthIcon = document.getElementById('health-icon');
        if (data.status === 'healthy') {
            healthIcon.textContent = '💚';
        } else if (data.status === 'degraded') {
            healthIcon.textContent = '💛';
        } else {
            healthIcon.textContent = '❤️';
        }

        // Display health status
        const statusContainer = document.getElementById('health-status');
        const uptimeHours = Math.floor(data.uptime / 3600);
        const uptimeMinutes = Math.floor((data.uptime % 3600) / 60);

        statusContainer.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <div class="text-sm text-slate-500">Status</div>
                    <div class="text-lg font-semibold ${getStatusColor(data.status)}">${data.status.toUpperCase()}</div>
                </div>
                <div>
                    <div class="text-sm text-slate-500">Uptime</div>
                    <div class="text-lg font-semibold">${uptimeHours}h ${uptimeMinutes}m</div>
                </div>
            </div>
        `;

        // Display services status
        displayServices(data.services);

        // Display system stats
        displaySystemStats(data.system);

    } catch (error) {
        console.error('[Monitoring] Health check failed:', error);
        document.getElementById('health-status').innerHTML = `
            <div class="text-red-400">Failed to load health status</div>
        `;
    }
}

/**
 * Display services status
 */
function displayServices(services) {
    const container = document.getElementById('services-status');
    
    if (!services || Object.keys(services).length === 0) {
        container.innerHTML = '<div class="text-slate-500">No services configured</div>';
        return;
    }

    container.innerHTML = Object.entries(services).map(([key, service]) => `
        <div class="bg-slate-700/50 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
                <div class="font-semibold">${service.name}</div>
                <div class="w-2 h-2 rounded-full ${service.healthy ? 'bg-green-500' : 'bg-red-500'}"></div>
            </div>
            <div class="text-sm ${service.healthy ? 'text-green-400' : 'text-red-400'}">
                ${service.status}
            </div>
            ${service.error ? `<div class="text-xs text-red-400 mt-1">${escapeHtml(service.error)}</div>` : ''}
        </div>
    `).join('');
}

/**
 * Display system statistics
 */
function displaySystemStats(system) {
    const container = document.getElementById('system-stats');

    if (!system) {
        container.innerHTML = '<div class="text-slate-500">System stats unavailable</div>';
        return;
    }

    const systemUptimeHours = Math.floor(system.uptime / 3600);
    const systemUptimeDays = Math.floor(systemUptimeHours / 24);

    container.innerHTML = `
        <div class="space-y-4">
            <div>
                <div class="text-sm text-slate-500 mb-1">Memory Usage</div>
                <div class="flex items-center gap-3">
                    <div class="flex-1 bg-slate-700 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full transition-all" 
                             style="width: ${system.memory.percentUsed}%"></div>
                    </div>
                    <div class="text-sm font-semibold">${system.memory.percentUsed}%</div>
                </div>
                <div class="text-xs text-slate-400 mt-1">
                    ${formatBytes(system.memory.used)} / ${formatBytes(system.memory.total)}
                </div>
            </div>

            <div>
                <div class="text-sm text-slate-500">CPU</div>
                <div class="text-base">${system.cpu.model}</div>
                <div class="text-xs text-slate-400">${system.cpu.cores} cores</div>
            </div>

            <div>
                <div class="text-sm text-slate-500">Load Average</div>
                <div class="text-base">${system.loadAvg.map(l => l.toFixed(2)).join(', ')}</div>
            </div>
        </div>

        <div class="space-y-4">
            <div>
                <div class="text-sm text-slate-500">System Uptime</div>
                <div class="text-base">${systemUptimeDays}d ${systemUptimeHours % 24}h</div>
            </div>

            <div>
                <div class="text-sm text-slate-500">Platform</div>
                <div class="text-base">${system.platform} ${system.arch}</div>
            </div>

            <div>
                <div class="text-sm text-slate-500">Node.js</div>
                <div class="text-base">${system.node}</div>
            </div>

            <div>
                <div class="text-sm text-slate-500">Hostname</div>
                <div class="text-base">${system.hostname}</div>
            </div>
        </div>
    `;
}

/**
 * Load PM2 process status
 */
async function loadPM2Status() {
    try {
        const response = await fetch('/api/monitoring/pm2');
        const data = await response.json();

        const container = document.getElementById('pm2-status');

        if (!data.success || !data.process) {
            container.innerHTML = `
                <div class="text-yellow-400">Server not managed by PM2</div>
            `;
            return;
        }

        const p = data.process;
        const uptime = Date.now() - p.uptime;
        const uptimeHours = Math.floor(uptime / (1000 * 3600));
        const uptimeMinutes = Math.floor((uptime % (1000 * 3600)) / (1000 * 60));

        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <div class="text-sm text-slate-500">Status</div>
                    <div class="text-lg font-semibold ${p.status === 'online' ? 'text-green-400' : 'text-red-400'}">
                        ${p.status}
                    </div>
                </div>
                <div>
                    <div class="text-sm text-slate-500">Uptime</div>
                    <div class="text-lg font-semibold">${uptimeHours}h ${uptimeMinutes}m</div>
                </div>
                <div>
                    <div class="text-sm text-slate-500">Restarts</div>
                    <div class="text-lg font-semibold">${p.restarts}</div>
                </div>
                <div>
                    <div class="text-sm text-slate-500">PID</div>
                    <div class="text-lg font-semibold">${p.pid}</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-4">
                <div>
                    <div class="text-sm text-slate-500">Memory</div>
                    <div class="text-base">${formatBytes(p.memory)}</div>
                </div>
                <div>
                    <div class="text-sm text-slate-500">CPU</div>
                    <div class="text-base">${p.cpu}%</div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('[Monitoring] PM2 status failed:', error);
        document.getElementById('pm2-status').innerHTML = `
            <div class="text-red-400">Failed to load PM2 status</div>
        `;
    }
}

/**
 * Load recent logs
 */
async function loadRecentLogs() {
    try {
        const response = await fetch('/api/monitoring/logs?limit=50');
        const data = await response.json();

        const container = document.getElementById('recent-logs');

        if (!data.success || !data.logs || data.logs.length === 0) {
            container.innerHTML = `<div class="text-slate-500">No recent logs</div>`;
            return;
        }

        container.innerHTML = data.logs.map(line => 
            `<div class="text-slate-300">${escapeHtml(line)}</div>`
        ).join('');

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;

    } catch (error) {
        console.error('[Monitoring] Logs failed:', error);
        document.getElementById('recent-logs').innerHTML = `
            <div class="text-red-400">Failed to load logs</div>
        `;
    }
}

/**
 * Helper: Get status color class
 */
function getStatusColor(status) {
    switch (status) {
        case 'healthy': return 'text-green-400';
        case 'degraded': return 'text-yellow-400';
        default: return 'text-red-400';
    }
}

/**
 * Helper: Format bytes to human-readable
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
