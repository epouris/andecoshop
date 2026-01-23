// Admin portal functionality - wrapped in IIFE to prevent duplicate execution
(function() {
    'use strict';
    
    // Check if already initialized
    if (window.adminPageInitialized) {
        console.warn('Admin page already initialized, skipping duplicate load');
        return;
    }
    window.adminPageInitialized = true;
    
    // Create a data URI placeholder image for admin table
    window.ADMIN_PLACEHOLDER_IMAGE = window.ADMIN_PLACEHOLDER_IMAGE || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f1f5f9" width="100" height="100"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="12" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

    // Make function globally accessible for inline onerror handlers
    window.handleAdminImageError = window.handleAdminImageError || function(img) {
        if (img.src !== window.ADMIN_PLACEHOLDER_IMAGE) {
            img.src = window.ADMIN_PLACEHOLDER_IMAGE;
            img.onerror = null; // Prevent infinite loop
        }
    };

    // Wait for DOM and data to be ready
    let adminStarted = false;
    
    function initAdmin() {
        console.log('initAdmin called');
        
        // Prevent multiple starts
        if (adminStarted) {
            console.log('Admin already started, skipping');
            return;
        }
        
        // Wait for data to be initialized from database
        const waitForData = () => {
            if (window.cacheInitialized && typeof getProducts === 'function' && typeof getBrands === 'function') {
                console.log('Data ready, starting admin...');
                if (!adminStarted) {
                    adminStarted = true;
                    startAdmin();
                }
            } else {
                console.log('Waiting for data...', {
                    cacheInitialized: window.cacheInitialized,
                    getProducts: typeof getProducts,
                    getBrands: typeof getBrands
                });
                setTimeout(waitForData, 100);
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOMContentLoaded fired');
                waitForData();
            });
        } else {
            console.log('DOM already ready');
            waitForData();
        }
        
        // Also listen for dataLoaded event
        window.addEventListener('dataLoaded', () => {
            console.log('dataLoaded event received in admin.js');
            if (typeof getProducts === 'function' && typeof getBrands === 'function' && !adminStarted) {
                adminStarted = true;
                startAdmin();
            }
        }, { once: true });
    }
    
    function startAdmin() {
        console.log('startAdmin called - initializing admin functionality');
        
        const productsTableBody = document.getElementById('productsTableBody');
        const productModal = document.getElementById('productModal');
        const productForm = document.getElementById('productForm');
        const addProductBtn = document.getElementById('addProductBtn');
        const closeModalBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const addOptionBtn = document.getElementById('addOptionBtn');
        const optionsContainer = document.getElementById('optionsContainer');
        const modalTitle = document.getElementById('modalTitle');

        if (!productsTableBody || !productModal || !productForm) {
            console.error('Required admin page elements not found', {
                productsTableBody: !!productsTableBody,
                productModal: !!productModal,
                productForm: !!productForm
            });
            return;
        }
        
        console.log('All required elements found, proceeding with initialization');

        let editingProductId = null;
        let optionCounter = 0;

        function removeOption(optionId) {
            const optionDiv = document.getElementById(optionId);
            if (optionDiv) {
                optionDiv.remove();
            }
        }

        function createOptionElement(optionData = null) {
            const optionId = `option-${optionCounter++}`;
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item-form';
            optionDiv.id = optionId;

            const name = optionData ? optionData.name : '';
            const type = optionData ? optionData.type : 'radio';
            const required = optionData ? optionData.required : true;
            const choices = optionData ? optionData.choices : [{ label: '', price: 0 }];

            // Escape HTML to prevent XSS
            const escapeHtml = (text) => {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            };

            optionDiv.innerHTML = `
                <div style="flex: 1;">
                    <label>Option Name</label>
                    <input type="text" class="option-name" value="${escapeHtml(name)}" placeholder="e.g., Color, Size">
                </div>
                <div style="flex: 1;">
                    <label>Type</label>
                    <select class="option-type">
                        <option value="radio" ${type === 'radio' ? 'selected' : ''}>Radio</option>
                        <option value="checkbox" ${type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
                    </select>
                </div>
                <div>
                    <label>Required</label>
                    <input type="checkbox" class="option-required" ${required ? 'checked' : ''}>
                </div>
                <div style="flex: 2;">
                    <label>Choices (JSON)</label>
                    <textarea class="option-choices" rows="3" placeholder='[{"label": "Red", "price": 0}, {"label": "Blue", "price": 10}]'>${escapeHtml(JSON.stringify(choices, null, 2))}</textarea>
                </div>
                <button type="button" class="btn btn-danger" data-remove-option="${optionId}">Remove</button>
            `;

            // Use event delegation instead of inline onclick
            const removeBtn = optionDiv.querySelector(`[data-remove-option="${optionId}"]`);
            removeBtn.addEventListener('click', () => removeOption(optionId));

            return optionDiv;
        }

        function addOptionToForm(optionData = null) {
            const optionElement = createOptionElement(optionData);
            optionsContainer.appendChild(optionElement);
        }

        function renderProductsTable() {
            if (typeof getProducts !== 'function' || typeof getBrands !== 'function') {
                console.error('getProducts or getBrands not available');
                if (productsTableBody) {
                    productsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading products...</td></tr>';
                }
                return;
            }
            
            if (!productsTableBody) {
                console.error('productsTableBody not found');
                return;
            }
            
            const products = getProducts();
            const brands = getBrands();
            
            // Sort products by displayOrder (already sorted by API, but ensure it here too)
            const sortedProducts = [...products].sort((a, b) => {
                const orderA = a.displayOrder || 0;
                const orderB = b.displayOrder || 0;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                // If same order, sort by id as fallback
                return parseInt(a.id) - parseInt(b.id);
            });
            
            console.log('Rendering products table:', sortedProducts.length, 'products,', brands.length, 'brands');
            
            if (sortedProducts.length === 0) {
                productsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No products found. Click "Add New Product" to get started.</td></tr>';
                return;
            }
            
            // Group products by brand
            const productsByBrand = {};
            sortedProducts.forEach(product => {
                const brand = product.category || 'No Brand';
                if (!productsByBrand[brand]) {
                    productsByBrand[brand] = [];
                }
                productsByBrand[brand].push(product);
            });
            
            // Sort brands alphabetically
            const sortedBrands = Object.keys(productsByBrand).sort((a, b) => a.localeCompare(b));
            
            // Use DocumentFragment for better performance
            const fragment = document.createDocumentFragment();
            
            // Escape HTML to prevent XSS
            const escapeHtml = (text) => {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            };
            
            sortedBrands.forEach(brandName => {
                const brandProducts = productsByBrand[brandName];
                const brandInfo = brands.find(b => b.name === brandName);
                
                // Create brand header row
                const headerRow = document.createElement('tr');
                headerRow.className = 'brand-header-row';
                const productCount = brandProducts.length;
                // Use image proxy for external brand logos
                let brandLogoUrl = '';
                if (brandInfo && brandInfo.logo) {
                    if (brandInfo.logo.startsWith('http') && !brandInfo.logo.startsWith(window.location.origin)) {
                        brandLogoUrl = `/api/image-proxy?url=${encodeURIComponent(brandInfo.logo)}`;
                    } else {
                        brandLogoUrl = brandInfo.logo;
                    }
                }
                
                headerRow.innerHTML = `
                    <td colspan="6" class="brand-header-cell">
                        <div class="brand-header-content">
                            ${brandLogoUrl ? `
                                <img src="${escapeHtml(brandLogoUrl)}" alt="${escapeHtml(brandName)} Logo" class="brand-header-logo" onerror="this.style.display='none'">
                            ` : ''}
                            <h3 class="brand-header-title">${escapeHtml(brandName)}</h3>
                            <span class="brand-header-count">(${productCount} ${productCount === 1 ? 'product' : 'products'})</span>
                        </div>
                    </td>
                `;
                fragment.appendChild(headerRow);
                
                // Add products for this brand
                brandProducts.forEach(product => {
                    const tr = document.createElement('tr');
                    tr.className = 'product-row';
                    
                    const originalImageSrc = (product.images && product.images[0]) 
                        ? product.images[0] 
                        : window.ADMIN_PLACEHOLDER_IMAGE;
                    
                    // Use image proxy for external URLs to avoid CORS issues
                    let imageSrc = originalImageSrc;
                    if (originalImageSrc && originalImageSrc.startsWith('http') && !originalImageSrc.startsWith(window.location.origin)) {
                        imageSrc = `/api/image-proxy?url=${encodeURIComponent(originalImageSrc)}`;
                    }
                    
                    tr.innerHTML = `
                        <td>
                            <img src="${escapeHtml(imageSrc)}" 
                                 alt="${escapeHtml(product.name)}" 
                                 class="table-image"
                                 loading="lazy"
                                 onerror="handleAdminImageError(this)">
                        </td>
                        <td>${escapeHtml(product.name)}</td>
                        <td>${escapeHtml(product.category || 'No Brand')}</td>
                        <td>€${product.price.toFixed(2)}</td>
                        <td>${product.stock}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-order btn-small" data-move-up="${product.id}" title="Move up">↑</button>
                                <button class="btn btn-order btn-small" data-move-down="${product.id}" title="Move down">↓</button>
                                <button class="btn btn-secondary btn-small" data-edit-product="${product.id}">Edit</button>
                                <button class="btn btn-primary btn-small" data-duplicate-product="${product.id}">Duplicate</button>
                                <button class="btn btn-danger btn-small" data-delete-product="${product.id}">Delete</button>
                            </div>
                        </td>
                    `;
                    
                    // Use event delegation instead of inline onclick
                    const moveUpBtn = tr.querySelector(`[data-move-up="${product.id}"]`);
                    const moveDownBtn = tr.querySelector(`[data-move-down="${product.id}"]`);
                    const editBtn = tr.querySelector(`[data-edit-product="${product.id}"]`);
                    const duplicateBtn = tr.querySelector(`[data-duplicate-product="${product.id}"]`);
                    const deleteBtn = tr.querySelector(`[data-delete-product="${product.id}"]`);
                    
                    moveUpBtn.addEventListener('click', () => moveProductOrder(product.id, 'up'));
                    moveDownBtn.addEventListener('click', () => moveProductOrder(product.id, 'down'));
                    editBtn.addEventListener('click', () => editProduct(product.id));
                    duplicateBtn.addEventListener('click', () => duplicateProduct(product.id));
                    deleteBtn.addEventListener('click', () => {
                        if (confirm('Are you sure you want to delete this product?')) {
                            (async () => {
                                try {
                                    await deleteProduct(product.id);
                                    await refreshProducts();
                                    renderProductsTable();
                                } catch (error) {
                                    alert('Error deleting product: ' + error.message);
                                }
                            })();
                        }
                    });
                    
                    fragment.appendChild(tr);
                });
            });
            
            productsTableBody.innerHTML = '';
            productsTableBody.appendChild(fragment);
        }

        function populateBrandDropdown() {
            const brandSelect = document.getElementById('productCategory');
            if (typeof getBrands !== 'function' || typeof getProducts !== 'function') {
                console.error('getBrands or getProducts not available');
                return;
            }
            const brands = getBrands();
            
            // Clear existing options except the first "Select a brand..." option
            brandSelect.innerHTML = '<option value="">Select a brand...</option>';
            
            // Add brands from brand management
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand.name;
                option.textContent = brand.name;
                brandSelect.appendChild(option);
            });
            
            // Also add brands from existing products (in case they're not in brand management)
            const products = getProducts();
            const existingBrands = new Set();
            products.forEach(product => {
                if (product.category && product.category.trim() !== '') {
                    existingBrands.add(product.category);
                }
            });
            
            existingBrands.forEach(brandName => {
                // Only add if not already in the dropdown
                if (!brands.find(b => b.name === brandName)) {
                    const option = document.createElement('option');
                    option.value = brandName;
                    option.textContent = brandName;
                    brandSelect.appendChild(option);
                }
            });
        }

        function openModal(product = null) {
            editingProductId = product ? product.id : null;
            modalTitle.textContent = product ? 'Edit Product' : 'Add Product';
            productForm.reset();
            
            // Populate brand dropdown
            populateBrandDropdown();
            
            // Clear options container efficiently
            optionsContainer.innerHTML = '';
            optionCounter = 0;

            // Show modal immediately
            productModal.classList.add('active');

            if (product) {
                document.getElementById('productName').value = product.name || '';
                document.getElementById('productCategory').value = product.category || '';
                document.getElementById('productPrice').value = product.price || 0;
                document.getElementById('productStock').value = product.stock || 0;
                document.getElementById('productDescription').value = product.description || '';
                
                // Handle standard equipment
                if (product.standardEquipment && Array.isArray(product.standardEquipment)) {
                    const equipmentText = product.standardEquipment.map(item => {
                        if (typeof item === 'string') return item;
                        if (item.header) {
                            return item.header + ':\n' + (item.items || []).map(i => '- ' + i).join('\n');
                        }
                        return JSON.stringify(item);
                    }).join('\n\n');
                    document.getElementById('productStandardEquipment').value = equipmentText;
                } else {
                    document.getElementById('productStandardEquipment').value = '';
                }
                
                // Handle specs
                if (product.specs && typeof product.specs === 'object') {
                    document.getElementById('productSpecs').value = JSON.stringify(product.specs, null, 2);
                } else {
                    document.getElementById('productSpecs').value = '';
                }
                
                // Handle specs columns
                document.getElementById('productSpecsColumns').value = product.specsColumns || 1;
                
                // Handle images
                if (product.images && Array.isArray(product.images)) {
                    document.getElementById('productImages').value = product.images.join(', ');
                } else {
                    document.getElementById('productImages').value = '';
                }
                
                // Handle options
                if (product.options && Array.isArray(product.options)) {
                    product.options.forEach(option => {
                        addOptionToForm(option);
                    });
                }
            }
        }

        function closeModal() {
            productModal.classList.remove('active');
            editingProductId = null;
            productForm.reset();
            document.getElementById('productSpecsColumns').value = '1';
            optionsContainer.innerHTML = '';
            optionCounter = 0;
        }

        async function editProduct(id) {
            const product = getProductById(id);
            if (product) {
                openModal(product);
            }
        }

        async function duplicateProduct(id) {
            const product = getProductById(id);
            if (!product) {
                alert('Product not found');
                return;
            }

            try {
                // Create a copy of the product without the id
                const productCopy = {
                    name: product.name + ' (Copy)',
                    category: product.category || '',
                    price: product.price || 0,
                    stock: product.stock || 0,
                    description: product.description || '',
                    standardEquipment: product.standardEquipment ? JSON.parse(JSON.stringify(product.standardEquipment)) : [],
                    specs: product.specs ? JSON.parse(JSON.stringify(product.specs)) : {},
                    images: product.images ? [...product.images] : [],
                    options: product.options ? JSON.parse(JSON.stringify(product.options)) : []
                };

                // Create the new product
                await addProduct(productCopy);
                await refreshProducts();
                renderProductsTable();
                
                // Show success message
                alert('Product duplicated successfully!');
            } catch (error) {
                console.error('Error duplicating product:', error);
                alert('Error duplicating product: ' + error.message);
            }
        }

        async function moveProductOrder(productId, direction) {
            try {
                const api = await import('./api.js');
                await api.updateProductOrder(productId, direction);
                await refreshProducts();
                renderProductsTable();
            } catch (error) {
                console.error('Error moving product order:', error);
                if (error.message && !error.message.includes('already at')) {
                    alert('Error moving product: ' + error.message);
                }
            }
        }

        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const standardEquipmentText = document.getElementById('productStandardEquipment').value.trim();
                let standardEquipment = [];
                
                if (standardEquipmentText) {
                    const groups = standardEquipmentText.split('\n\n');
                    groups.forEach(group => {
                        const lines = group.split('\n');
                        if (lines.length > 0) {
                            const header = lines[0].replace(':', '').trim();
                            const items = lines.slice(1).map(line => line.replace(/^-\s*/, '').trim()).filter(item => item);
                            if (header && items.length > 0) {
                                standardEquipment.push({ header, items });
                            } else if (lines[0].trim()) {
                                standardEquipment.push(lines[0].replace(/^-\s*/, '').trim());
                            }
                        }
                    });
                }
                
                let specs = {};
                const specsText = document.getElementById('productSpecs').value.trim();
                if (specsText) {
                    try {
                        specs = JSON.parse(specsText);
                    } catch (e) {
                        alert('Invalid JSON in specifications field');
                        return;
                    }
                }
                
                const imagesText = document.getElementById('productImages').value.trim();
                const images = imagesText ? imagesText.split(',').map(img => img.trim()).filter(img => img) : [];
                
                const options = [];
                const optionElements = optionsContainer.querySelectorAll('.option-item-form');
                optionElements.forEach(optionEl => {
                    const name = optionEl.querySelector('.option-name').value.trim();
                    const type = optionEl.querySelector('.option-type').value;
                    const required = optionEl.querySelector('.option-required').checked;
                    const choicesText = optionEl.querySelector('.option-choices').value.trim();
                    
                    if (name && choicesText) {
                        try {
                            const choices = JSON.parse(choicesText);
                            if (Array.isArray(choices)) {
                                options.push({ name, type, required, choices });
                            }
                        } catch (e) {
                            console.error('Invalid JSON in option choices:', e);
                        }
                    }
                });
                
                const product = {
                    name: document.getElementById('productName').value,
                    category: document.getElementById('productCategory').value,
                    price: parseFloat(document.getElementById('productPrice').value),
                    stock: parseInt(document.getElementById('productStock').value),
                    description: document.getElementById('productDescription').value,
                    standardEquipment,
                    specs,
                    images,
                    options,
                    specsColumns: parseInt(document.getElementById('productSpecsColumns').value) || 1
                };
                
                if (editingProductId) {
                    await updateProduct(editingProductId, product);
                } else {
                    await addProduct(product);
                }
                
                await refreshProducts();
                renderProductsTable();
                closeModal();
            } catch (error) {
                alert('Error saving product: ' + error.message);
            }
        });

        addProductBtn.addEventListener('click', () => openModal());
        
        // Handle PDF photo file upload
        closeModalBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        addOptionBtn.addEventListener('click', () => addOptionToForm());

        // Close modal on outside click - use passive listener for better performance
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) {
                closeModal();
            }
        }, { passive: true });

        // Tab functionality
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.admin-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    const targetTab = btn.dataset.tab;
                    
                    // Update active tab button
                    tabBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Update active tab content
                    tabContents.forEach(content => content.classList.remove('active'));
                    const targetTabContent = document.getElementById(`${targetTab}Tab`);
                    if (targetTabContent) {
                        targetTabContent.classList.add('active');
                    }
                    
                    // Render appropriate content
                    if (targetTab === 'brands') {
                        try {
                            renderBrandsTable();
                        } catch (error) {
                            console.error('Error rendering brands table:', error);
                        }
                    } else if (targetTab === 'orders') {
                        try {
                            renderOrdersTable();
                        } catch (error) {
                            console.error('Error rendering orders table:', error);
                        }
                    } else if (targetTab === 'settings') {
                        try {
                            const shopLogoUrl = document.getElementById('shopLogoUrl');
                            const logoPreview = document.getElementById('logoPreview');
                            if (shopLogoUrl && typeof getShopLogo === 'function') {
                                // Reload logo URL when settings tab is opened
                                const currentLogo = getShopLogo();
                                if (currentLogo) {
                                    shopLogoUrl.value = currentLogo;
                                    if (typeof updateLogoPreview === 'function') {
                                        updateLogoPreview(currentLogo);
                                    }
                                } else {
                                    shopLogoUrl.value = '';
                                    if (logoPreview) {
                                        logoPreview.style.display = 'none';
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Error loading settings:', error);
                        }
                    }
                } catch (error) {
                    console.error('Error switching tabs:', error);
                }
            });
        });

        // Brand management
        const brandModal = document.getElementById('brandModal');
        const brandForm = document.getElementById('brandForm');
        const addBrandBtn = document.getElementById('addBrandBtn');
        const closeBrandModalBtn = document.getElementById('closeBrandModal');
        const cancelBrandBtn = document.getElementById('cancelBrandBtn');
        const brandsTableBody = document.getElementById('brandsTableBody');
        let editingBrandId = null;

        function renderBrandsTable() {
            if (typeof getBrands !== 'function' || typeof getProducts !== 'function') {
                console.error('getBrands or getProducts not available');
                return;
            }
            const brands = getBrands();
            const allProducts = getProducts();
            
            // Count products per brand
            const brandProductCounts = {};
            allProducts.forEach(product => {
                const brandName = product.category || 'No Brand';
                brandProductCounts[brandName] = (brandProductCounts[brandName] || 0) + 1;
            });

            const fragment = document.createDocumentFragment();
            
            brands.forEach(brand => {
                const tr = document.createElement('tr');
                const escapeHtml = (text) => {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                };
                
                tr.innerHTML = `
                    <td>
                        <img src="${escapeHtml(brand.logo ? getProxiedImageUrl(brand.logo) : window.ADMIN_PLACEHOLDER_IMAGE)}" 
                             alt="${escapeHtml(brand.name)}" 
                             class="table-image"
                             loading="lazy"
                             onerror="handleAdminImageError(this)">
                    </td>
                    <td>${escapeHtml(brand.name)}</td>
                    <td>${brandProductCounts[brand.name] || 0}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-secondary btn-small" data-edit-brand="${brand.id}">Edit</button>
                            <button class="btn btn-danger btn-small" data-delete-brand="${brand.id}">Delete</button>
                        </div>
                    </td>
                `;
                
                const editBtn = tr.querySelector(`[data-edit-brand="${brand.id}"]`);
                const deleteBtn = tr.querySelector(`[data-delete-brand="${brand.id}"]`);
                editBtn.addEventListener('click', () => editBrand(brand.id));
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to delete this brand?')) {
                        (async () => {
                            try {
                                await deleteBrand(brand.id);
                                await refreshBrands();
                                renderBrandsTable();
                            } catch (error) {
                                alert('Error deleting brand: ' + error.message);
                            }
                        })();
                    }
                });
                
                fragment.appendChild(tr);
            });
            
            if (brandsTableBody) {
                brandsTableBody.innerHTML = '';
                brandsTableBody.appendChild(fragment);
            }
        }

        function openBrandModal(brand = null) {
            editingBrandId = brand ? brand.id : null;
            document.getElementById('brandModalTitle').textContent = brand ? 'Edit Brand' : 'Add Brand';
            brandForm.reset();
            brandModal.classList.add('active');

            if (brand) {
                document.getElementById('brandName').value = brand.name || '';
                document.getElementById('brandLogo').value = brand.logo || '';
            }
        }

        function closeBrandModal() {
            brandModal.classList.remove('active');
            editingBrandId = null;
            brandForm.reset();
        }

        async function editBrand(id) {
            const brands = getBrands();
            const brand = brands.find(b => b.id == id);
            if (brand) {
                openBrandModal(brand);
            }
        }

        brandForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const brand = {
                    name: document.getElementById('brandName').value,
                    logo: document.getElementById('brandLogo').value
                };
                
                if (editingBrandId) {
                    await updateBrand(editingBrandId, brand);
                } else {
                    await addBrand(brand);
                }
                
                await refreshBrands();
                renderBrandsTable();
                closeBrandModal();
            } catch (error) {
                alert('Error saving brand: ' + error.message);
            }
        });

        addBrandBtn.addEventListener('click', () => openBrandModal());
        closeBrandModalBtn.addEventListener('click', closeBrandModal);
        cancelBrandBtn.addEventListener('click', closeBrandModal);

        brandModal.addEventListener('click', (e) => {
            if (e.target === brandModal) {
                closeBrandModal();
            }
        }, { passive: true });

        // Orders management
        const ordersTableBody = document.getElementById('ordersTableBody');

        async function renderOrdersTable() {
            if (!ordersTableBody) return;
            
            if (typeof getOrders !== 'function' || typeof refreshOrders !== 'function') {
                console.error('getOrders or refreshOrders not available');
                ordersTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">Loading orders...</td></tr>';
                return;
            }
            
            try {
                await refreshOrders();
            } catch (error) {
                console.error('Error refreshing orders:', error);
            }
            
            const orders = getOrders();
            
            if (orders.length === 0) {
                ordersTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">No orders found.</td></tr>';
                return;
            }
            
            ordersTableBody.innerHTML = orders.map(order => {
                const date = new Date(order.date).toLocaleDateString('en-GB', {
                    year: '2-digit',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const statusClass = order.status === 'pending' ? 'status-pending' : 
                                   order.status === 'confirmed' ? 'status-confirmed' : 
                                   order.status === 'completed' ? 'status-completed' : 'status-cancelled';
                
                return `
                    <tr>
                        <td>${order.orderNumber}</td>
                        <td>${date}</td>
                        <td>${order.customerInfo?.fullName || 'N/A'}</td>
                        <td>${order.customerInfo?.email || 'N/A'}</td>
                        <td>${order.customerInfo?.phone || 'N/A'}</td>
                        <td>${order.productName}</td>
                        <td>€${(order.totalInclVAT || 0).toFixed(2)}</td>
                        <td><span class="status-badge ${statusClass}">${order.status}</span></td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-secondary btn-small" onclick="window.updateOrderStatusFunc(${order.id})">Update Status</button>
                                <button class="btn btn-danger btn-small" onclick="window.deleteOrderFunc(${order.id})">Delete</button>
                                <button class="btn btn-primary btn-small" onclick="window.generateOrderPDFForAdminFunc(${order.id})">PDF</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        window.updateOrderStatusFunc = async function(orderId) {
            const newStatus = prompt('Enter new status (pending, confirmed, completed, cancelled):');
            if (newStatus && ['pending', 'confirmed', 'completed', 'cancelled'].includes(newStatus.toLowerCase())) {
                try {
                    await updateOrderStatus(orderId, newStatus.toLowerCase());
                    await refreshOrders();
                    renderOrdersTable();
                } catch (error) {
                    alert('Error updating order: ' + error.message);
                }
            }
        };

        window.deleteOrderFunc = function(orderId) {
            if (confirm('Are you sure you want to delete this order?')) {
                (async () => {
                    try {
                        await deleteOrder(orderId);
                        await refreshOrders();
                        renderOrdersTable();
                    } catch (error) {
                        alert('Error deleting order: ' + error.message);
                    }
                })();
            }
        };

        async function generateOrderPDFForAdmin(order) {
            // Ensure order has required structure
            if (!order) {
                throw new Error('Order object is undefined');
            }
            
            // Handle both camelCase and snake_case formats
            if (!order.customerInfo && order.customer_info) {
                // Convert snake_case to camelCase if needed
                order.customerInfo = typeof order.customer_info === 'string' 
                    ? JSON.parse(order.customer_info) 
                    : order.customer_info;
            }
            
            // Ensure customerInfo exists
            if (!order.customerInfo) {
                console.warn('customerInfo is missing, using empty object');
                order.customerInfo = {};
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Helper function to load image and get dimensions
            function loadImage(src) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = src;
                });
            }
            
            // Helper function to calculate dimensions maintaining aspect ratio
            function calculateDimensions(imgWidth, imgHeight, maxWidth, maxHeight) {
                const aspectRatio = imgWidth / imgHeight;
                let width = maxWidth;
                let height = maxWidth / aspectRatio;
                
                // If height exceeds max, scale by height instead
                if (height > maxHeight) {
                    height = maxHeight;
                    width = maxHeight * aspectRatio;
                }
                
                return { width, height };
            }
            
            // Helper function to add image with format detection and aspect ratio preservation
            async function addImageToPDF(doc, imgSrc, x, y, maxWidth, maxHeight) {
                if (!imgSrc) return false;
                
                try {
                    // Load image to get dimensions
                    const img = await loadImage(imgSrc);
                    const { width, height } = calculateDimensions(img.width, img.height, maxWidth, maxHeight);
                    
                    // Try to detect image format from URL or use common formats
                    const formats = ['PNG', 'JPEG', 'JPG'];
                    const lowerSrc = imgSrc.toLowerCase();
                    
                    // Detect format from URL
                    let detectedFormat = 'PNG'; // default
                    if (lowerSrc.includes('.jpg') || lowerSrc.includes('.jpeg') || lowerSrc.startsWith('data:image/jpeg') || lowerSrc.startsWith('data:image/jpg')) {
                        detectedFormat = 'JPEG';
                    } else if (lowerSrc.includes('.png') || lowerSrc.startsWith('data:image/png')) {
                        detectedFormat = 'PNG';
                    }
                    
                    // Try detected format first, then others
                    const formatsToTry = [detectedFormat, ...formats.filter(f => f !== detectedFormat)];
                    
                    for (const format of formatsToTry) {
                        try {
                            doc.addImage(imgSrc, format, x, y, width, height);
                            return { success: true, height };
                        } catch (e) {
                            // Try next format
                            continue;
                        }
                    }
                    return { success: false, height: 0 };
                } catch (e) {
                    // If image fails to load, return false
                    return { success: false, height: 0 };
                }
            }
            
            // Get brand logo if available
            const brand = getBrandByName(order.productBrand);
            const brandLogo = brand ? getProxiedImageUrl(brand.logo) : '';
            const shopLogo = getProxiedImageUrl(getShopLogo());
            
            let yPos = 20;
            
            // Header with logos
            if (shopLogo) {
                const result = await addImageToPDF(doc, shopLogo, 20, yPos, 40, 15);
            }
            
            // Add brand logo if available
            if (brandLogo) {
                const result = await addImageToPDF(doc, brandLogo, 150, yPos, 40, 15);
            }
            
            yPos += 25;
            
            // Title
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('ORDER CONFIRMATION', 105, yPos, { align: 'center' });
            yPos += 10;
            
            // Order details
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Order Number: ${order.orderNumber}`, 20, yPos);
            yPos += 7;
            doc.text(`Date: ${new Date(order.date).toLocaleDateString('en-GB', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}`, 20, yPos);
            yPos += 15;
            
            // Customer Information
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('CUSTOMER INFORMATION', 20, yPos);
            yPos += 8;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            
            // Safely access customerInfo with fallbacks
            const customerInfo = order.customerInfo || {};
            doc.text(`Name: ${customerInfo.fullName || 'N/A'}`, 20, yPos);
            yPos += 6;
            doc.text(`Email: ${customerInfo.email || 'N/A'}`, 20, yPos);
            yPos += 6;
            doc.text(`Phone: ${customerInfo.phone || 'N/A'}`, 20, yPos);
            yPos += 6;
            doc.text(`City: ${customerInfo.city || 'N/A'}`, 20, yPos);
            yPos += 12;
            
            // Product Information
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('PRODUCT INFORMATION', 20, yPos);
            yPos += 8;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            
            // Add product image if available - use first product image
            const rawProductImage = order.productImages && order.productImages.length > 0 ? order.productImages[0] : null;
            const productImage = rawProductImage ? getProxiedImageUrl(rawProductImage) : null;
            let productImageHeight = 0;
            if (productImage) {
                // Add product image on the right side
                const result = await addImageToPDF(doc, productImage, 150, yPos - 5, 40, 40);
                if (result && result.success) {
                    productImageHeight = result.height;
                }
            }
            
            doc.text(`Product: ${order.productName}`, 20, yPos);
            yPos += 6;
            doc.text(`Brand: ${order.productBrand}`, 20, yPos);
            
            // Adjust yPos if product image was added
            if (productImage && productImageHeight > 0) {
                yPos = Math.max(yPos + 4, yPos - 5 + productImageHeight + 5);
            } else {
                yPos += 10;
            }
            
            // Selected Options
            if (Object.keys(order.selectedOptions).length > 0) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('SELECTED OPTIONS:', 20, yPos);
                yPos += 7;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                Object.keys(order.selectedOptions).forEach(optionName => {
                    const selected = order.selectedOptions[optionName];
                    if (Array.isArray(selected)) {
                        selected.forEach(choice => {
                            doc.text(`• ${optionName}: ${choice}`, 25, yPos);
                            yPos += 5;
                        });
                    } else {
                        doc.text(`• ${optionName}: ${selected}`, 25, yPos);
                        yPos += 5;
                    }
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
                yPos += 5;
            }
            
            // Price Breakdown
            yPos += 5;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('PRICE BREAKDOWN', 20, yPos);
            yPos += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            order.priceBreakdown.forEach(item => {
                doc.text(item.label, 25, yPos);
                doc.text(`€${item.price.toFixed(2)}`, 170, yPos, { align: 'right' });
                yPos += 5;
            });
            
            yPos += 3;
            doc.setDrawColor(200, 200, 200);
            doc.line(20, yPos, 190, yPos);
            yPos += 5;
            
            doc.text('Subtotal (excl. VAT)', 25, yPos);
            doc.text(`€${order.totalExclVAT.toFixed(2)}`, 170, yPos, { align: 'right' });
            yPos += 6;
            
            doc.text('VAT (19%)', 25, yPos);
            doc.text(`€${(order.totalInclVAT - order.totalExclVAT).toFixed(2)}`, 170, yPos, { align: 'right' });
            yPos += 6;
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setDrawColor(30, 64, 175);
            doc.line(20, yPos, 190, yPos);
            yPos += 6;
            doc.text('TOTAL (incl. VAT)', 25, yPos);
            doc.text(`€${order.totalInclVAT.toFixed(2)}`, 170, yPos, { align: 'right' });
            
            // Footer
            yPos = 270;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('Thank you for your order! We will contact you soon.', 105, yPos, { align: 'center' });
            
            // Save PDF (same as client version)
            doc.save(`Order-${order.orderNumber}.pdf`);
        }

        window.generateOrderPDFForAdminFunc = async function(orderId) {
            const orders = getOrders();
            const order = orders.find(o => o.id == orderId);
            if (order) {
                try {
                    await generateOrderPDFForAdmin(order);
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    alert('Error generating PDF: ' + error.message);
                }
            }
        };

        // Settings management
        const logoForm = document.getElementById('logoForm');
        const shopLogoUrl = document.getElementById('shopLogoUrl');
        const logoPreview = document.getElementById('logoPreview');
        const removeLogoBtn = document.getElementById('removeLogoBtn');

        function updateLogoPreview(url) {
            if (!logoPreview) return;
            if (url && url.trim()) {
                const previewLogo = logoPreview.querySelector('.logo img');
                if (previewLogo) {
                    previewLogo.src = url;
                } else {
                    const logoContainer = logoPreview.querySelector('.logo');
                    if (logoContainer) {
                        const img = document.createElement('img');
                        img.src = url;
                        img.alt = 'Shop Logo';
                        img.style.maxWidth = '200px';
                        img.style.height = 'auto';
                        logoContainer.insertBefore(img, logoContainer.querySelector('.logo-text'));
                    }
                }
                logoPreview.style.display = 'block';
            } else {
                logoPreview.style.display = 'none';
            }
        }

        if (shopLogoUrl) {
            shopLogoUrl.addEventListener('input', (e) => {
                updateLogoPreview(e.target.value);
            });
        }

        if (logoForm) {
            logoForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const logoUrl = shopLogoUrl.value.trim();
                    await setShopLogo(logoUrl);
                    await refreshShopLogo();
                    alert('Logo updated successfully!');
                } catch (error) {
                    alert('Error updating logo: ' + error.message);
                }
            });
        }

        if (removeLogoBtn) {
            removeLogoBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to remove the shop logo?')) {
                    try {
                        await setShopLogo('');
                        await refreshShopLogo();
                        if (shopLogoUrl) shopLogoUrl.value = '';
                        if (logoPreview) logoPreview.style.display = 'none';
                        alert('Logo removed successfully!');
                    } catch (error) {
                        alert('Error removing logo: ' + error.message);
                    }
                }
            });
        }

        // Initial render - make sure functions are available
        console.log('Attempting initial render...');
        if (typeof getProducts === 'function' && typeof getBrands === 'function') {
            console.log('Functions available, rendering products table');
            renderProductsTable();
        } else {
            console.error('Data functions not available on initial render', {
                getProducts: typeof getProducts,
                getBrands: typeof getBrands
            });
            // Try again after a short delay
            setTimeout(() => {
                if (typeof getProducts === 'function' && typeof getBrands === 'function') {
                    console.log('Functions now available, rendering products table');
                    renderProductsTable();
                } else {
                    console.error('Functions still not available after delay');
                }
            }, 500);
        }
    }
    
    // Start initialization
    console.log('Admin.js loaded, starting initialization...');
    initAdmin();
})();
