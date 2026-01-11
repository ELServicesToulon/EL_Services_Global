document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.step-content');
    const progressFill = document.querySelector('.progress-fill');
    const nextBtns = document.querySelectorAll('.btn-next');
    const prevBtns = document.querySelectorAll('.btn-prev');
    const form = document.getElementById('reservationForm');

    let currentStep = 0;

    function updateStep() {
        // Update Visibility
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        // Update Progress Bar
        const progress = ((currentStep + 1) / steps.length) * 100;
        progressFill.style.width = `${progress}%`;

        // Scroll to top of form
        const formContainer = document.querySelector('.booking-card');
        if (formContainer) {
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Logic validation could go here
            if (currentStep < steps.length - 1) {
                currentStep++;
                updateStep();
            }
        });
    });

    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateStep();
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Envoi en cours...';
        submitBtn.disabled = true;

        // Collect Data
        const transportType = document.getElementById('transportType').value;
        const depart = document.querySelectorAll('.form-input')[0].value;
        const arrivee = document.querySelectorAll('.form-input')[1].value;
        const datetime = document.querySelectorAll('.form-input')[2].value;
        const nom = document.querySelectorAll('.form-input')[3].value;
        const email = document.getElementById('email').value;
        const phone = document.querySelectorAll('.form-input')[5].value; // Index shifted due to added email

        // Format Date/Time for GAS (YYYY-MM-DD and HH:mm)
        let dateStr = "";
        let timeStr = "";
        if (datetime) {
            const d = new Date(datetime);
            dateStr = d.toISOString().split('T')[0];
            timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
        }

        const payload = {
            action: 'nouvelleReservation',
            client: {
                nom: nom,
                email: email,
                telephone: phone,
                codePostal: "00000" // Default for vitrine simplified flow, or extract from address?
            },
            items: [
                {
                    date: dateStr,
                    startTime: timeStr,
                    details: `${transportType.toUpperCase()} - De ${depart} à ${arrivee}`,
                    totalStops: 1,
                    returnToPharmacy: false,
                    prix: 0 // Estimated or 0
                }
            ]
        };

        try {
            // Apps Script Web App URL (Projet_ELS)
            const URL = 'https://script.google.com/macros/s/AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb/exec';

            // Use no-cors mode or handle redirect if possible.
            // Actually, with standard fetch `method: 'POST'` and `body: JSON.stringify(payload)`, GAS requires `Content-Type: text/plain` to avoid preflight complex CORS.
            // And we need to follow redirects.

            await fetch(URL, {
                method: 'POST',
                mode: 'no-cors', // Important for GAS opaque response
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            });

            // Since no-cors returns opaque, we assume success if no network error.
            alert('Merci ' + nom + ' ! Votre demande est enregistrée. Vous allez recevoir une confirmation par email.');
            // form.reset();
            window.location.reload();

        } catch (error) {
            console.error(error);
            alert("Une erreur est survenue. Merci de contacter le régulateur par téléphone.");
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });

    // Dynamic selection visual feedback
    const cards = document.querySelectorAll('.transport-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            // Set hidden input value
            document.getElementById('transportType').value = card.dataset.value;
        });
    });
});
