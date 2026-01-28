// Model Specifications Loader
async function loadModelSpecifications(modelName) {
    try {
        const response = await fetch(`/api/model-specifications/${encodeURIComponent(modelName)}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null; // No specifications found
            }
            throw new Error('Failed to load specifications');
        }
        const data = await response.json();
        return data.specifications;
    } catch (error) {
        console.error('Error loading model specifications:', error);
        return null;
    }
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
        tableHTML += `<tr class="spec-section-header"><td colspan="2">${section.name}</td></tr>`;
        
        section.fields.forEach(field => {
            const value = specs[field] || '';
            if (value) {
                tableHTML += `
                    <tr>
                        <td class="spec-label-cell">${field}</td>
                        <td class="spec-value-cell">${value}</td>
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
    
    // Find the specs-grid container
    const specsGrid = document.querySelector('.specs-grid');
    if (!specsGrid) return;
    
    // Map database fields to spec boxes
    const lengthValue = specs['Length (LOA), m'] || '';
    const beamValue = specs['Beam (max), m'] || '';
    const powerValue = specs['Max Power (H.P.)'] || specs['Power, h.p.'] || ''; // Support old field name for backward compatibility
    const capacityValue = specs['Passengers'] || '';
    
    // Update each spec card
    const specCards = specsGrid.querySelectorAll('.spec-card');
    specCards.forEach((card, index) => {
        const valueElement = card.querySelector('.spec-value');
        if (valueElement) {
            switch(index) {
                case 0: // Length
                    if (lengthValue) {
                        valueElement.textContent = lengthValue + (lengthValue.includes('m') ? '' : 'm');
                    }
                    break;
                case 1: // Beam
                    if (beamValue) {
                        valueElement.textContent = beamValue + (beamValue.includes('m') ? '' : 'm');
                    }
                    break;
                case 2: // Max Power
                    if (powerValue) {
                        // Format power value - add HP if not present
                        let formattedPower = powerValue.toString();
                        if (!formattedPower.toUpperCase().includes('HP') && !formattedPower.toUpperCase().includes('H.P')) {
                            formattedPower = formattedPower + ' HP';
                        }
                        valueElement.textContent = formattedPower;
                    }
                    break;
                case 3: // Capacity
                    if (capacityValue) {
                        valueElement.textContent = capacityValue;
                    }
                    break;
            }
        }
    });
}

async function initModelSpecifications(modelName) {
    const container = document.querySelector('.detailed-specs-table');
    if (!container) return;
    
    const specs = await loadModelSpecifications(modelName);
    if (specs) {
        // Replace any existing table with dynamic data
        renderSpecificationsTable(specs, container);
        // Update the 4 spec boxes at the top
        updateSpecBoxes(specs);
    } else {
        // If no database data, keep existing hardcoded table if it exists
        // Otherwise hide the container
        const existingTable = container.querySelector('table');
        if (!existingTable) {
            container.style.display = 'none';
        }
    }
}
