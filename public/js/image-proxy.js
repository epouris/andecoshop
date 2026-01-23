// Image proxy utility - helps bypass CORS issues for external images
// Use this function to get a proxied URL for external images

function getProxiedImageUrl(imageUrl) {
    // If no URL provided, return as-is
    if (!imageUrl) {
        return imageUrl;
    }
    
    // If it's already a data URI or relative path, return as-is
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('/') || !imageUrl.startsWith('http')) {
        return imageUrl;
    }
    
    // If it's from the same origin, return as-is
    try {
        const url = new URL(imageUrl);
        if (url.origin === window.location.origin) {
            return imageUrl;
        }
    } catch (e) {
        // Invalid URL, return as-is
        return imageUrl;
    }
    
    // For external URLs, use the proxy
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}

// Make it globally available
window.getProxiedImageUrl = getProxiedImageUrl;
