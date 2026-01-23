// Create a data URI placeholder image for admin table (defined globally)
const ADMIN_PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f1f5f9" width="100" height="100"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="12" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

// Make function globally accessible for inline onerror handlers
window.handleAdminImageError = function(img) {
    if (img.src !== ADMIN_PLACEHOLDER_IMAGE) {
        img.src = ADMIN_PLACEHOLDER_IMAGE;
        img.onerror = null; // Prevent infinite loop
    }
};

// Admin portal functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for data to be initialized from database
    await new Promise((resolve) => {
        if (window.cacheInitialized) {
            resolve();
        } else {
            window.addEventListener('dataLoaded', resolve, { once: true });
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
        }
    });
    const productsTableBody = document.getElementById('productsTableBody');
    const productModal = document.getElementById('productModal');
    const productForm = document.getElementById('productForm');
    const addProductBtn = document.getElementById('addProductBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const addOptionBtn = document.getElementById('addOptionBtn');
    const optionsContainer = document.getElementById('optionsContainer');
    const modalTitle = document.getElementById('modalTitle');

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
            return;
        }
        const products = getProducts();
        const brands = getBrands();
        
        // Group products by brand
        const productsByBrand = {};
        products.forEach(product => {
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
            headerRow.innerHTML = `
                <td colspan="6" class="brand-header-cell">
                    <div class="brand-header-content">
                        ${brandInfo && brandInfo.logo ? `
                            <img src="${escapeHtml(brandInfo.logo)}" alt="${escapeHtml(brandName)} Logo" class="brand-header-logo" onerror="this.style.display='none'">
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
                
                const imageSrc = (product.images && product.images[0]) 
                    ? escapeHtml(product.images[0]) 
                    : ADMIN_PLACEHOLDER_IMAGE;
                
                tr.innerHTML = `
                    <td>
                        <img src="${imageSrc}" 
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
                            <button class="btn btn-secondary btn-small" data-edit-product="${product.id}">Edit</button>
                            <button class="btn btn-danger btn-small" data-delete-product="${product.id}">Delete</button>
                        </div>
                    </td>
                `;
                
                // Use event delegation instead of inline onclick
                const editBtn = tr.querySelector(`[data-edit-product="${product.id}"]`);
                const deleteBtn = tr.querySelector(`[data-delete-product="${product.id}"]`);
                editBtn.addEventListener('click', () => editProduct(product.id));
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

        // Use setTimeout to defer heavy DOM operations and prevent blocking
        setTimeout(() => {
        if (product) {
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productDescription').value = product.description;
            // Format standard equipment for display
            let equipmentText = '';
            if (product.standardEquipment) {
                if (Array.isArray(product.standardEquipment)) {
                    // Check if it's grouped format or simple array
                    if (product.standardEquipment.length > 0 && typeof product.standardEquipment[0] === 'object' && product.standardEquipment[0].header) {
                        // Grouped format
                        equipmentText = product.standardEquipment.map(group => {
                            const header = `${group.header}:`;
                            const items = group.items.map(item => `- ${item}`).join('\n');
                            return `${header}\n${items}`;
                        }).join('\n\n');
                    } else {
                        // Simple array format (legacy)
                        equipmentText = product.standardEquipment.map(item => `- ${item}`).join('\n');
                    }
                } else {
                    equipmentText = product.standardEquipment;
                }
            }
            document.getElementById('productStandardEquipment').value = equipmentText;
            document.getElementById('productSpecs').value = product.specs ? JSON.stringify(product.specs, null, 2) : '';
            document.getElementById('productImages').value = product.images ? product.images.join(', ') : '';

                // Batch option additions using DocumentFragment for better performance
                if (product.options && product.options.length > 0) {
                    const fragment = document.createDocumentFragment();
                    product.options.forEach(option => {
                        const optionElement = createOptionElement(option);
                        fragment.appendChild(optionElement);
                    });
                    optionsContainer.appendChild(fragment);
                }
            } else {
                const optionElement = createOptionElement();
                optionsContainer.appendChild(optionElement);
            }
        }, 0);
    }

    function closeModal() {
        productModal.classList.remove('active');
        editingProductId = null;
        productForm.reset();
        optionsContainer.innerHTML = '';
        optionCounter = 0;
    }

    function parseOptions() {
        const options = [];
        const optionDivs = optionsContainer.querySelectorAll('.option-item-form');

        optionDivs.forEach(div => {
            const name = div.querySelector('.option-name').value.trim();
            const type = div.querySelector('.option-type').value;
            const required = div.querySelector('.option-required').checked;
            const choicesText = div.querySelector('.option-choices').value.trim();

            if (!name) return;

            let choices = [];
            try {
                choices = JSON.parse(choicesText);
                if (!Array.isArray(choices)) {
                    choices = [];
                }
            } catch (e) {
                console.error('Invalid choices JSON:', e);
            }

            if (choices.length > 0) {
                options.push({ name, type, required, choices });
            }
        });

        return options;
    }

    function parseSpecs() {
        const specsText = document.getElementById('productSpecs').value.trim();
        if (!specsText) return {};

        try {
            return JSON.parse(specsText);
        } catch (e) {
            alert('Invalid specifications JSON format. Please check your input.');
            throw e;
        }
    }

    function parseImages() {
        const imagesText = document.getElementById('productImages').value.trim();
        if (!imagesText) return [];

        return imagesText.split(',').map(url => url.trim()).filter(url => url);
    }

    function parseStandardEquipment() {
        const equipmentText = document.getElementById('productStandardEquipment').value.trim();
        if (!equipmentText) return [];
        
        // Parse grouped format: "Header:" followed by items with "-"
        const groups = [];
        const lines = equipmentText.split('\n').map(line => line.trim());
        let currentGroup = null;
        
        for (const line of lines) {
            if (!line) {
                // Empty line - finish current group if exists
                if (currentGroup && currentGroup.items.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = null;
                }
                continue;
            }
            
            // Check if line is a header (ends with colon)
            if (line.endsWith(':')) {
                // Finish previous group if exists
                if (currentGroup && currentGroup.items.length > 0) {
                    groups.push(currentGroup);
                }
                // Start new group
                currentGroup = {
                    header: line.slice(0, -1).trim(), // Remove colon
                    items: []
                };
            } else if (line.startsWith('-')) {
                // Item line
                const item = line.slice(1).trim();
                if (item) {
                    if (!currentGroup) {
                        // If no header, create a default group
                        currentGroup = { header: 'Standard Equipment', items: [] };
                    }
                    currentGroup.items.push(item);
                }
            } else {
                // Plain item (no dash, no colon) - treat as item
                if (!currentGroup) {
                    currentGroup = { header: 'Standard Equipment', items: [] };
                }
                currentGroup.items.push(line);
            }
        }
        
        // Add last group if exists
        if (currentGroup && currentGroup.items.length > 0) {
            groups.push(currentGroup);
        }
        
        // If no groups were created but we have items, create a default group
        if (groups.length === 0 && equipmentText) {
            // Fallback: treat as simple list
            const items = lines.filter(line => line && !line.endsWith(':'));
            if (items.length > 0) {
                return [{ header: 'Standard Equipment', items: items.map(item => item.startsWith('-') ? item.slice(1).trim() : item) }];
            }
        }
        
        return groups;
    }

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const product = {
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            description: document.getElementById('productDescription').value.trim(),
            standardEquipment: parseStandardEquipment(),
            specs: parseSpecs(),
            images: parseImages(),
            options: parseOptions()
        };

        try {
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
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    addOptionBtn.addEventListener('click', () => addOptionToForm());

    function editProduct(id) {
        const product = getProductById(id);
        if (product) {
            openModal(product);
        }
    }

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
            const targetTab = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${targetTab}Tab`).classList.add('active');
            
            // Render appropriate content
            if (targetTab === 'brands') {
                renderBrandsTable();
            } else if (targetTab === 'orders') {
                renderOrdersTable();
            } else if (targetTab === 'settings' && shopLogoUrl && typeof getShopLogo === 'function') {
                // Reload logo URL when settings tab is opened
                const currentLogo = getShopLogo();
                if (currentLogo) {
                    shopLogoUrl.value = currentLogo;
                    updateLogoPreview(currentLogo);
                } else {
                    shopLogoUrl.value = '';
                    logoPreview.style.display = 'none';
                }
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
                    <img src="${escapeHtml(brand.logo || ADMIN_PLACEHOLDER_IMAGE)}" 
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
                    // Refresh brand dropdown in product modal if it's open
                    if (productModal.classList.contains('active')) {
                        populateBrandDropdown();
                        // Clear selection if the deleted brand was selected
                        const productCategory = document.getElementById('productCategory');
                        if (productCategory.value === brand.name) {
                            productCategory.value = '';
                        }
                    }
                }
            });
            
            fragment.appendChild(tr);
        });
        
        brandsTableBody.innerHTML = '';
        brandsTableBody.appendChild(fragment);
    }

    function openBrandModal(brand = null) {
        editingBrandId = brand ? brand.id : null;
        document.getElementById('brandModalTitle').textContent = brand ? 'Edit Brand' : 'Add Brand';
        brandForm.reset();
        
        brandModal.classList.add('active');
        
        if (brand) {
            document.getElementById('brandId').value = brand.id;
            document.getElementById('brandName').value = brand.name;
            document.getElementById('brandLogo').value = brand.logo || '';
        }
    }

    function closeBrandModal() {
        brandModal.classList.remove('active');
        editingBrandId = null;
        brandForm.reset();
    }

    function editBrand(id) {
        const brands = getBrands();
        const brand = brands.find(b => b.id === id);
        if (brand) {
            openBrandModal(brand);
        }
    }

    brandForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const brand = {
            name: document.getElementById('brandName').value.trim(),
            logo: document.getElementById('brandLogo').value.trim()
        };

        try {
            if (editingBrandId) {
                await updateBrand(editingBrandId, brand);
            } else {
                await addBrand(brand);
            }
            await refreshBrands();
            renderBrandsTable();
            // Refresh brand dropdown in product modal if it's open
            if (productModal.classList.contains('active')) {
                populateBrandDropdown();
                // Restore selected value if editing a product
                if (editingProductId) {
                    const product = getProductById(editingProductId);
                    if (product && product.category) {
                        document.getElementById('productCategory').value = product.category;
                    }
                }
            }
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
    });

    // Settings management
    const logoForm = document.getElementById('logoForm');
    const shopLogoUrl = document.getElementById('shopLogoUrl');
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const logoPreview = document.getElementById('logoPreview');

    // Load current logo URL
    if (shopLogoUrl && typeof getShopLogo === 'function') {
        const currentLogo = getShopLogo();
        if (currentLogo) {
            shopLogoUrl.value = currentLogo;
            updateLogoPreview(currentLogo);
        }
    }

    // Update logo preview
    function updateLogoPreview(url) {
        if (!url || !url.trim()) {
            logoPreview.style.display = 'none';
            return;
        }

        logoPreview.style.display = 'block';
        const previewLogo = logoPreview.querySelector('.logo');
        if (previewLogo) {
            const logoImg = previewLogo.querySelector('img.shop-logo-img');
            const logoText = previewLogo.querySelector('.logo-text');
            
            // Ensure text exists
            if (!logoText) {
                const textSpan = document.createElement('span');
                textSpan.className = 'logo-text';
                textSpan.textContent = 'AndecoMarine.shop';
                previewLogo.appendChild(textSpan);
            }
            
            if (logoImg) {
                logoImg.src = url;
                logoImg.style.display = 'block';
            } else {
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Shop Logo';
                img.className = 'shop-logo-img';
                img.onerror = function() {
                    this.style.display = 'none';
                };
                // Insert image before text (so it appears on the left)
                const textEl = previewLogo.querySelector('.logo-text');
                if (textEl) {
                    previewLogo.insertBefore(img, textEl);
                } else {
                    previewLogo.appendChild(img);
                }
                img.style.display = 'block';
            }
            
            // Always show text alongside logo
            const textEl = previewLogo.querySelector('.logo-text');
            if (textEl) textEl.style.display = 'block';
        }
    }

    // Handle logo URL input change
    if (shopLogoUrl) {
        shopLogoUrl.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) {
                updateLogoPreview(url);
            } else {
                logoPreview.style.display = 'none';
            }
        });
    }

    // Handle logo form submission
    if (logoForm && typeof setShopLogo === 'function' && typeof updateShopLogo === 'function') {
        logoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const logoPath = shopLogoUrl.value.trim();
            
            try {
                if (logoPath) {
                    await setShopLogo(logoPath);
                    await refreshShopLogo();
                    alert('Shop logo saved successfully! The logo will appear to the left of "AndecoMarine.shop" text.');
                } else {
                    alert('Please enter a logo URL or file path.');
                }
            } catch (error) {
                alert('Error saving logo: ' + error.message);
            }
        });
    }

    // Handle remove logo button
    if (removeLogoBtn && typeof setShopLogo === 'function' && typeof updateShopLogo === 'function') {
        removeLogoBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to remove the shop logo?')) {
                (async () => {
                    try {
                        await setShopLogo('');
                        await refreshShopLogo();
                        shopLogoUrl.value = '';
                        logoPreview.style.display = 'none';
                    } catch (error) {
                        alert('Error removing logo: ' + error.message);
                    }
                })();
                alert('Shop logo removed successfully!');
            }
        });
    }


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
                    <td><strong>${order.orderNumber}</strong></td>
                    <td>${date}</td>
                    <td>${order.customerInfo.fullName || '-'}</td>
                    <td>${order.customerInfo.email || '-'}</td>
                    <td>${order.customerInfo.phone || '-'}</td>
                    <td>${order.productName}</td>
                    <td><strong>€${order.totalInclVAT.toFixed(2)}</strong></td>
                    <td><span class="order-status ${statusClass}">${order.status}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-small btn-primary" onclick="viewOrderPDF('${order.id}')" title="View PDF">PDF</button>
                            <button class="btn btn-small btn-secondary" onclick="updateOrderStatusFunc('${order.id}')" title="Update Status">Status</button>
                            <button class="btn btn-small btn-danger" onclick="deleteOrderFunc('${order.id}')" title="Delete">Del</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.viewOrderPDF = function(orderId) {
        const order = getOrderById(orderId);
        if (!order) {
            alert('Order not found');
            return;
        }
        generateOrderPDFForAdmin(order);
    };

    window.updateOrderStatusFunc = async function(orderId) {
        const order = getOrderById(orderId);
        if (!order) {
            alert('Order not found');
            return;
        }
        
        const currentStatus = order.status;
        const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        const currentIndex = statuses.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % statuses.length;
        const newStatus = statuses[nextIndex];
        
        try {
            await updateOrderStatus(orderId, newStatus);
            await refreshOrders();
            renderOrdersTable();
        } catch (error) {
            alert('Error updating order: ' + error.message);
        }
    };

    window.deleteOrderFunc = function(orderId) {
        if (confirm('Are you sure you want to delete this order?')) {
            deleteOrder(orderId);
            renderOrdersTable();
        }
    };

    function generateOrderPDFForAdmin(order) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Get brand logo if available
        const brand = getBrandByName(order.productBrand);
        const brandLogo = brand ? brand.logo : '';
        const shopLogo = getShopLogo();
        
        let yPos = 20;
        
        // Header with logos
        if (shopLogo) {
            try {
                doc.addImage(shopLogo, 'PNG', 20, yPos, 40, 15);
            } catch (e) {
                // If logo fails, just continue
            }
        }
        
        // Add brand logo if available
        if (brandLogo) {
            try {
                doc.addImage(brandLogo, 'PNG', 150, yPos, 40, 15);
            } catch (e) {
                // If logo fails, just continue
            }
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
        yPos += 7;
        doc.text(`Status: ${order.status.toUpperCase()}`, 20, yPos);
        yPos += 15;
        
        // Customer Information
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('CUSTOMER INFORMATION', 20, yPos);
        yPos += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${order.customerInfo.fullName}`, 20, yPos);
        yPos += 6;
        doc.text(`Email: ${order.customerInfo.email}`, 20, yPos);
        yPos += 6;
        doc.text(`Phone: ${order.customerInfo.phone}`, 20, yPos);
        yPos += 6;
        doc.text(`City: ${order.customerInfo.city}`, 20, yPos);
        yPos += 12;
        
        // Product Information
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCT INFORMATION', 20, yPos);
        yPos += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Product: ${order.productName}`, 20, yPos);
        yPos += 6;
        doc.text(`Brand: ${order.productBrand}`, 20, yPos);
        yPos += 10;
        
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
        doc.text('AndecoMarine.shop - Order Confirmation', 105, yPos, { align: 'center' });
        
        // Open PDF in new window
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
    }

    // Initial render - make sure functions are available
    if (typeof getProducts === 'function' && typeof getBrands === 'function') {
        renderProductsTable();
    } else {
        console.error('Data functions not available on initial render');
        // Try again after a short delay
        setTimeout(() => {
            if (typeof getProducts === 'function' && typeof getBrands === 'function') {
                renderProductsTable();
            }
        }, 500);
    }
});
