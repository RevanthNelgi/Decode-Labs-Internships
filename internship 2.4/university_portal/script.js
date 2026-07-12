document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('admission-form');
    const inputs = form.querySelectorAll('input:not([readonly]), select');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const submitBtn = document.getElementById('submit-btn');
    const resetBtn = document.getElementById('reset-btn');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    submitBtn.disabled = true;
    const validators = {
        fullName: (value) => {
            const regex = /^[a-zA-Z\s]+$/;
            if (!value) return "Full Name is required.";
            if (!regex.test(value)) return "Name should contain only alphabets.";
            return "";
        },
        dob: (value) => {
            if (!value) return "Date of Birth is required.";
            return "";
        },
        gender: (value) => {
            if (!value) return "Please select a gender.";
            return "";
        },
        email: (value) => {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value) return "Email is required.";
            if (!regex.test(value)) return "Please enter a valid email address.";
            return "";
        },
        mobile: (value) => {
            const regex = /^\d{10}$/;
            if (!value) return "Mobile number is required.";
            if (!regex.test(value)) return "Mobile number must be exactly 10 digits.";
            return "";
        },
        parentName: (value) => {
            const regex = /^[a-zA-Z\s]+$/;
            if (!value) return "Parent Name is required.";
            if (!regex.test(value)) return "Name should contain only alphabets.";
            return "";
        },
        parentMobile: (value) => {
            const regex = /^\d{10}$/;
            if (!value) return "Parent mobile number is required.";
            if (!regex.test(value)) return "Mobile number must be exactly 10 digits.";
            return "";
        },
        address: (value) => value.trim() ? "" : "Address is required.",
        city: (value) => value.trim() ? "" : "City is required.",
        state: (value) => value.trim() ? "" : "State is required.",
        pincode: (value) => {
            const regex = /^\d{6}$/;
            if (!value) return "PIN Code is required.";
            if (!regex.test(value)) return "PIN Code must be exactly 6 digits.";
            return "";
        },
        course: (value) => value ? "" : "Please select a course.",
        percentage: (value) => {
            if (!value) return "Percentage is required.";
            const num = parseFloat(value);
            if (num < 0 || num > 100) return "Percentage must be between 0 and 100.";
            return "";
        },
        admissionYear: (value) => value ? "" : "Please select an admission year.",
        password: (value) => {
            if (!value) return "Password is required.";
            const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!regex.test(value)) return "Must contain 8+ chars, uppercase, lowercase, number, special char.";
            return "";
        },
        confirmPassword: (value) => {
            if (!value) return "Please confirm your password.";
            if (value !== passwordInput.value) return "Passwords do not match.";
            return "";
        },
        terms: (value, el) => el.checked ? "" : "You must accept the terms & conditions."
    };
    const dobInput = document.getElementById('dob');
    const ageInput = document.getElementById('age');
    dobInput.addEventListener('change', () => {
        if (dobInput.value) {
            const dob = new Date(dobInput.value);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            ageInput.value = age > 0 ? age : 0;
            validateField(dobInput);
        }
    });
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
    });
    const strengthIndicator = document.getElementById('password-strength');
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        let strength = 0;
        if (val.length >= 8) strength++;
        if (/[A-Z]/.test(val)) strength++;
        if (/[a-z]/.test(val)) strength++;
        if (/[0-9]/.test(val)) strength++;
        if (/[^A-Za-z0-9]/.test(val)) strength++;

        let color = 'transparent';
        if (val.length > 0) {
            if (strength <= 2) color = '#ff4757';
            else if (strength <= 4) color = '#ffa502';
            else color = '#2ed573';
        }
        
        strengthIndicator.style.backgroundColor = color;
        strengthIndicator.style.width = val.length > 0 ? `${(strength / 5) * 100}%` : '100%';

        if(document.getElementById('confirmPassword').value) {
            validateField(document.getElementById('confirmPassword'));
        }
    });
    inputs.forEach(input => {
        input.addEventListener('input', () => validateField(input));
        input.addEventListener('change', () => validateField(input));
        input.addEventListener('blur', () => validateField(input));
    });

    function validateField(field) {
        const name = field.name;
        if (!validators[name]) return true;

        const errorMsg = validators[name](field.value, field);
        const inputGroup = field.closest('.input-group') || field.closest('.checkbox-group');
        const errorElement = document.getElementById(`${name}-error`);

        if (errorMsg) {
            inputGroup.classList.remove('success');
            inputGroup.classList.add('error');
            if(errorElement) errorElement.textContent = errorMsg;
            updateProgress();
            return false;
        } else {
            inputGroup.classList.remove('error');
            inputGroup.classList.add('success');
            if(errorElement) errorElement.textContent = '';
            updateProgress();
            return true;
        }
    }
    function updateProgress() {
        let validCount = 0;
        let totalCount = Object.keys(validators).length;

        inputs.forEach(input => {
            const name = input.name;
            if (validators[name]) {
                if (!validators[name](input.value, input)) {
                    validCount++;
                }
            }
        });

        const percentage = Math.round((validCount / totalCount) * 100);
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% Completed`;

        submitBtn.disabled = percentage !== 100;
        return percentage === 100;
    }
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let isValid = true;
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });

        if (isValid) {
            document.getElementById('success-modal').classList.add('active');
        }
    });
    resetBtn.addEventListener('click', () => {
        form.reset();
        inputs.forEach(input => {
            const group = input.closest('.input-group') || input.closest('.checkbox-group');
            group.classList.remove('success', 'error');
            const errorElement = document.getElementById(`${input.name}-error`);
            if(errorElement) errorElement.textContent = '';
        });
        strengthIndicator.style.backgroundColor = 'transparent';
        strengthIndicator.style.width = '100%';
        ageInput.value = '';
        updateProgress();
    });
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('success-modal').classList.remove('active');
        resetBtn.click();
    });
});

