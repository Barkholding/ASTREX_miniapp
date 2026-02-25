// Robust initialization
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

// State
let userData = null;
let strings = {};
let userId = null;

// ==========================================
// CONFIGURATION: Set your API URL here!
// If you are using Ngrok, put the https URL here.
// Example: const API_BASE = "https://your-ngrok-subdomain.ngrok-free.app";
// ==========================================
const API_BASE = "";

// Views & Elements (will be initialized after DOM load)
let views = {};
let greeting, subGreeting, langBadge;

// Init data
async function init() {
    // Try to get user id from initDataUnsafe
    userId = tg?.initDataUnsafe?.user?.id || 5187224134; // Fallback for dev

    console.log('Initializing for user:', userId);

    try {
        const response = await fetch(`${API_BASE}/api/init/${userId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        userData = data.user;
        strings = data.strings;

        if (langBadge) langBadge.innerText = userData.language?.toUpperCase() || 'RU';

        updateUI();
    } catch (e) {
        console.error('Init error:', e);
        if (tg) tg.showAlert('Failed to connect to server. Please check if your API is running and CORS is enabled.');
    }
}

function updateUI() {
    const name = tg?.initDataUnsafe?.user?.first_name || 'друг';
    if (greeting) {
        greeting.innerText = `${strings.start_greeting?.split('\n')[0].replace('{name}', name) || 'Привет, ' + name + '!'}`;
    }

    // Fill forms
    const bDate = document.getElementById('birth-date');
    const bTime = document.getElementById('birth-time');
    const bRegion = document.getElementById('birth-region');

    if (bDate) bDate.value = userData.birth_date || '';
    if (bTime) bTime.value = userData.birth_time || '';
    if (bRegion) bRegion.value = userData.birth_region || '';
}

function switchView(viewId) {
    console.log('Switching to view:', viewId);
    Object.keys(views).forEach(key => {
        if (views[key]) {
            views[key].classList.remove('active');
            const nav = document.querySelector(`.nav-item[data-view="${key}"]`);
            if (nav) nav.classList.remove('active');
        }
    });

    if (views[viewId]) {
        views[viewId].classList.add('active');
        const nav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
        if (nav) nav.classList.add('active');
    }

    if (viewId === 'tarot') loadTarotStatus();
}

async function loadTarotStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/tarot/status/${userId}`);
        const data = await res.json();

        if (data.pulled) {
            showTarotResult(data);
        } else {
            const tr = document.getElementById('tarot-result');
            const pb = document.getElementById('pull-tarot-btn');
            if (tr) tr.classList.add('hidden');
            if (pb) pb.classList.remove('hidden');
        }
    } catch (e) {
        console.error('Tarot status error:', e);
    }
}

function showTarotResult(data) {
    const lang = userData?.language || 'ru';
    const cardInfo = data.card[lang] || data.card['ru'];

    const tr = document.getElementById('tarot-result');
    const tImg = document.getElementById('tarot-img');
    const tName = document.getElementById('tarot-name');
    const tPos = document.getElementById('tarot-pos');
    const tMean = document.getElementById('tarot-meaning');
    const tExp = document.getElementById('tarot-expand-btn');

    if (tr) tr.classList.remove('hidden');
    if (tImg) tImg.src = `tarot_base/${data.card.image}`;
    if (tName) tName.innerText = cardInfo.name;
    if (tPos) tPos.innerText = data.is_upright ? strings.tarot_pos_upright : strings.tarot_pos_reversed;
    if (tMean) tMean.innerText = data.is_upright ? cardInfo.upright : cardInfo.reversed;

    if (userData?.subscription_expiry && tExp) {
        tExp.classList.remove('hidden');
    }
}

// Start everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Ready, attaching listeners...');

    // Initialize elements
    views = {
        home: document.getElementById('view-home'),
        tarot: document.getElementById('view-tarot'),
        personalization: document.getElementById('view-personalization')
    };
    greeting = document.getElementById('greeting');
    subGreeting = document.getElementById('sub-greeting');
    langBadge = document.getElementById('lang-indicator');

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

    // Home screen cards
    const tCard = document.getElementById('tarot-card');
    if (tCard) {
        tCard.addEventListener('click', () => switchView('tarot'));
    }

    const mCard = document.getElementById('get-message-card');
    if (mCard) {
        mCard.addEventListener('click', () => {
            const msg = strings.btn_get_message + ": " + (strings.about_text?.split('\n')[0] || 'Check the bot for your daily message! ✨');
            if (tg) tg.showAlert(msg);
            else alert(msg);
        });
    }

    // Tarot Pull
    const pullBtn = document.getElementById('pull-tarot-btn');
    if (pullBtn) {
        pullBtn.addEventListener('click', async () => {
            pullBtn.classList.add('hidden');
            const shuffling = document.getElementById('tarot-shuffling');
            if (shuffling) shuffling.classList.remove('hidden');

            try {
                const res = await fetch(`${API_BASE}/api/tarot/pull/${userId}`, { method: 'POST' });
                const data = await res.json();
                setTimeout(() => {
                    if (shuffling) shuffling.classList.add('hidden');
                    showTarotResult(data);
                }, 1500); // Shorter shuffle for snappier feel
            } catch (e) {
                if (tg) tg.showAlert('Error pulling card');
                else console.error('Pull error:', e);
                pullBtn.classList.remove('hidden');
                if (shuffling) shuffling.classList.add('hidden');
            }
        });
    }

    // Personalization Save
    const saveBtn = document.getElementById('save-personalization');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const data = {
                birth_date: document.getElementById('birth-date').value,
                birth_time: document.getElementById('birth-time').value,
                birth_region: document.getElementById('birth-region').value
            };

            const confirmMsg = strings.confirm_save || 'Save data?';
            const saveAction = async (ok) => {
                if (ok) {
                    try {
                        const res = await fetch(`${API_BASE}/api/personalize/${userId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        if (res.ok) {
                            if (tg) tg.showAlert(strings.data_saved || 'Saved!');
                            else alert('Saved!');
                            switchView('home');
                            init(); // Reload
                        }
                    } catch (e) {
                        console.error('Save error:', e);
                    }
                }
            };

            if (tg) tg.showConfirm(confirmMsg, saveAction);
            else if (confirm(confirmMsg)) saveAction(true);
        });
    }

    // Run remote init
    init();
});
