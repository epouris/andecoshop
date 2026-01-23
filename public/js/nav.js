// Navigation functionality - Render brand links in client navigation menu
function renderBrandsMenu() {
    // Only render on client pages (not admin)
    if (window.location.pathname.includes('admin.html')) {
        return;
    }

    const nav = document.querySelector('.nav');
    if (!nav) return;

    // Wait for data to be available
    if (typeof getBrands !== 'function' || !window.cacheInitialized) {
        // Wait for data to load
        window.addEventListener('dataLoaded', renderBrandsMenu, { once: true });
        setTimeout(() => {
            if (typeof getBrands === 'function' && window.cacheInitialized) {
                renderBrandsMenu();
            }
        }, 1000);
        return;
    }

    // Get brands from database
    const brands = getBrands();
    
    // Remove existing brand links (but keep Home link)
    const homeLink = nav.querySelector('.nav-link[href="index.html"]');
    const allLinks = nav.querySelectorAll('.nav-link');
    allLinks.forEach(link => {
        // Keep only the Home link
        if (link.href.includes('index.html') || link === homeLink) {
            return;
        }
        // Remove all other links (Admin, Brands, etc.)
        link.remove();
    });

    // Add brand links after Home link
    brands.forEach(brand => {
        const brandLink = document.createElement('a');
        brandLink.href = `brand.html?brand=${encodeURIComponent(brand.name)}`;
        brandLink.className = 'nav-link';
        
        // Set active state if current page matches this brand
        const urlParams = new URLSearchParams(window.location.search);
        const currentBrand = urlParams.get('brand');
        if (currentBrand === brand.name) {
            brandLink.classList.add('active');
        }
        
        brandLink.textContent = brand.name;
        nav.appendChild(brandLink);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Render brand menu
    renderBrandsMenu();
    
    // Update shop logo if configured
    if (typeof updateShopLogo === 'function') {
        updateShopLogo();
    }
});
