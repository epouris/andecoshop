// API configuration
const API_BASE_URL = window.location.origin + '/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('admin_token');
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { ...defaultOptions, ...options };
  
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

// Public API functions
export async function getProducts() {
  try {
    return await apiCall('/products');
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function getProductById(id) {
  try {
    return await apiCall(`/products/${id}`);
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function getBrands() {
  try {
    return await apiCall('/brands');
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
}

export async function getBrandByName(name) {
  try {
    return await apiCall(`/brands/name/${encodeURIComponent(name)}`);
  } catch (error) {
    console.error('Error fetching brand:', error);
    return null;
  }
}

export async function getShopLogo() {
  try {
    const data = await apiCall('/settings/logo');
    return data.logo || '';
  } catch (error) {
    console.error('Error fetching logo:', error);
    return '';
  }
}

export async function createOrder(order) {
  try {
    return await apiCall('/orders', {
      method: 'POST',
      body: order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

export async function createQuery(query) {
  try {
    return await apiCall('/queries', {
      method: 'POST',
      body: query,
    });
  } catch (error) {
    console.error('Error creating query:', error);
    throw error;
  }
}

// Admin API functions
export async function adminLogin(username, password) {
  try {
    const data = await apiCall('/admin/login', {
      method: 'POST',
      body: { username, password },
    });
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_username', data.username);
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export function adminLogout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
}

export function isAdminAuthenticated() {
  return !!localStorage.getItem('admin_token');
}

export async function getOrders() {
  try {
    return await apiCall('/admin/orders');
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

export async function getQueries() {
  try {
    return await apiCall('/admin/queries');
  } catch (error) {
    console.error('Error fetching queries:', error);
    throw error;
  }
}

export async function deleteQuery(id) {
  try {
    return await apiCall(`/admin/queries/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting query:', error);
    throw error;
  }
}

export async function getTraffic(period = 'day', date = null) {
  try {
    let url = `/admin/traffic?period=${encodeURIComponent(period)}`;
    if (date) {
      url += `&date=${encodeURIComponent(date)}`;
    }
    return await apiCall(url);
  } catch (error) {
    console.error('Error fetching traffic:', error);
    throw error;
  }
}

export async function getRealtimeTraffic() {
  try {
    return await apiCall('/admin/traffic/realtime');
  } catch (error) {
    console.error('Error fetching real-time traffic:', error);
    throw error;
  }
}

export async function trackVisit(path, referrer) {
  try {
    return await apiCall('/track', {
      method: 'POST',
      body: { path, referrer },
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.error('Error tracking visit:', error);
  }
}

export async function getOrderById(id) {
  try {
    return await apiCall(`/admin/orders/${id}`);
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
}

export async function updateOrderStatus(id, status) {
  try {
    return await apiCall(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
}

export async function deleteOrder(id) {
  try {
    return await apiCall(`/admin/orders/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
}

export async function createProduct(product) {
  try {
    return await apiCall('/admin/products', {
      method: 'POST',
      body: product,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export async function updateProduct(id, product) {
  try {
    return await apiCall(`/admin/products/${id}`, {
      method: 'PUT',
      body: product,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(id) {
  try {
    return await apiCall(`/admin/products/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

export async function updateProductOrder(id, direction) {
  try {
    return await apiCall(`/admin/products/${id}/order`, {
      method: 'PATCH',
      body: { direction },
    });
  } catch (error) {
    console.error('Error updating product order:', error);
    throw error;
  }
}

export async function createBrand(brand) {
  try {
    return await apiCall('/admin/brands', {
      method: 'POST',
      body: brand,
    });
  } catch (error) {
    console.error('Error creating brand:', error);
    throw error;
  }
}

export async function updateBrand(id, brand) {
  try {
    return await apiCall(`/admin/brands/${id}`, {
      method: 'PUT',
      body: brand,
    });
  } catch (error) {
    console.error('Error updating brand:', error);
    throw error;
  }
}

export async function deleteBrand(id) {
  try {
    return await apiCall(`/admin/brands/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
}

export async function setShopLogo(logoUrl) {
  try {
    return await apiCall('/admin/settings/logo', {
      method: 'PUT',
      body: { logo: logoUrl },
    });
  } catch (error) {
    console.error('Error setting logo:', error);
    throw error;
  }
}
