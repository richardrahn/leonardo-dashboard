// Authentication utilities

async function verifyToken(token) {
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        const data = await response.json();
        return data.valid ? data : null;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

function getToken() {
    return localStorage.getItem('token');
}

function getUsername() {
    return localStorage.getItem('username');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login.html';
}

// API helper with auth
async function apiCall(endpoint, options = {}) {
    const token = getToken();

    if (!token) {
        logout();
        throw new Error('No token');
    }

    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (response.status === 401) {
            logout();
            throw new Error('Unauthorized');
        }

        // Handle non-JSON responses (like file downloads)
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/json')) {
            return response;
        }

        return response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}
