// Robust initialization
const tg = window.Telegram?.WebApp;
if (tg) {
    try {
        tg.expand();
        tg.ready();
    } catch (e) { console.error("TG init error", e); }
}

// State
let userData = {
    language: 'ru',
    birth_date: '',
    birth_time: '',
    birth_region: ''
};
let strings = {
    start_greeting: "Привет, {name}! 👋",
    btn_get_message: "✨ Получить послание",
    tarot_pos_upright: "Прямое положение",
    tarot_pos_reversed: "Перевернутое положение",
    data_saved: "Данные сохранены!",
    shuffling_text: "Прислушиваюсь к энергиям..."
};
let userId = null;

// ==========================================
// CONFIGURATION: Set your API URL here!
// ==========================================
const API_BASE = "";

// Views & Elements
let views = {};
let greeting, langBadge;

// Init data
async function init() {
    userId = tg?.initDataUnsafe?.user?.id || 5187224134;
    console.log('Initializing for user:', userId);

    try {
        const response = await fetch(`${API_BASE}/api/init/${userId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (data.user) userData = data.user;
        if (data.strings) strings = data.strings;

        if (langBadge) langBadge.innerText = userData.language?.toUpperCase() || 'RU';
        updateUI();
    } catch (e) {
        console.warn('Init error (using local fallbacks):', e);
        updateUI();
    }
}

function updateUI() {
    const name = tg?.initDataUnsafe?.user?.first_name || 'друг';
    if (greeting) {
        greeting.innerText = (strings.start_greeting || "Привет!").replace('{name}', name);
    }

    const bDate = document.getElementById('birth-date');
    const bTime = document.getElementById('birth-time');
    const bRegion = document.getElementById('birth-region');

    if (bDate) bDate.value = userData?.birth_date || '';
    if (bTime) bTime.value = userData?.birth_time || '';
    if (bRegion) bRegion.value = userData?.birth_region || '';
}

function switchView(viewId) {
    console.log('Switching view:', viewId);
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
            resetTarotView();
        }
    } catch (e) {
        console.warn('Tarot status: API offline, enabling Demo Mode for pulls.');
        resetTarotView();
    }
}

function resetTarotView() {
    const tr = document.getElementById('tarot-result');
    const pb = document.getElementById('pull-tarot-btn');
    if (tr) tr.classList.add('hidden');
    if (pb) pb.classList.remove('hidden');
}

function showTarotResult(data) {
    if (!data || !data.card) return;
    const lang = userData?.language || 'ru';
    const cardInfo = data.card[lang] || data.card['ru'] || data.card;

    const tr = document.getElementById('tarot-result');
    const tImg = document.getElementById('tarot-img');
    const tName = document.getElementById('tarot-name');
    const tPos = document.getElementById('tarot-pos');
    const tMean = document.getElementById('tarot-meaning');
    const tExp = document.getElementById('tarot-expand-btn');

    if (tr) tr.classList.remove('hidden');
    if (tImg) tImg.src = `tarot_base/${data.card.image}`;
    if (tName) tName.innerText = cardInfo.name || 'Карта';
    if (tPos) tPos.innerText = data.is_upright ? strings.tarot_pos_upright : strings.tarot_pos_reversed;
    if (tMean) tMean.innerText = data.is_upright ? cardInfo.upright : cardInfo.reversed;

    if (userData?.subscription_expiry && tExp) {
        tExp.classList.remove('hidden');
    }
}

async function tryDemoPull() {
    try {
        const response = await fetch('tarot_data.json');
        const tarotData = await response.json();
        const keys = Object.keys(tarotData);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const card = tarotData[randomKey];

        return {
            card: card,
            is_upright: Math.random() > 0.3 // 70% chance of being upright
        };
    } catch (e) {
        console.error('Demo Mode failed:', e);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Astrex App Loaded');

    views = {
        home: document.getElementById('view-home'),
        tarot: document.getElementById('view-tarot'),
        personalization: document.getElementById('view-personalization')
    };
    greeting = document.getElementById('greeting');
    langBadge = document.getElementById('lang-indicator');

    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.getAttribute('data-view')));
    });

    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView('home'));
    });

    // Home screen cards
    const tCard = document.getElementById('tarot-card');
    if (tCard) tCard.addEventListener('click', () => switchView('tarot'));

    const mCard = document.getElementById('get-message-card');
    if (mCard) {
        mCard.addEventListener('click', () => {
            const msg = (strings.btn_get_message || "✨") + (strings.about_text ? ": " + strings.about_text.split('\n')[0] : " ✨");
            if (tg) tg.showAlert(msg); else alert(msg);
        });
    }

    // Tarot Pull
    const pullBtn = document.getElementById('pull-tarot-btn');
    if (pullBtn) {
        pullBtn.addEventListener('click', async () => {
            pullBtn.classList.add('hidden');
            const shuffling = document.getElementById('tarot-shuffling');
            if (shuffling) shuffling.classList.remove('hidden');

            let data = null;
            try {
                const res = await fetch(`${API_BASE}/api/tarot/pull/${userId}`, { method: 'POST' });
                if (res.ok) data = await res.json();
            } catch (e) {
                console.warn('API pull failed, switching to Demo Mode...');
            }

            if (!data) {
                data = await tryDemoPull();
            }

            setTimeout(() => {
                if (shuffling) shuffling.classList.add('hidden');
                if (data) {
                    showTarotResult(data);
                } else {
                    tg?.showAlert('Demo card pool unavailable. Please check your internet.');
                    pullBtn.classList.remove('hidden');
                }
            }, 1500);
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

            const confirmMsg = "Сохранить данные?";
            const saveAction = async (ok) => {
                if (ok) {
                    try {
                        const res = await fetch(`${API_BASE}/api/personalize/${userId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        if (res.ok) {
                            if (tg) tg.showAlert('Сохранено (в API)!'); else alert('Сохранено!');
                            switchView('home');
                            init(); // Reload
                        } else {
                            throw new Error("Save failed");
                        }
                    } catch (e) {
                        // Just pretend we saved it in demo mode
                        if (tg) tg.showAlert('Сохранено (режим демо)!');
                        else alert('Сохранено!');
                        switchView('home');
                        init(); // Reload
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
