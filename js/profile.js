function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function redirectToLogin() {
    window.location.href = '../pages/login.html';
}

async function loadUserProfile() {
    const token = getToken();
    if (!token) {
        alert('Вы не авторизованы');
        redirectToLogin();
        return;
    }

    try {
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            renderUserProfile(data);
        } else {
            alert(data.message || 'Ошибка загрузки профиля');
            redirectToLogin();
        }
    } catch (err) {
        console.error('Ошибка запроса:', err);
        alert('Сервер недоступен');
    }
}

function renderUserProfile(user) {
    document.querySelector('.profile-table-title').textContent = `${user.lastName} ${user.firstName}`;
    document.querySelector('.info-box-mail .info-box-text').textContent = user.email;
    document.querySelector('.info-box-tariff .info-box-text').textContent = user.tariff || 'Не указан';
    document.querySelector('.info-box-duration .info-box-text').textContent = user.tariffExpiry || '—';

    const autoRenew = document.getElementById('switch-box');
    if (autoRenew) {
        autoRenew.checked = !!user.autoRenew;
        autoRenew.addEventListener('change', () => updateAutoRenew(autoRenew.checked));
    }
}

async function updateAutoRenew(newValue) {
    const token = getToken();
    try {
        const response = await fetch('/api/profile/auto-renew', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ autoRenew: newValue })
        });

        const data = await response.json();
        if (!response.ok) {
            alert(data.message || 'Не удалось изменить автопродление');
        }
    } catch (err) {
        console.error('Ошибка автопродления:', err);
        alert('Сервер недоступен');
    }
}

function openModal(title, type) {
    const modal = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('modalSubmit');

    modalTitle.textContent = title;
    modal.style.display = 'block';

    document.querySelectorAll('#modalInputs input').forEach(input => {
        input.value = '';
        input.style.display = 'none';
    });

    if (type === 'name') {
        const fn = document.getElementById('firstNameInput');
        const ln = document.getElementById('lastNameInput');
        fn.placeholder = 'Имя';
        ln.placeholder = 'Фамилия';
        fn.style.display = 'block';
        ln.style.display = 'block';

        submitBtn.onclick = () => {
            const firstName = fn.value.trim();
            const lastName = ln.value.trim();
            if (!firstName || !lastName) return alert('Введите имя');
            updateName(firstName, lastName);
        };
    }

    if (type === 'email') {
        const email = document.getElementById('firstNameInput');
        email.placeholder = 'Введите новый email';
        email.style.display = 'block';

        submitBtn.onclick = () => {
            const newEmail = email.value.trim();
            if (!newEmail.includes('@')) return alert('Введите корректный email');
            updateEmail(newEmail);
        };
    }

    if (type === 'password') {
        const p1 = document.getElementById('modalInput');
        const p2 = document.getElementById('confirmPasswordInput');
        p1.style.display = 'block';
        p2.style.display = 'block';

        submitBtn.onclick = () => {
            if (p1.value.length < 6) return alert('Пароль должен быть не менее 6 символов');
            if (p1.value !== p2.value) return alert('Пароли не совпадают');
            updatePassword(p1.value);
        };
    }

    document.getElementById('modalCancel').onclick = closeModal;
    document.getElementById('modalClose').onclick = closeModal;

    initPasswordToggle();
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

function initProfileEdit() {
    document.querySelectorAll('.info-box-change-btn').forEach((btn) => {
        if (btn.closest('.info-box-name')) {
            btn.addEventListener('click', () => openModal('Изменить имя и фамилию', 'name'));
        }
        if (btn.closest('.info-box-mail')) {
            btn.addEventListener('click', () => openModal('Изменить почту', 'email'));
        }
        if (btn.closest('.info-box-password')) {
            btn.addEventListener('click', () => openModal('Изменить пароль', 'password'));
        }
    });
}

async function updateName(firstName, lastName) {
    const token = getToken();
    try {
        const res = await fetch('/api/profile/name', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ firstName, lastName })
        });

        const data = await res.json();
        if (res.ok) {
            alert('Имя и фамилия обновлены');
            location.reload();
        } else {
            alert(data.message || 'Ошибка обновления имени');
        }
    } catch (err) {
        console.error(err);
        alert('Сервер недоступен');
    }
}

async function updateEmail(email) {
    const token = getToken();
    try {
        const res = await fetch('/api/profile/email', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (res.ok) {
            alert('Email обновлён');
            location.reload();
        } else {
            alert(data.message || 'Ошибка обновления email');
        }
    } catch (err) {
        console.error(err);
        alert('Сервер недоступен');
    }
}

async function updatePassword(password) {
    const token = getToken();
    try {
        const res = await fetch('/api/profile/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (res.ok) {
            alert('Пароль обновлён');
            closeModal();
        } else {
            alert(data.message || 'Ошибка обновления пароля');
        }
    } catch (err) {
        console.error(err);
        alert('Сервер недоступен');
    }
}

function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-password');

    toggleButtons.forEach(button => {
        const svg = button.querySelector('svg');
        const input = button.closest('.password-field')?.querySelector('input');

        if (!svg || !input) return;

        const eyeBase = `
            <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
            <circle cx="12" cy="12" r="2.5"/>
        `;
        const strikeLine = `
            <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2" />
        `;

        svg.innerHTML = eyeBase;

        button.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            button.setAttribute('aria-label', isPassword ? 'Скрыть пароль' : 'Показать пароль');
            svg.innerHTML = eyeBase + (isPassword ? strikeLine : '');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    initProfileEdit();
    initPasswordToggle();
});
