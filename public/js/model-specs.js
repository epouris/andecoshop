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
        { name: 'Design & classification', fields: ['Concept', 'Architecture', 'Exterior', 'Classification'] },
        { name: 'Dimensions', fields: ['Length (LOA), m', 'Beam (max), m', 'Draft, m', 'Dry weight, t'] },
        { name: 'Hull & superstructure', fields: ['Hull type', 'Hull material', 'Deadrise (transom)', 'Decks'] },
        { name: 'Accommodation', fields: ['Passengers', 'Heads'] },
        { name: 'Engines, Performance, Capacity', fields: ['Engine type', 'Engines', 'Fuel type', 'Drive type', 'Power, h.p.', 'Speed (max), kn', 'Fuel capacity, l', 'Water capacity, l'] },
        { name: 'Features', fields: ['Outdoor areas', 'Beach club', 'Hydraulic platform', 'Stabilizers'] }
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
    container.innerHTML = tableHTML;
}

async function initModelSpecifications(modelName) {
    const container = document.querySelector('.detailed-specs-table');
    if (!container) return;
    
    const specs = await loadModelSpecifications(modelName);
    if (specs) {
        // Replace any existing table with dynamic data
        renderSpecificationsTable(specs, container);
    } else {
        // If no database data, keep existing hardcoded table if it exists
        // Otherwise hide the container
        const existingTable = container.querySelector('table');
        if (!existingTable) {
            container.style.display = 'none';
        }
    }
}
