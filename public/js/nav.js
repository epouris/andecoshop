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
    
    // Remove existing brand links (but keep Home and Rentals links)
    const homeLink = nav.querySelector('.nav-link[href="index.html"]') || nav.querySelector('.nav-link[href="/"]');
    let rentalsLink = nav.querySelector('.nav-link[href="rentals.html"]');
    
    // Also check by text content in case href is different
    if (!rentalsLink) {
        const allNavLinks = nav.querySelectorAll('.nav-link');
        allNavLinks.forEach(link => {
            if (link.textContent.trim() === 'Rentals') {
                rentalsLink = link;
            }
        });
    }
    
    const allLinks = nav.querySelectorAll('.nav-link');
    allLinks.forEach(link => {
        // Keep only the Home and Rentals links
        const href = link.getAttribute('href') || '';
        const isHome = href.includes('index.html') || href === '/' || link === homeLink;
        const isRentals = href.includes('rentals.html') || link === rentalsLink || link.textContent.trim() === 'Rentals';
        if (isHome || isRentals) {
            return;
        }
        // Remove all other links (Admin, Brands, etc.)
        link.remove();
    });

    // Update Home link active state
    if (homeLink) {
        const isHomePage = window.location.pathname === '/' || 
                         window.location.pathname.endsWith('index.html') ||
                         window.location.pathname.endsWith('landing.html');
        if (isHomePage && !window.location.pathname.includes('rentals.html')) {
            homeLink.classList.add('active');
        } else {
            homeLink.classList.remove('active');
        }
    }

    // Add Rentals link if it doesn't exist
    if (!rentalsLink) {
        const rentalsNavLink = document.createElement('a');
        rentalsNavLink.href = 'rentals.html';
        rentalsNavLink.className = 'nav-link';
        
        // Set active state if on rentals page
        if (window.location.pathname.includes('rentals.html')) {
            rentalsNavLink.classList.add('active');
        }
        
        rentalsNavLink.textContent = 'Rentals';
        
        // Insert after Home link
        if (homeLink && homeLink.nextSibling) {
            nav.insertBefore(rentalsNavLink, homeLink.nextSibling);
        } else {
            nav.appendChild(rentalsNavLink);
        }
    } else {
        // Update active state for existing Rentals link
        if (window.location.pathname.includes('rentals.html')) {
            rentalsLink.classList.add('active');
        } else {
            rentalsLink.classList.remove('active');
        }
    }

    // Add brand links after Rentals link
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
