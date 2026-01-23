// Create a data URI placeholder image that always works (defined globally)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f1f5f9" width="400" height="400"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

// Make function globally accessible for inline onerror handlers
window.handleImageError = function(img) {
    if (img.src !== PLACEHOLDER_IMAGE) {
        img.src = PLACEHOLDER_IMAGE;
        img.onerror = null; // Prevent infinite loop
    }
};

// Brand page functionality - Shows products for a specific brand
document.addEventListener('DOMContentLoaded', async () => {
    const productsGrid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const brandTitle = document.getElementById('brandTitle');
    const urlParams = new URLSearchParams(window.location.search);
    const brandName = urlParams.get('brand');

    if (!brandName) {
        window.location.href = 'index.html';
        return;
    }

    // Wait for data to be initialized
    await new Promise((resolve) => {
        if (window.cacheInitialized && typeof getProducts !== 'undefined') {
            resolve();
        } else {
            window.addEventListener('dataLoaded', resolve, { once: true });
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
        }
    });

    function renderProductCard(product) {
        return `
            <a href="product.html?id=${product.id}" class="product-card">
                <div class="product-header">
                    <h3 class="product-name">${product.name}</h3>
                </div>
                <img src="${product.images && product.images[0] ? getProxiedImageUrl(product.images[0]) : PLACEHOLDER_IMAGE}" 
                     alt="${product.name}" 
                     class="product-image"
                     onerror="handleImageError(this)">
                <div class="product-info">
                    <p class="product-price">€${product.price.toFixed(2)} <span class="vat-badge">(excl. 19% VAT)</span></p>
                </div>
            </a>
        `;
    }

    function renderLuxuryModels(decodedBrandName) {
        const luxuryModelsSection = document.getElementById('luxuryModelsSection');
        const luxuryModelsGrid = document.getElementById('luxuryModelsGrid');
        
        // Only show for Olympic Ribs
        if (decodedBrandName !== 'Olympic Ribs') {
            luxuryModelsSection.style.display = 'none';
            return;
        }

        // Luxury models images for Olympic Ribs
        const luxuryModels = [
            {
                image: 'https://cdn.prod.website-files.com/66fea88084a63f96ada4583c/6921b536c89775bca22a0aaf_E1F31112-85FC-49F5-A3F6-E9805C752F00_1_201_a-p-500.jpeg',
                alt: '40SRC'
            },
            {
                image: 'https://cdn.prod.website-files.com/66fea88084a63f96ada4583c/674eced21ca3b15ecca46c0d_45SRC%20top--p-500.jpg',
                alt: '45SRC'
            },
            {
                image: 'https://cdn.prod.website-files.com/66fea88084a63f96ada4583c/674ecee680b693672fb5ad91_45SRC%20Stern%20top--p-500.jpg',
                alt: '45SRC Stern'
            },
            {
                image: 'https://cdn.prod.website-files.com/66fea88084a63f96ada4583c/6921b740386737526df998ac_40SR%20G2%20Thumbnail-p-500.jpeg',
                alt: '40SR'
            }
        ];

        luxuryModelsGrid.innerHTML = luxuryModels.map((model, index) => {
            const isFirst = index === 0;
            const isLast = index === luxuryModels.length - 1;
            let clipPath = '';
            let className = 'luxury-model-image';
            
            if (!isFirst && !isLast) {
                // Middle images: diagonal on both sides
                clipPath = 'polygon(2% 0%, 100% 0%, 98% 100%, 0% 100%)';
                className += ' luxury-model-middle';
            } else if (!isFirst) {
                // Last image: diagonal only on left
                clipPath = 'polygon(2% 0%, 100% 0%, 100% 100%, 0% 100%)';
                className += ' luxury-model-last';
            } else if (!isLast) {
                // First image: diagonal only on right
                clipPath = 'polygon(0% 0%, 98% 0%, 100% 100%, 0% 100%)';
                className += ' luxury-model-first';
            }
            
            return `
                <div class="luxury-model-item">
                    <div class="luxury-model-image-wrapper">
                        <img src="${getProxiedImageUrl(model.image)}" 
                             alt="${model.alt}" 
                             class="${className}"
                             ${clipPath ? `style="clip-path: ${clipPath};"` : ''}
                             onerror="handleImageError(this)">
                        <div class="luxury-model-name">${model.alt}</div>
                    </div>
                </div>
            `;
        }).join('');

        luxuryModelsSection.style.display = 'block';
    }

    function renderProducts() {
        const allProducts = getProducts();
        const brandProducts = allProducts.filter(product => 
            (product.category || 'No Brand') === brandName
        );

        const decodedBrandName = decodeURIComponent(brandName);
        
        // Get brand logo if available
        const brand = getBrandByName(decodedBrandName);
        const brandLogo = document.getElementById('brandLogo');
        if (brand && brand.logo) {
            brandLogo.src = getProxiedImageUrl(brand.logo);
            brandLogo.alt = `${decodedBrandName} Logo`;
            brandLogo.style.display = 'block';
            brandLogo.onerror = function() {
                this.style.display = 'none';
            };
        } else {
            brandLogo.style.display = 'none';
        }
        
        // Render luxury models section
        renderLuxuryModels(decodedBrandName);
        
        // Update title without product count
        brandTitle.textContent = decodedBrandName;

        if (brandProducts.length === 0) {
            productsGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        productsGrid.style.display = 'grid';
        emptyState.style.display = 'none';

        productsGrid.innerHTML = brandProducts.map(product => renderProductCard(product)).join('');
    }

    // Initial render
    renderProducts();
});
