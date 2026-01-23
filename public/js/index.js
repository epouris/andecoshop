// Create a data URI placeholder image that always works (defined globally)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f1f5f9" width="400" height="400"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

// Make function globally accessible for inline onerror handlers
window.handleImageError = function(img) {
    if (img.src !== PLACEHOLDER_IMAGE) {
        img.src = PLACEHOLDER_IMAGE;
        img.onerror = null; // Prevent infinite loop
    }
};

// Get all brands from products and merge with brand data
function getAllBrands() {
    const allProducts = getProducts();
    const brands = {};
    const brandData = getBrands(); // Get brand logos from brand management
    
    allProducts.forEach(product => {
        const brand = product.category || 'No Brand';
        if (!brands[brand]) {
            // Check if brand has logo in brand management
            const brandInfo = brandData.find(b => b.name === brand);
            brands[brand] = {
                name: brand,
                productCount: 0,
                images: [],
                logo: brandInfo ? brandInfo.logo : null
            };
        }
        brands[brand].productCount++;
        // Collect up to 4 product images for split display
        if (product.images && product.images[0] && brands[brand].images.length < 4) {
            brands[brand].images.push(product.images[0]);
        }
    });

    return Object.values(brands).sort((a, b) => a.name.localeCompare(b.name));
}

// Main listing page functionality - Shows brands
document.addEventListener('DOMContentLoaded', async () => {
    const brandsGrid = document.getElementById('brandsGrid');
    const emptyState = document.getElementById('emptyState');

    if (!brandsGrid) {
        console.error('brandsGrid element not found');
        return;
    }

    // Wait for data to be initialized
    await new Promise((resolve) => {
        if (window.cacheInitialized) {
            resolve();
        } else {
            window.addEventListener('dataLoaded', resolve, { once: true });
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
        }
    });

    function renderBrands() {
        const brands = getAllBrands();
        console.log('Brands found:', brands);

        if (brands.length === 0) {
            brandsGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        brandsGrid.style.display = 'grid';
        emptyState.style.display = 'none';

        brandsGrid.innerHTML = brands.map(brand => {
            const images = brand.images.length > 0 ? brand.images : [PLACEHOLDER_IMAGE];
            const imageCount = Math.min(images.length, 4);
            
            // Create split image grid based on number of images
            let imageGrid = '';
            if (imageCount === 1) {
                imageGrid = `
                    <div class="brand-image-split single">
                        <img src="${images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                    </div>
                `;
            } else if (imageCount === 2) {
                imageGrid = `
                    <div class="brand-image-split two">
                        <img src="${images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                        <img src="${images[1] || images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                    </div>
                `;
            } else if (imageCount === 3) {
                imageGrid = `
                    <div class="brand-image-split three">
                        <img src="${images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                        <img src="${images[1] || images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                        <img src="${images[2] || images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                    </div>
                `;
            } else {
                imageGrid = `
                    <div class="brand-image-split four">
                        <img src="${images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                        <img src="${images[1] || images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                        <img src="${images[2] || images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                        <img src="${images[3] || images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                    </div>
                `;
            }
            
            // Use brand logo if available, otherwise use split product images
            const hasLogo = brand.logo && brand.logo.trim() !== '';
            
            return `
                <a href="brand.html?brand=${encodeURIComponent(brand.name)}" class="brand-card" data-brand-name="${brand.name}">
                    <div class="brand-image-container">
                        ${hasLogo ? `
                            <div class="brand-logo-container">
                                <img src="${getProxiedImageUrl(brand.logo)}" alt="${brand.name} Logo" class="brand-logo-main" data-fallback-images='${JSON.stringify(images.map(img => getProxiedImageUrl(img)))}'>
                            </div>
                        ` : imageGrid}
                        ${!hasLogo ? `
                        <div class="brand-overlay">
                            <h3 class="brand-name">${brand.name}</h3>
                        </div>
                        ` : ''}
                    </div>
                    <div class="brand-info">
                        ${hasLogo ? `<h3 class="brand-name-below">${brand.name}</h3>` : ''}
                        <p class="brand-count">${brand.productCount} ${brand.productCount === 1 ? 'product' : 'products'}</p>
                    </div>
                </a>
            `;
        }).join('');
    }

    // Render brands dropdown
    renderBrandsDropdown();

    // Initial render
    renderBrands();
    
    // Handle brand logo fallback
    setTimeout(() => {
        document.querySelectorAll('.brand-logo-main').forEach(img => {
            img.addEventListener('error', function() {
                const fallbackImages = JSON.parse(this.dataset.fallbackImages || '[]');
                if (fallbackImages.length > 0) {
                    const container = this.closest('.brand-logo-container');
                    if (container) {
                        const imageCount = Math.min(fallbackImages.length, 4);
                        let fallbackGrid = '';
                        if (imageCount === 1) {
                            fallbackGrid = `<div class="brand-image-split single"><img src="${fallbackImages[0]}" alt="" onerror="handleImageError(this)"></div>`;
                        } else if (imageCount === 2) {
                            fallbackGrid = `<div class="brand-image-split two"><img src="${fallbackImages[0]}" alt="" onerror="handleImageError(this)"><img src="${fallbackImages[1] || fallbackImages[0]}" alt="" onerror="handleImageError(this)"></div>`;
                        } else if (imageCount === 3) {
                            fallbackGrid = `<div class="brand-image-split three"><img src="${fallbackImages[0]}" alt="" onerror="handleImageError(this)"><img src="${fallbackImages[1] || fallbackImages[0]}" alt="" onerror="handleImageError(this)"><img src="${fallbackImages[2] || fallbackImages[0]}" alt="" onerror="handleImageError(this)"></div>`;
                        } else {
                            fallbackGrid = `<div class="brand-image-split four"><img src="${fallbackImages[0]}" alt="" onerror="handleImageError(this)"><img src="${fallbackImages[1] || fallbackImages[0]}" alt="" onerror="handleImageError(this)"><img src="${fallbackImages[2] || fallbackImages[0]}" alt="" onerror="handleImageError(this)"><img src="${fallbackImages[3] || fallbackImages[0]}" alt="" onerror="handleImageError(this)"></div>`;
                        }
                        container.innerHTML = fallbackGrid;
                    }
                }
            });
        });
    }, 100);
});
