/* =========================================================================
   SKILLBRIDGE AUTHENTICATION & WIZARD LOGIC
   ========================================================================= */

const API_BASE_URL = 'http://127.0.0.1:8000/api/accounts';


/* =========================================================================
   1. LOGIN (index.html)
   ========================================================================= */

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({
                email    : document.getElementById('email').value,
                password : document.getElementById('password').value,
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Save tokens and user info for session management
            localStorage.setItem('access_token',  data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('user',          JSON.stringify(data.user));
            localStorage.setItem('user_role',     data.user.role);
            localStorage.setItem('first_name',    data.user.first_name);
            localStorage.setItem('last_name',     data.user.last_name);

            // Redirect based on role
            if (data.user.role === 'worker') {
                location.href = 'worker-dashboard.html';
            } else {
                location.href = 'customer-dashboard.html';
            }

        } else {
            document.getElementById('email-error').textContent = 'Invalid email or password.';
        }
    });
}


/* =========================================================================
   2. WORKER SIGNUP WIZARD (worker-signup.html)
   ========================================================================= */

// ── Step Navigation ──────────────────────────────────────────────────────

function nextStep(current) {
    const currentDiv = document.getElementById(`step${current}`);

    // Validate all required fields in current step before moving forward
    const inputs = currentDiv.querySelectorAll('input[required], select[required], textarea[required]');
    let valid = true;

    inputs.forEach(input => {
        if (!input.value) {
            input.style.borderColor = 'red';
            valid = false;
        } else {
            input.style.borderColor = '';
        }
    });

    // Extra check for step 1 — passwords must match
    if (current === 1) {
        const password = document.getElementById('w-password').value;
        const confirm  = document.getElementById('w-confirm').value;
        const errorDiv = document.getElementById('w-error');

        if (password !== confirm) {
            errorDiv.textContent = 'Passwords do not match.';
            valid = false;
        } else {
            errorDiv.textContent = '';
        }
    }

    if (valid) {
        // Hide current step, show next
        document.getElementById(`step${current}`).style.display     = 'none';
        document.getElementById(`step${current + 1}`).style.display = 'block';

        // Update progress indicators
        document.getElementById(`step${current}-ind`).classList.replace('active', 'completed');
        document.getElementById(`step${current + 1}-ind`).classList.add('active');
    }
}

function prevStep(current) {
    document.getElementById(`step${current}`).style.display     = 'none';
    document.getElementById(`step${current - 1}`).style.display = 'block';

    document.getElementById(`step${current}-ind`).classList.remove('active');
    document.getElementById(`step${current - 1}-ind`).classList.replace('completed', 'active');
}


// ── Form Submit ───────────────────────────────────────────────────────────

const workerForm = document.getElementById('worker-signup-form');
if (workerForm) {
    workerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitWorkerSignup();
    });
}


async function submitWorkerSignup() {

    /* ====================================================================
       CALL 1 — Steps 1+2
       Send basic info + professional info as JSON
       Endpoint: POST /api/accounts/register/worker/
    ==================================================================== */

    const workerData = {
        first_name       : document.getElementById('w-fname').value,
        last_name        : document.getElementById('w-lname').value,
        email            : document.getElementById('w-email').value,
        phone            : document.getElementById('w-phone').value,
        password         : document.getElementById('w-password').value,
        bio              : document.getElementById('w-desc').value,
        years_experience : parseInt(document.getElementById('w-experience').value),

        // Worker sets their actual rate later in dashboard
        // Serializer requires this field so we send 0 for now
        base_hourly_rate : 0,

        city             : document.getElementById('w-location').value,

        // Serializer expects an array — wrap single dropdown value in []
        categories       : [document.getElementById('w-category').value]
    };

    let token = null;

    try {
        const response = await fetch(`${API_BASE_URL}/register/worker/`, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify(workerData)
        });

        const data = await response.json();
        console.log('Server response:', data);  // ← add this line

        if (!response.ok) {
            // Show Django validation errors on form
            // Django returns { email: ['already exists'], phone: [...] }
            showErrors(data);
            return;
        }

        // Save token — needed to authenticate the document upload in Call 2
        token = data.token;
        localStorage.setItem('token', token);

    } catch (err) {
        console.error('Registration failed:', err);
        return;
    }


    /* ====================================================================
       CALL 2 — Step 3
       Send files as multipart/form-data
       Endpoint: PATCH /api/accounts/worker/documents/
       Requires: Authorization token from Call 1
    ==================================================================== */

    const formData = new FormData();

    const cnicFileFront  = document.getElementById('id-upload').files[0];
    const cnicFileBack = document.getElementById('id-upload').files[1];
    const photoFile = document.getElementById('photo-upload').files[0];

    // Only append if user actually selected a file
    if (cnicFileFront)  formData.append('cnic_front',    cnicFileFront);
    if (cnicFileBack) formData.append('cnic_back', cnicFileBack);
    if (photoFile) formData.append('profile_photo', photoFile);

    try {
        const response = await fetch(`${API_BASE_URL}/worker/documents/`, {
            method  : 'PATCH',
            headers : {
                // Send token so Django knows who this user is
                // Do NOT set Content-Type here — browser sets it automatically for FormData
                'Authorization' : `Bearer ${token}`,
            },
            body : formData
        });

        if (!response.ok) {
            console.error('Document upload failed');
            return;
        }

    } catch (err) {
        console.error('Upload error:', err);
        return;
    }

    // ── Both calls succeeded — redirect to confirmation page ──
    location.href = 'verification-status.html';
}


// ── Error Display Helper ──────────────────────────────────────────────────

function showErrors(data) {
    const errorDiv = document.getElementById('w-error');
    if (!errorDiv) return;

    // Django returns errors as { field: ['message'] }
    // Flatten all messages into one readable string
    const messages = Object.values(data).flat().join(' ');
    errorDiv.textContent = messages;
}

/* =========================================================================
   3. CUSTOMER SIGNUP (customer-signup.html)
   ========================================================================= */

const customerForm = document.getElementById('customer-signup-form');
if (customerForm) {
    customerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const confirm  = document.getElementById('confirm-password').value;
        const errorDiv = document.getElementById('signup-error');

        // ── Validate passwords match before sending to backend ──
        if (password !== confirm) {
            errorDiv.textContent = 'Passwords do not match.';
            return;
        }
        errorDiv.textContent = '';

        // ── Build the data object to send to Django ──
        const customerData = {
            first_name : document.getElementById('first-name').value.trim(),
            last_name  : document.getElementById('last-name').value.trim(),
            email      : document.getElementById('email').value.trim(),
            phone      : document.getElementById('phone').value.trim(),
            password   : password,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/register/customer/`, {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(customerData)
            });

            const data = await response.json();
            console.log('Customer signup response:', data);

            if (!response.ok) {
                // Django returns errors like { email: ['already exists'] }
                // Flatten all messages into one string and show on form
                const messages = Object.values(data).flat().join(' ');
                errorDiv.textContent = messages;
                return;
            }

            // ── Save tokens and user info to localStorage ──
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('user',          JSON.stringify(data.user));
            localStorage.setItem('user_role',     data.user.role);
            localStorage.setItem('first_name',    data.user.first_name);
            localStorage.setItem('last_name',     data.user.last_name);

            // ── Redirect to customer dashboard on success ──
            location.href = 'customer-dashboard.html';

        } catch (err) {
            console.error('Customer signup error:', err);
            errorDiv.textContent = 'Something went wrong. Please try again.';
        }
    });
}