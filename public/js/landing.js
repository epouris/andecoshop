// Create a data URI placeholder image that always works (defined globally)
const PLACEHOLDER_IMAGE_LANDING = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f1f5f9" width="400" height="400"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

// Make function globally accessible for inline onerror handlers
window.handleImageErrorLanding = function(img) {
    if (img.src !== PLACEHOLDER_IMAGE_LANDING) {
        img.src = PLACEHOLDER_IMAGE_LANDING;
        img.onerror = null; // Prevent infinite loop
    }
};

// Hero Slider Functionality
function initHeroSlider() {
    const slider = document.getElementById('heroSlider');
    const prevBtn = document.getElementById('sliderPrev');
    const nextBtn = document.getElementById('sliderNext');
    const indicators = document.querySelectorAll('.indicator');
    const slides = document.querySelectorAll('.hero-slide');
    
    if (!slider || slides.length === 0) return;
    
    let currentSlide = 0;
    let autoPlayInterval = null;
    const autoPlayDelay = 5000; // 5 seconds
    
    function showSlide(index) {
        // Remove active class from all slides and indicators
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        // Add active class to current slide and indicator
        if (slides[index]) {
            slides[index].classList.add('active');
        }
        if (indicators[index]) {
            indicators[index].classList.add('active');
        }
        
        currentSlide = index;
    }
    
    function nextSlide() {
        const next = (currentSlide + 1) % slides.length;
        showSlide(next);
    }
    
    function prevSlide() {
        const prev = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(prev);
    }
    
    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, autoPlayDelay);
    }
    
    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }
    
    // Event listeners
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            stopAutoPlay();
            startAutoPlay();
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            stopAutoPlay();
            startAutoPlay();
        });
    }
    
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            showSlide(index);
            stopAutoPlay();
            startAutoPlay();
        });
    });
    
    // Pause autoplay on hover
    if (slider) {
        slider.addEventListener('mouseenter', stopAutoPlay);
        slider.addEventListener('mouseleave', startAutoPlay);
    }
    
    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    if (slider) {
        slider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        slider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
    }
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
            stopAutoPlay();
            startAutoPlay();
        }
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevSlide();
            stopAutoPlay();
            startAutoPlay();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
            stopAutoPlay();
            startAutoPlay();
        }
    });
    
    // Start autoplay
    startAutoPlay();
    
    // Initialize first slide
    showSlide(0);
}

function initContactForm() {
    const form = document.getElementById('contactForm');
    const statusEl = document.getElementById('contactStatus');

    if (!form) return;

    const setStatus = (message, isError = false) => {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.toggle('error', isError);
        statusEl.classList.toggle('success', !isError);
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('contactName')?.value.trim();
        const email = document.getElementById('contactEmail')?.value.trim();
        const phone = document.getElementById('contactPhone')?.value.trim();
        const message = document.getElementById('contactMessage')?.value.trim();
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!name || !email || !message) {
            setStatus('Please fill in all required fields.', true);
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
        }

        try {
            const api = await import('./api.js');
            await api.createQuery({ name, email, phone, message });
            setStatus('Thank you! Your message has been sent.', false);
            form.reset();
        } catch (error) {
            console.error('Error submitting query:', error);
            setStatus('Something went wrong. Please try again.', true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }
        }
    });
}

// Landing page functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize hero slider
    initHeroSlider();
    initContactForm();
    
    const brandsGrid = document.getElementById('brandsGrid');
    
    if (!brandsGrid) return;

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

    function renderBrands() {
        const brands = getAllBrands();

        if (brands.length === 0) {
            brandsGrid.innerHTML = '<p style="text-align: center; color: var(--text-light); grid-column: 1 / -1;">No brands available yet.</p>';
            return;
        }

        brandsGrid.innerHTML = brands.map(brand => {
            const images = brand.images.length > 0 ? brand.images.map(img => getProxiedImageUrl(img)) : [PLACEHOLDER_IMAGE_LANDING];
            const imageCount = Math.min(images.length, 4);
            
            // Create split image grid based on number of images
            let imageGrid = '';
            if (imageCount === 1) {
                imageGrid = `
                    <div class="brand-image-split single">
                        <img src="${getProxiedImageUrl(images[0])}" alt="${brand.name}" onerror="handleImageErrorLanding(this)">
                    </div>
                `;
            } else if (imageCount === 2) {
                imageGrid = `
                    <div class="brand-image-split two">
                        <img src="${getProxiedImageUrl(images[0])}" alt="${brand.name}" onerror="handleImageErrorLanding(this)">
                        <img src="${getProxiedImageUrl(images[1] || images[0])}" alt="${brand.name}" onerror="handleImageErrorLanding(this)">
                    </div>
                `;
            } else if (imageCount === 3) {
                imageGrid = `
                    <div class="brand-image-split three">
                        <img src="${getProxiedImageUrl(images[0])}" alt="${brand.name}" onerror="handleImageErrorLanding(this)">
                        <img src="${getProxiedImageUrl(images[1] || images[0])}" alt="${brand.name}" onerror="handleImageErrorLanding(this)">
                        <img src="${images[2] || images[0]}" alt="${brand.name}" onerror="handleImageError(this)">
                    </div>
                `;
            } else {
                imageGrid = `
                    <div class="brand-image-split four">
                        <img src="${getProxiedImageUrl(images[0])}" alt="${brand.name}" onerror="handleImageErrorLanding(this)">
                        <img src="${getProxiedImageUrl(images[1] || images[0])}" alt="${brand.name}" onerror="handleImageErrorLanding(this)">
                        <img src="${images[2] || images[0]}" alt="${brand.name}" onerror="handleImageErrorLanding(this)">
                        <img src="${getProxiedImageUrl(images[3] || images[0])}" alt="${brand.name}" onerror="handleImageErrorLanding(this)">
                    </div>
                `;
            }
            
            // Use brand logo if available, otherwise use split product images
            const hasLogo = brand.logo && brand.logo.trim() !== '';
            
            return `
                <a href="brand.html?brand=${encodeURIComponent(brand.name)}" class="brand-card">
                    <div class="brand-image-container">
                        ${hasLogo ? `
                            <div class="brand-logo-container">
                                <img src="${getProxiedImageUrl(brand.logo)}" alt="${brand.name} Logo" class="brand-logo-main" data-fallback-images='${JSON.stringify(images.map(img => getProxiedImageUrl(img)))}'>
                            </div>
                        ` : imageGrid}
                    </div>
                    <div class="brand-info">
                        ${hasLogo ? `<h3 class="brand-name-below">${brand.name}</h3>` : ''}
                        ${!hasLogo ? `
                        <div class="brand-overlay">
                            <h3 class="brand-name">${brand.name}</h3>
                        </div>
                        ` : ''}
                        <p class="brand-count">${brand.productCount} ${brand.productCount === 1 ? 'product' : 'products'}</p>
                    </div>
                </a>
            `;
        }).join('');
        
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
                                fallbackGrid = `<div class="brand-image-split single"><img src="${fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"></div>`;
                            } else if (imageCount === 2) {
                                fallbackGrid = `<div class="brand-image-split two"><img src="${fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"><img src="${fallbackImages[1] || fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"></div>`;
                            } else if (imageCount === 3) {
                                fallbackGrid = `<div class="brand-image-split three"><img src="${fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"><img src="${fallbackImages[1] || fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"><img src="${fallbackImages[2] || fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"></div>`;
                            } else {
                                fallbackGrid = `<div class="brand-image-split four"><img src="${fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"><img src="${fallbackImages[1] || fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"><img src="${fallbackImages[2] || fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"><img src="${fallbackImages[3] || fallbackImages[0]}" alt="" onerror="handleImageErrorLanding(this)"></div>`;
                            }
                            container.innerHTML = fallbackGrid;
                        }
                    }
                });
            });
        }, 100);
    }

    // Update stats
    function updateStats() {
        const brands = getAllBrands();
        const products = getProducts();
        
        const totalBrandsEl = document.getElementById('totalBrands');
        const totalProductsEl = document.getElementById('totalProducts');
        
        if (totalBrandsEl) {
            totalBrandsEl.textContent = brands.length;
        }
        if (totalProductsEl) {
            totalProductsEl.textContent = products.length;
        }
    }

    // Initial render
    renderBrands();
    updateStats();
});
