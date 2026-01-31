// Settings functionality

async function loadSettings() {
    try {
        const settings = await apiCall('/api/settings/gmail');
        
        // Populate form
        document.getElementById('whatsapp-enabled').checked = settings.notifications?.whatsapp?.enabled || false;
        document.getElementById('sms-enabled').checked = settings.notifications?.sms?.enabled || false;
        
        document.getElementById('alert-high').checked = settings.priorities?.alertOnHigh || false;
        document.getElementById('alert-medium').checked = settings.priorities?.alertOnMedium || false;
        document.getElementById('alert-low').checked = settings.priorities?.alertOnLow || false;
        
        document.getElementById('check-interval').value = settings.checking?.intervalMinutes || 60;
        document.getElementById('quiet-start').value = settings.checking?.quietHoursStart || '23:00';
        document.getElementById('quiet-end').value = settings.checking?.quietHoursEnd || '08:00';
        
    } catch (error) {
        console.error('Failed to load settings:', error);
        showToast('Failed to load settings', 'error');
    }
}

async function saveSettings() {
    try {
        const settings = {
            notifications: {
                whatsapp: {
                    enabled: document.getElementById('whatsapp-enabled').checked,
                    number: "13038176148"
                },
                sms: {
                    enabled: document.getElementById('sms-enabled').checked,
                    gateway: "3038176148@vtext.com"
                }
            },
            checking: {
                enabled: true,
                intervalMinutes: parseInt(document.getElementById('check-interval').value),
                quietHoursStart: document.getElementById('quiet-start').value,
                quietHoursEnd: document.getElementById('quiet-end').value
            },
            priorities: {
                alertOnHigh: document.getElementById('alert-high').checked,
                alertOnMedium: document.getElementById('alert-medium').checked,
                alertOnLow: document.getElementById('alert-low').checked
            }
        };

        await apiCall('/api/settings/gmail', {
            method: 'POST',
            body: JSON.stringify(settings)
        });

        showToast('Settings saved successfully!', 'success');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showToast('Failed to save settings', 'error');
    }
}
