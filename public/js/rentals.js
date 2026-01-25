// Rentals page functionality

function initRentalForm() {
    const form = document.getElementById('rentalForm');
    const statusEl = document.getElementById('rentalStatus');
    const messageTextarea = document.getElementById('rentalMessage');
    const charCountEl = document.getElementById('charCount');

    if (!form) return;

    // Character counter for message textarea
    if (messageTextarea && charCountEl) {
        messageTextarea.addEventListener('input', () => {
            const count = messageTextarea.value.length;
            charCountEl.textContent = count;
        });
    }

    const setStatus = (message, isError = false) => {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.toggle('error', isError);
        statusEl.classList.toggle('success', !isError);
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('rentalName')?.value.trim();
        const company = document.getElementById('rentalCompany')?.value.trim();
        const website = document.getElementById('rentalWebsite')?.value.trim();
        const city = document.getElementById('rentalCity')?.value;
        const email = document.getElementById('rentalEmail')?.value.trim();
        const phone = document.getElementById('rentalPhone')?.value.trim();
        const message = document.getElementById('rentalMessage')?.value.trim();
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!name || !company || !city || !email || !phone) {
            setStatus('Please fill in all required fields.', true);
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
        }

        // Build message with all rental form data
        const fullMessage = `Rental Partner Inquiry\n\n` +
            `Company: ${company}\n` +
            `Website: ${website || 'Not provided'}\n` +
            `City: ${city}\n` +
            `Phone: ${phone}\n` +
            (message ? `\nMessage:\n${message}` : '');

        try {
            const api = await import('./api.js');
            await api.createQuery({
                name,
                email,
                phone,
                message: fullMessage
            });
            setStatus('Thank you! Your rental partner inquiry has been sent. We will get back to you shortly.', false);
            form.reset();
            if (charCountEl) charCountEl.textContent = '0';
        } catch (error) {
            console.error('Error submitting rental inquiry:', error);
            setStatus('Something went wrong. Please try again.', true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }
        }
    });
}

// Initialize rentals page
document.addEventListener('DOMContentLoaded', () => {
    initRentalForm();
});
