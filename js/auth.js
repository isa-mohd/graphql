const TOKEN_KEY = 'reboot01_jwt';

function base64Encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function base64UrlDecode(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
    const decoded = decodeURIComponent(
        Array.from(atob(padded))
            .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
    );
    return JSON.parse(decoded);
}

export function decodeJwtClaims(token) {
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;
        
        const decoded = base64UrlDecode(payload);
        
        // Extract user ID from various possible locations
        const hasuraClaims = decoded['https://hasura.io/jwt/claims'];
        const hasuraUserId = hasuraClaims?.['x-hasura-user-id'];
        
        return {
            raw: decoded,
            userId: hasuraUserId ? Number(hasuraUserId) : 
                   decoded.userId ? Number(decoded.userId) : 
                   decoded.sub ? Number(decoded.sub) : null
        };
    } catch (e) {
        console.error('Failed to decode JWT:', e);
        return null;
    }
}

export async function signinWithBasicAuth({ url, identifier, password }) {
    console.log('signinWithBasicAuth called with URL:', url);
    const credentials = base64Encode(`${identifier}:${password}`);
    
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });
        console.log('Fetch response status:', response.status);
    } catch (fetchError) {
        console.error('Fetch failed:', fetchError);
        throw new Error(`Network error: ${fetchError.message}`);
    }
    
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid username/email or password');
        }
        const text = await response.text().catch(() => '');
        throw new Error(`Sign in failed (${response.status}). ${text}`.trim());
    }
    
    // Try multiple ways to extract the JWT
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const authHeader = response.headers.get('authorization');
    const rawText = (await response.text().catch(() => '')).trim();
    
    let token = null;
    
    // 1. Check Authorization header
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
    }
    
    // 2. Try parsing as JSON
    if (!token && (contentType.includes('json') || rawText.startsWith('{') || rawText.startsWith('['))) {
        try {
            const body = JSON.parse(rawText);
            token = body?.token || body?.jwt || body?.access_token || body?.accessToken;
        } catch {
            // Not JSON
        }
    }
    
    // 3. Use raw text as token
    if (!token && rawText) {
        token = rawText.replace(/^"|"$/g, ''); // Remove quotes if present
    }
    
    // Validate JWT format
    if (!token || token.split('.').length !== 3) {
        const preview = rawText.slice(0, 50) + (rawText.length > 50 ? '...' : '');
        throw new Error(`Sign in succeeded but response was not a valid JWT. Response: ${preview || '(empty)'}`);
    }
    
    setToken(token);
    return token;
}
