// Model specifications + optional Key Features / Gallery from API

function escapeHtml(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

function mediaImageSrc(url) {
    if (!url || typeof url !== 'string') return '';
    const u = url.trim();
    if (!u) return '';
    if (typeof getProxiedImageUrl === 'function' && (u.startsWith('http://') || u.startsWith('https://'))) {
        return getProxiedImageUrl(u);
    }
    return u;
}

async function fetchModelSpecificationRecord(modelName) {
    const response = await fetch(`/api/model-specifications/${encodeURIComponent(modelName)}`);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to load specifications');
    }
    return response.json();
}

function renderSpecificationsTable(specs, container) {
    if (!specs || !container) return;

    const specSections = [
        { name: 'General', fields: ['Shipyard', 'Type', 'Subtype', 'Model range', 'Model', 'Country', 'Build type', 'Status', 'Premiere'] },
        { name: 'Design & classification', fields: ['Concept', 'Classification'] },
        { name: 'Dimensions', fields: ['Length (LOA), m', 'Beam (max), m', 'Draft, m', 'Dry weight, t'] },
        { name: 'Hull & superstructure', fields: ['Hull type', 'Hull material', 'Deadrise (transom)', 'Decks'] },
        { name: 'Accommodation', fields: ['Passengers', 'Heads'] },
        { name: 'Engines, Performance, Capacity', fields: ['Engine type', 'Engines', 'Fuel type', 'Drive type', 'Max Power (H.P.)', 'Speed (max), kn', 'Fuel capacity, l', 'Water capacity, l'] }
    ];

    let tableHTML = '<table class="specs-table-detailed"><tbody>';

    specSections.forEach(section => {
        tableHTML += `<tr class="spec-section-header"><td colspan="2">${escapeHtml(section.name)}</td></tr>`;

        section.fields.forEach(field => {
            const value = specs[field] || '';
            if (value) {
                tableHTML += `
                    <tr>
                        <td class="spec-label-cell">${escapeHtml(field)}</td>
                        <td class="spec-value-cell">${escapeHtml(value)}</td>
                    </tr>
                `;
            }
        });
    });

    tableHTML += '</tbody></table>';
    tableHTML += '<p class="specs-disclaimer">*Specifications may be changed without prior notice. Performance may vary due to equipment, weather and load conditions.</p>';
    container.innerHTML = tableHTML;
}

function updateSpecBoxes(specs) {
    if (!specs) return;

    const specsGrid = document.querySelector('.specs-grid');
    if (!specsGrid) return;

    const lengthValue = specs['Length (LOA), m'] || '';
    const beamValue = specs['Beam (max), m'] || '';
    const powerValue = specs['Max Power (H.P.)'] || specs['Power, h.p.'] || '';
    const capacityValue = specs['Passengers'] || '';

    const specCards = specsGrid.querySelectorAll('.spec-card');
    specCards.forEach((card, index) => {
        const valueElement = card.querySelector('.spec-value');
        if (valueElement) {
            switch (index) {
                case 0:
                    if (lengthValue) {
                        valueElement.textContent = lengthValue + (lengthValue.includes('m') ? '' : 'm');
                    }
                    break;
                case 1:
                    if (beamValue) {
                        valueElement.textContent = beamValue + (beamValue.includes('m') ? '' : 'm');
                    }
                    break;
                case 2:
                    if (powerValue) {
                        let formattedPower = powerValue.toString();
                        if (!formattedPower.toUpperCase().includes('HP') && !formattedPower.toUpperCase().includes('H.P')) {
                            formattedPower = formattedPower + ' HP';
                        }
                        valueElement.textContent = formattedPower;
                    }
                    break;
                case 3:
                    if (capacityValue) {
                        valueElement.textContent = capacityValue;
                    }
                    break;
            }
        }
    });
}

function applyFeaturePanelsFromRecord(record) {
    const panels = (record.featurePanels || []).filter((p) => (p.image || p.imageUrl || '').toString().trim());
    if (!panels.length) return;

    const wrap = document.getElementById('featuresAccordion') || document.querySelector('.features-accordion');
    if (!wrap) return;

    wrap.innerHTML = panels.map((p, i) => {
        const title = (p.title || 'Feature').trim() || 'Feature';
        const desc = (p.description || '').trim();
        const imgUrl = (p.image || p.imageUrl || '').trim();
        if (!imgUrl) return '';
        const src = escapeHtml(mediaImageSrc(imgUrl));
        const alt = escapeHtml((p.alt || title).trim());
        const active = i === 0 ? ' active' : '';
        return `
            <div class="feature-accordion-item${active}" data-feature="${i}">
                <img src="${src}" alt="${alt}" class="feature-accordion-image" loading="lazy">
                <div class="feature-accordion-overlay">
                    <h3 class="feature-accordion-title">${escapeHtml(title)}</h3>
                    <div class="feature-accordion-content">
                        <p class="feature-accordion-description">${escapeHtml(desc)}</p>
                    </div>
                </div>
            </div>`;
    }).filter(Boolean).join('');

    if (!wrap.innerHTML.trim()) return;
    wrap.dataset.delegateWired = '';
    ensureFeatureAccordionDelegation();
}

function applyGalleryFromRecord(record) {
    const images = (record.galleryImages || []).filter((g) => (g.src || g.url || '').toString().trim());
    if (!images.length) return;

    const grid = document.querySelector('.model-gallery .gallery-grid');
    if (!grid) return;

    grid.innerHTML = images.map((g) => {
        const srcRaw = (g.src || g.url || '').trim();
        if (!srcRaw) return '';
        const src = escapeHtml(mediaImageSrc(srcRaw));
        const alt = escapeHtml((g.alt || 'Gallery').trim());
        return `<div class="gallery-item"><img src="${src}" alt="${alt}" class="gallery-image" loading="lazy"></div>`;
    }).filter(Boolean).join('');

    if (!grid.innerHTML.trim()) return;
}

function ensureFeatureAccordionDelegation() {
    const wrap = document.getElementById('featuresAccordion') || document.querySelector('.features-accordion');
    if (!wrap) return;
    if (wrap.dataset.delegateWired === '1') return;
    wrap.dataset.delegateWired = '1';
    wrap.addEventListener('click', (e) => {
        const item = e.target.closest('.feature-accordion-item');
        if (!item || !wrap.contains(item)) return;
        wrap.querySelectorAll('.feature-accordion-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
    });
}

async function initModelSpecifications(modelName) {
    const container = document.querySelector('.detailed-specs-table');

    let record = null;
    try {
        record = await fetchModelSpecificationRecord(modelName);
    } catch (error) {
        console.error('Error loading model specifications:', error);
    }

    if (record && record.specifications && container) {
        renderSpecificationsTable(record.specifications, container);
        updateSpecBoxes(record.specifications);
    } else if (container) {
        const existingTable = container.querySelector('table');
        if (!existingTable) {
            container.style.display = 'none';
        }
    }

    if (record) {
        applyFeaturePanelsFromRecord(record);
        applyGalleryFromRecord(record);
    }

    ensureFeatureAccordionDelegation();
}

async function loadModelSpecifications(modelName) {
    try {
        const record = await fetchModelSpecificationRecord(modelName);
        return record ? record.specifications : null;
    } catch (error) {
        console.error('Error loading model specifications:', error);
        return null;
    }
}
