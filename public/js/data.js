// Data management using API with local caching
// This file provides backward compatibility while using the API

let productsCache = [];
let brandsCache = [];
let ordersCache = [];
let shopLogoCache = '';
let cacheInitialized = false;

// Make cacheInitialized accessible globally
window.cacheInitialized = false;

// Initialize data from API
async function initializeData() {
  if (cacheInitialized) return;
  
  try {
    // Import API functions
    const api = await import('./api.js');
    
    // Load all data
    productsCache = await api.getProducts();
    brandsCache = await api.getBrands();
    shopLogoCache = await api.getShopLogo();
    
    // Only load orders if admin is authenticated
    try {
      ordersCache = await api.getOrders();
    } catch (e) {
      // Not authenticated, that's ok
      ordersCache = [];
    }
    
    cacheInitialized = true;
    window.cacheInitialized = true;
    
    console.log(`Data loaded: ${productsCache.length} products, ${brandsCache.length} brands`);
    
    // Update logo display
    updateShopLogo();
    
    // Dispatch event to notify that data is loaded
    window.dispatchEvent(new CustomEvent('dataLoaded'));
  } catch (error) {
    console.error('Error initializing data:', error);
    // Fallback to empty arrays
    productsCache = [];
    brandsCache = [];
    ordersCache = [];
    window.cacheInitialized = true; // Set to true even on error so pages don't wait forever
  }
}

// Initialize immediately
initializeData();

// Product management functions
function getProducts() {
  return productsCache;
}

function getProductById(id) {
  return productsCache.find(p => p.id == id);
}

async function addProduct(product) {
  try {
    const api = await import('./api.js');
    const newProduct = await api.createProduct(product);
    productsCache.push(newProduct);
    return newProduct;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

async function updateProduct(id, updatedProduct) {
  try {
    const api = await import('./api.js');
    const updated = await api.updateProduct(id, updatedProduct);
    const index = productsCache.findIndex(p => p.id == id);
    if (index !== -1) {
      productsCache[index] = updated;
    }
    return updated;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

async function deleteProduct(id) {
  try {
    const api = await import('./api.js');
    await api.deleteProduct(id);
    productsCache = productsCache.filter(p => p.id != id);
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// Brand management functions
function getBrands() {
  return brandsCache;
}

function getBrandByName(name) {
  return brandsCache.find(b => b.name === name);
}

async function addBrand(brand) {
  try {
    const api = await import('./api.js');
    const newBrand = await api.createBrand(brand);
    brandsCache.push(newBrand);
    return newBrand;
  } catch (error) {
    console.error('Error adding brand:', error);
    throw error;
  }
}

async function updateBrand(id, updatedBrand) {
  try {
    const api = await import('./api.js');
    const updated = await api.updateBrand(id, updatedBrand);
    const index = brandsCache.findIndex(b => b.id == id);
    if (index !== -1) {
      brandsCache[index] = updated;
    }
    return updated;
  } catch (error) {
    console.error('Error updating brand:', error);
    throw error;
  }
}

async function deleteBrand(id) {
  try {
    const api = await import('./api.js');
    await api.deleteBrand(id);
    brandsCache = brandsCache.filter(b => b.id != id);
    return true;
  } catch (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
}

// Shop logo management functions
function getShopLogo() {
  return shopLogoCache;
}

async function setShopLogo(logoUrl) {
  try {
    const api = await import('./api.js');
    await api.setShopLogo(logoUrl);
    shopLogoCache = logoUrl || '';
    updateShopLogo();
  } catch (error) {
    console.error('Error setting logo:', error);
    throw error;
  }
}

// Function to update logo display in header
function updateShopLogo() {
  const logoUrl = getShopLogo();
  const logoElements = document.querySelectorAll('.logo');
  
  logoElements.forEach(logoEl => {
    const logoImg = logoEl.querySelector('img.shop-logo-img');
    const logoText = logoEl.querySelector('.logo-text');
    
    // Always ensure text exists
    if (!logoText) {
      const textSpan = document.createElement('span');
      textSpan.className = 'logo-text';
      textSpan.textContent = 'AndecoMarine.shop';
      logoEl.appendChild(textSpan);
    }
    
    if (logoUrl) {
      // If logo URL exists, show image alongside text (logo on left, text on right)
      if (!logoImg) {
        // Create image element if it doesn't exist
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = 'AndecoMarine.shop';
        img.className = 'shop-logo-img';
        img.onerror = function() {
          // If image fails to load, hide it but keep text visible
          this.style.display = 'none';
        };
        
        // Insert image before text (so it appears on the left)
        const textEl = logoEl.querySelector('.logo-text');
        if (textEl) {
          logoEl.insertBefore(img, textEl);
        } else {
          logoEl.appendChild(img);
        }
        img.style.display = 'block';
      } else {
        // Update existing image
        logoImg.src = logoUrl;
        logoImg.style.display = 'block';
      }
      
      // Always show text alongside logo
      if (logoText) logoText.style.display = 'block';
    } else {
      // If no logo URL, hide image but show text
      if (logoImg) logoImg.style.display = 'none';
      if (logoText) logoText.style.display = 'block';
    }
  });
}

// Order management functions
function getOrders() {
  return ordersCache;
}

async function addOrder(order) {
  try {
    const api = await import('./api.js');
    const newOrder = await api.createOrder(order);
    ordersCache.unshift(newOrder);
    return newOrder;
  } catch (error) {
    console.error('Error adding order:', error);
    throw error;
  }
}

function getOrderById(id) {
  return ordersCache.find(o => o.id == id);
}

async function updateOrderStatus(id, status) {
  try {
    const api = await import('./api.js');
    const updated = await api.updateOrderStatus(id, status);
    const index = ordersCache.findIndex(o => o.id == id);
    if (index !== -1) {
      ordersCache[index] = updated;
    }
    return updated;
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
}

async function deleteOrder(id) {
  try {
    const api = await import('./api.js');
    await api.deleteOrder(id);
    ordersCache = ordersCache.filter(o => o.id != id);
    return true;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
}

// Refresh cache functions (for admin use)
async function refreshProducts() {
  try {
    const api = await import('./api.js');
    productsCache = await api.getProducts();
  } catch (error) {
    console.error('Error refreshing products:', error);
  }
}

async function refreshBrands() {
  try {
    const api = await import('./api.js');
    brandsCache = await api.getBrands();
  } catch (error) {
    console.error('Error refreshing brands:', error);
  }
}

async function refreshOrders() {
  try {
    const api = await import('./api.js');
    ordersCache = await api.getOrders();
  } catch (error) {
    console.error('Error refreshing orders:', error);
  }
}

async function refreshShopLogo() {
  try {
    const api = await import('./api.js');
    shopLogoCache = await api.getShopLogo();
    updateShopLogo();
  } catch (error) {
    console.error('Error refreshing logo:', error);
  }
}
