// Navigation functionality - Render brands dropdown on all pages
function renderBrandsDropdown() {
    const brandsMenu = document.getElementById('brandsMenu');
    if (!brandsMenu) return;

    // Get all brands from products
    const allProducts = getProducts();
    const brands = {};
    
    allProducts.forEach(product => {
        const brand = product.category || 'No Brand';
        if (!brands[brand]) {
            brands[brand] = {
                name: brand,
                productCount: 0
            };
        }
        brands[brand].productCount++;
    });

    const brandArray = Object.values(brands).sort((a, b) => a.name.localeCompare(b.name));
    
    if (brandArray.length === 0) {
        brandsMenu.innerHTML = '<a href="index.html">No brands available</a>';
        return;
    }

    brandsMenu.innerHTML = brandArray.map(brand => `
        <a href="brand.html?brand=${encodeURIComponent(brand.name)}">${brand.name} (${brand.productCount})</a>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    // Render on page load
    renderBrandsDropdown();
    
    // Update shop logo if configured
    if (typeof updateShopLogo === 'function') {
        updateShopLogo();
    }
});
