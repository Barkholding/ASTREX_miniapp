const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// State
let userData = null;
let strings = {};
let userId = null;

// Views
const views = {
    home: document.getElementById('view-home'),
    tarot: document.getElementById('view-tarot'),
    personalization: document.getElementById('view-personalization')
};

// Elements
const greeting = document.getElementById('greeting');
const subGreeting = document.getElementById('sub-greeting');
const langBadge = document.getElementById('lang-indicator');

// Init data
async function init() {
    // Try to get user id from initDataUnsafe
    userId = tg.initDataUnsafe?.user?.id || 5187224134; // Fallback for dev

    try {
        const response = await fetch(`/api/init/${userId}`);
        const data = await response.json();

        userData = data.user;
        strings = data.strings;
        langBadge.innerText = userData.language?.toUpperCase() || 'RU';

        updateUI();
    } catch (e) {
        console.error('Init error:', e);
    }
}

function updateUI() {
    const name = tg.initDataUnsafe?.user?.first_name || 'друг';
    greeting.innerText = `${strings.start_greeting?.split('\n')[0].replace('{name}', name) || 'Привет, ' + name + '!'}`;

    // Fill forms
    document.getElementById('birth-date').value = userData.birth_date || '';
    document.getElementById('birth-time').value = userData.birth_time || '';
    document.getElementById('birth-region').value = userData.birth_region || '';
}

// Navigation
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const viewId = btn.getAttribute('data-view');
        switchView(viewId);
    });
});

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView('home'));
});

function switchView(viewId) {
    Object.keys(views).forEach(key => {
        views[key].classList.remove('active');
        document.querySelector(`.nav-item[data-view="${key}"]`).classList.remove('active');
    });
    views[viewId].classList.add('active');
    document.querySelector(`.nav-item[data-view="${viewId}"]`).classList.add('active');

    if (viewId === 'tarot') loadTarotStatus();
}

// Tarot logic
async function loadTarotStatus() {
    const res = await fetch(`/api/tarot/status/${userId}`);
    const data = await res.json();

    if (data.pulled) {
        showTarotResult(data);
    } else {
        document.getElementById('tarot-result').classList.add('hidden');
        document.getElementById('pull-tarot-btn').classList.remove('hidden');
    }
}

document.getElementById('pull-tarot-btn').addEventListener('click', async () => {
    document.getElementById('pull-tarot-btn').classList.add('hidden');
    document.getElementById('tarot-shuffling').classList.remove('hidden');

    try {
        const res = await fetch(`/api/tarot/pull/${userId}`, { method: 'POST' });
        const data = await res.json();
        setTimeout(() => {
            document.getElementById('tarot-shuffling').classList.add('hidden');
            showTarotResult(data);
        }, 3000);
    } catch (e) {
        tg.showAlert('Error pulling card');
    }
});

function showTarotResult(data) {
    const lang = userData.language || 'ru';
    const cardInfo = data.card[lang] || data.card['ru'];

    document.getElementById('tarot-result').classList.remove('hidden');
    document.getElementById('tarot-img').src = `tarot_base/${data.card.image}`;
    document.getElementById('tarot-name').innerText = cardInfo.name;
    document.getElementById('tarot-pos').innerText = data.is_upright ? strings.tarot_pos_upright : strings.tarot_pos_reversed;
    document.getElementById('tarot-meaning').innerText = data.is_upright ? cardInfo.upright : cardInfo.reversed;

    if (userData.subscription_expiry) {
        document.getElementById('tarot-expand-btn').classList.remove('hidden');
    }
}

// Personalization
document.getElementById('save-personalization').addEventListener('click', async () => {
    const data = {
        birth_date: document.getElementById('birth-date').value,
        birth_time: document.getElementById('birth-time').value,
        birth_region: document.getElementById('birth-region').value
    };

    tg.showConfirm(strings.data_saved || 'Save data?', async (ok) => {
        if (ok) {
            await fetch(`/api/personalize/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            tg.showAlert(strings.data_saved);
            switchView('home');
            init(); // Reload
        }
    });
});

// Start
init();
