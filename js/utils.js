export function formatNumber(n) {
    return new Intl.NumberFormat().format(n);
}

export function formatXP(xp) {
    if (xp >= 1000000) {
        return (xp / 1000000).toFixed(2) + ' MB';
    }
    if (xp >= 1000) {
        return (xp / 1000).toFixed(1) + ' KB';
    }
    return xp + ' B';
}

export function formatDate(isoString) {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function formatDateTime(isoString) {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function timeAgo(isoString) {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];
    
    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'just now';
}
