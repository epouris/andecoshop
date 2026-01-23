// Create data URI placeholder images that always work (defined globally)
const PLACEHOLDER_IMAGE_LARGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="800"%3E%3Crect fill="%23f1f5f9" width="800" height="800"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
const PLACEHOLDER_IMAGE_THUMB = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f1f5f9" width="200" height="200"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

// Make functions globally accessible for inline onerror handlers
window.handleImageErrorLarge = function(img) {
    if (img.src !== PLACEHOLDER_IMAGE_LARGE) {
        img.src = PLACEHOLDER_IMAGE_LARGE;
        img.onerror = null;
    }
};

window.handleImageErrorThumb = function(img) {
    if (img.src !== PLACEHOLDER_IMAGE_THUMB) {
        img.src = PLACEHOLDER_IMAGE_THUMB;
        img.onerror = null;
    }
};

// Product detail page functionality
document.addEventListener('DOMContentLoaded', async () => {
    const productContainer = document.getElementById('productContainer');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        productContainer.innerHTML = '<p>Product not found.</p>';
        return;
    }

    // Wait for data to be initialized
    await new Promise((resolve) => {
        if (window.cacheInitialized && typeof getProductById !== 'undefined') {
            resolve();
        } else {
            window.addEventListener('dataLoaded', resolve, { once: true });
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
        }
    });

    const product = getProductById(productId);
    if (!product) {
        productContainer.innerHTML = '<p>Product not found.</p>';
        return;
    }

    // Update back link to go to brand page
    const backLink = document.getElementById('backLink');
    if (backLink && product.category) {
        backLink.href = `brand.html?brand=${encodeURIComponent(product.category)}`;
        backLink.textContent = `← Back to ${product.category}`;
    }

    let selectedOptions = {};
    let currentImageIndex = 0;

    function calculatePrice() {
        let total = product.price;
        const breakdown = [{ label: 'Base Price', price: product.price }];

        Object.keys(selectedOptions).forEach(optionName => {
            const option = product.options.find(o => o.name === optionName);
            if (!option) return;

            const selected = selectedOptions[optionName];
            if (Array.isArray(selected)) {
                selected.forEach(choiceLabel => {
                    const choice = option.choices.find(c => c.label === choiceLabel);
                    if (choice) {
                        total += choice.price;
                        breakdown.push({ label: `${optionName}: ${choiceLabel}`, price: choice.price });
                    }
                });
            } else {
                const choice = option.choices.find(c => c.label === selected);
                if (choice) {
                    total += choice.price;
                    breakdown.push({ label: `${optionName}: ${selected}`, price: choice.price });
                }
            }
        });

        return { total, breakdown };
    }

    function updatePrice() {
        const { total, breakdown } = calculatePrice();
        const priceElement = document.getElementById('currentPrice');
        const breakdownElement = document.getElementById('priceBreakdown');

        if (priceElement) {
            priceElement.textContent = `€${total.toFixed(2)}`;
        }

        if (breakdownElement) {
            breakdownElement.innerHTML = breakdown.map(item => `
                <div class="price-item">
                    <span>${item.label}</span>
                    <span>${item.price > 0 ? '+' : ''}€${item.price.toFixed(2)}</span>
                </div>
            `).join('') + `
                <div class="price-item">
                    <span>Total (excl. VAT)</span>
                    <span>€${total.toFixed(2)}</span>
                </div>
                <div class="price-item vat-total">
                    <span>Total (incl. 19% VAT)</span>
                    <span>€${(total * 1.19).toFixed(2)}</span>
                </div>
            `;
        }
    }

    function handleOptionChange(optionName, choiceLabel, isChecked) {
        const option = product.options.find(o => o.name === optionName);
        if (!option) return;

        if (option.type === 'radio') {
            selectedOptions[optionName] = choiceLabel;
        } else if (option.type === 'checkbox') {
            if (!selectedOptions[optionName]) {
                selectedOptions[optionName] = [];
            }
            if (isChecked) {
                selectedOptions[optionName].push(choiceLabel);
            } else {
                selectedOptions[optionName] = selectedOptions[optionName].filter(c => c !== choiceLabel);
            }
        }

        updatePrice();
    }

    function renderProduct() {
        const { total } = calculatePrice();
        const hasOptions = product.options && product.options.length > 0;

        // Initialize selected options
        if (hasOptions) {
            product.options.forEach(option => {
                if (option.required && option.choices.length > 0) {
                    if (option.type === 'radio') {
                        selectedOptions[option.name] = option.choices[0].label;
                    }
                }
            });
        }

        // Determine specs layout (1 or 2 columns)
        const specsColumns = product.specsColumns || 1;
        const specsEntries = product.specs ? Object.entries(product.specs) : [];
        
        let specsHtml = '';
        if (specsColumns === 2) {
            // Two-column layout: split entries into two columns
            const midPoint = Math.ceil(specsEntries.length / 2);
            const leftColumn = specsEntries.slice(0, midPoint);
            const rightColumn = specsEntries.slice(midPoint);
            
            specsHtml = '<tr>';
            specsHtml += '<td style="width: 50%; vertical-align: top; padding-right: 1rem;">';
            specsHtml += '<table style="width: 100%; border-collapse: collapse;">';
            specsHtml += leftColumn.map(([key, value]) => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 0; font-weight: 600; width: 40%;">${key}</td>
                    <td style="padding: 0.75rem 0; color: var(--text-light);">${value}</td>
                </tr>
            `).join('');
            specsHtml += '</table>';
            specsHtml += '</td>';
            specsHtml += '<td style="width: 50%; vertical-align: top; padding-left: 1rem;">';
            specsHtml += '<table style="width: 100%; border-collapse: collapse;">';
            specsHtml += rightColumn.map(([key, value]) => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.75rem 0; font-weight: 600; width: 40%;">${key}</td>
                    <td style="padding: 0.75rem 0; color: var(--text-light);">${value}</td>
                </tr>
            `).join('');
            specsHtml += '</table>';
            specsHtml += '</td>';
            specsHtml += '</tr>';
        } else {
            // Single-column layout (default)
            specsHtml = specsEntries.map(([key, value]) => `
                <tr>
                    <td>${key}</td>
                    <td>${value}</td>
                </tr>
            `).join('');
        }

        const optionsHtml = hasOptions ? product.options.map(option => {
            const optionId = option.name.replace(/\s+/g, '-').toLowerCase();
            const choicesHtml = option.choices.map((choice, index) => {
                const choiceId = `${optionId}-${index}`;
                const isSelected = option.type === 'radio' 
                    ? (index === 0 && option.required)
                    : false;

                if (option.type === 'radio') {
                    return `
                        <div class="option-item ${isSelected ? 'selected' : ''}" data-option="${option.name}" data-choice="${choice.label}">
                            <input type="radio" 
                                   id="${choiceId}" 
                                   name="${optionId}" 
                                   value="${choice.label}"
                                   ${isSelected ? 'checked' : ''}
                                   data-option-name="${option.name}"
                                   data-choice-label="${choice.label}">
                            <label for="${choiceId}">${choice.label}</label>
                            <span class="option-price">${choice.price > 0 ? '+' : ''}€${choice.price.toFixed(2)}</span>
                        </div>
                    `;
                } else {
                    return `
                        <div class="option-item" data-option="${option.name}" data-choice="${choice.label}">
                            <input type="checkbox" 
                                   id="${choiceId}" 
                                   name="${optionId}" 
                                   value="${choice.label}"
                                   data-option-name="${option.name}"
                                   data-choice-label="${choice.label}">
                            <label for="${choiceId}">${choice.label}</label>
                            <span class="option-price">${choice.price > 0 ? '+' : ''}€${choice.price.toFixed(2)}</span>
                        </div>
                    `;
                }
            }).join('');

            return `
                <div class="option-group">
                    <label>${option.name} ${option.required ? '*' : ''}</label>
                    ${choicesHtml}
                </div>
            `;
        }).join('') : '';

        const mainImageSrc = (product.images && product.images.length > 0) 
            ? (getProxiedImageUrl(product.images[currentImageIndex] || product.images[0])) 
            : PLACEHOLDER_IMAGE_LARGE;

        productContainer.innerHTML = `
            <div class="product-details">
                <div class="product-gallery">
                    <img src="${mainImageSrc}" 
                         alt="${product.name}" 
                         class="main-image"
                         id="mainImage"
                         onerror="handleImageErrorLarge(this)">
                    ${product.images && product.images.length > 1 ? `
                        <div class="thumbnail-grid">
                            ${product.images.map((img, index) => `
                                <img src="${getProxiedImageUrl(img)}" 
                                     alt="Thumbnail ${index + 1}" 
                                     class="thumbnail ${index === currentImageIndex ? 'active' : ''}"
                                     onclick="changeImage(${index})"
                                     onerror="handleImageErrorThumb(this)">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>

                <div class="product-info-section">
                    <h1>${product.name}</h1>
                    
                    <div class="product-price-section">
                        <div class="current-price" id="currentPrice">€${total.toFixed(2)}</div>
                        <div class="vat-notice">
                            <small>* Prices exclude 19% VAT (Cyprus regulation)</small>
                        </div>
                        ${hasOptions ? `
                            <div class="price-breakdown" id="priceBreakdown">
                                ${calculatePrice().breakdown.map(item => `
                                    <div class="price-item">
                                        <span>${item.label}</span>
                                        <span>${item.price > 0 ? '+' : ''}€${item.price.toFixed(2)}</span>
                                    </div>
                                `).join('')}
                                <div class="price-item">
                                    <span>Total (excl. VAT)</span>
                                    <span>€${total.toFixed(2)}</span>
                                </div>
                                <div class="price-item vat-total">
                                    <span>Total (incl. 19% VAT)</span>
                                    <span>€${(total * 1.19).toFixed(2)}</span>
                                </div>
                            </div>
                        ` : `
                            <div class="price-breakdown">
                                <div class="price-item">
                                    <span>Price (excl. VAT)</span>
                                    <span>€${total.toFixed(2)}</span>
                                </div>
                                <div class="price-item vat-total">
                                    <span>Price (incl. 19% VAT)</span>
                                    <span>€${(total * 1.19).toFixed(2)}</span>
                                </div>
                            </div>
                        `}
                    </div>


                    ${hasOptions ? `
                        <div class="product-options">
                            <h2>Options</h2>
                            ${optionsHtml}
                        </div>
                    ` : ''}

                    <div class="order-section">
                        <button class="btn btn-primary btn-large" id="sendOrderBtn" style="width: 100%; margin-top: 2rem;">
                            Send Your Order
                        </button>
                    </div>
                </div>
            </div>

            <div class="product-description">
                <h2>Description</h2>
                <p>${product.description}</p>
            </div>

            ${product.standardEquipment && product.standardEquipment.length > 0 ? `
                <div class="product-standard-equipment">
                    <h2>Standard Equipment</h2>
                    <p class="equipment-note">The following items are included in the base price:</p>
                    ${(() => {
                        // Check if it's grouped format
                        if (product.standardEquipment[0] && typeof product.standardEquipment[0] === 'object' && product.standardEquipment[0].header) {
                            // Grouped format
                            return product.standardEquipment.map(group => `
                                <div class="equipment-group">
                                    <h3 class="equipment-group-header">${group.header}</h3>
                                    <ul class="equipment-list">
                                        ${group.items.map(item => `<li>${item}</li>`).join('')}
                                    </ul>
                                </div>
                            `).join('');
                        } else {
                            // Simple array format (legacy)
                            return `
                                <ul class="equipment-list">
                                    ${product.standardEquipment.map(item => `<li>${item}</li>`).join('')}
                                </ul>
                            `;
                        }
                    })()}
                </div>
            ` : ''}

            ${specsHtml ? `
                <div class="product-specs">
                    <h2>Specifications</h2>
                    <table class="specs-table ${specsColumns === 2 ? 'specs-table-two-columns' : ''}">
                        ${specsHtml}
                    </table>
                </div>
            ` : ''}
        `;

        // Re-initialize selected options after render
        if (hasOptions) {
            product.options.forEach(option => {
                if (option.required && option.choices.length > 0) {
                    if (option.type === 'radio') {
                        selectedOptions[option.name] = option.choices[0].label;
                    }
                }
            });
        }

        // Add event listeners for option inputs
        document.querySelectorAll('.option-item input[type="radio"], .option-item input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const optionName = input.dataset.optionName;
                const choiceLabel = input.dataset.choiceLabel;
                const isChecked = input.checked || input.type === 'radio';
                
                if (input.type === 'radio') {
                    document.querySelectorAll(`[data-option="${optionName}"]`).forEach(item => {
                        item.classList.remove('selected');
                    });
                    input.closest('.option-item').classList.add('selected');
                } else {
                    input.closest('.option-item').classList.toggle('selected', isChecked);
                }
                
                handleOptionChange(optionName, choiceLabel, isChecked);
            });
        });

        // Add click handlers for option items (clicking anywhere on the item)
        document.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type === 'radio' || e.target.type === 'checkbox') return;
                
                const input = item.querySelector('input[type="radio"], input[type="checkbox"]');
                if (input) {
                    if (input.type === 'radio') {
                        input.checked = true;
                        input.dispatchEvent(new Event('change'));
                    } else {
                        input.checked = !input.checked;
                        input.dispatchEvent(new Event('change'));
                    }
                }
            });
        });

        // Set up send order button event listener (button is created dynamically)
        const sendOrderBtn = document.getElementById('sendOrderBtn');
        if (sendOrderBtn) {
            sendOrderBtn.addEventListener('click', openOrderModal);
        }
    }

    window.changeImage = function(index) {
        currentImageIndex = index;
        const mainImage = document.getElementById('mainImage');
        if (mainImage && product.images && product.images[index]) {
            mainImage.src = getProxiedImageUrl(product.images[index]);
        }
        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    };

    // Order functionality
    const orderModal = document.getElementById('orderModal');
    const orderForm = document.getElementById('orderForm');
    const closeOrderModal = document.getElementById('closeOrderModal');
    const cancelOrderBtn = document.getElementById('cancelOrderBtn');

    function openOrderModal() {
        if (orderModal) {
            orderModal.classList.add('active');
        }
    }

    function closeOrderModalFunc() {
        if (orderModal) {
            orderModal.classList.remove('active');
            orderForm.reset();
        }
    }

    if (closeOrderModal) {
        closeOrderModal.addEventListener('click', closeOrderModalFunc);
    }

    if (cancelOrderBtn) {
        cancelOrderBtn.addEventListener('click', closeOrderModalFunc);
    }

    if (orderModal) {
        orderModal.addEventListener('click', (e) => {
            if (e.target === orderModal) {
                closeOrderModalFunc();
            }
        });
    }

    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const { total, breakdown } = calculatePrice();
            const orderData = {
                productId: product.id,
                productName: product.name,
                productBrand: product.category || 'Unknown',
                productPrice: product.price,
                selectedOptions: { ...selectedOptions },
                priceBreakdown: breakdown,
                totalExclVAT: total,
                totalInclVAT: total * 1.19,
                customerInfo: {
                    fullName: document.getElementById('orderFullName').value,
                    email: document.getElementById('orderEmail').value,
                    phone: document.getElementById('orderPhone').value,
                    city: document.getElementById('orderCity').value
                },
                productImages: product.images || [],
                productDescription: product.description,
                productSpecs: product.specs || {},
                productStandardEquipment: product.standardEquipment || []
            };

            try {
                const order = await addOrder(orderData);
                
                // Generate and download PDF
                generateOrderPDF(order).then(() => {
                    alert('Order sent successfully! Your order PDF has been downloaded.');
                    closeOrderModalFunc();
                }).catch((error) => {
                    console.error('Error generating PDF:', error);
                    alert('Order sent successfully! However, there was an issue generating the PDF.');
                    closeOrderModalFunc();
                });
            } catch (error) {
                alert('Error sending order: ' + error.message);
            }
        });
    }

    async function generateOrderPDF(order) {
        // Debug: Log the order object to see its structure
        console.log('Order object for PDF:', order);
        
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
        
        // Save PDF
        doc.save(`Order-${order.orderNumber}.pdf`);
    }

    renderProduct();
    updatePrice();
});
