const tg = window.Telegram?.WebApp;

function setupTelegramTheme() {
    if (!tg) return;
    try {
        tg.expand();
        if (tg.requestFullscreen) {
            tg.requestFullscreen();
        }
        tg.ready();
        tg.enableClosingConfirmation();
        // Colors for seamless look - Matching the top of our gradient (#5A2BB7)
        tg.setHeaderColor('#5A2BB7');
        tg.setBackgroundColor('#281351');
    } catch (e) { console.error("TG setup error", e); }
}

function triggerFullscreen() {
    console.log('Attempting fullscreen...');
    if (tg?.requestFullscreen) {
        tg.requestFullscreen();
    } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => {
            console.warn('DOM Fullscreen failed:', e);
        });
    }
}

setupTelegramTheme();

// State
let userData = {
    language: 'ru',
    birth_date: '',
    birth_time: '',
    birth_region: ''
};

let universeMessages = null;

const UI_LOCALIZATIONS = {
    ru: {
        start_greeting: "Привет, {name}! 👋",
        btn_message_label: "Послание Вселенной",
        btn_message_desc: "Узнай, что подготовили звезды",
        btn_tarot_label: "Карта дня",
        btn_tarot_desc: "Мудрость Таро на сегодня",
        shuffling_text: "Прислушиваюсь к энергиям...",
        btn_pull_tarot: "Открыть карту дня",
        tarot_pos_upright: "Прямое положение",
        tarot_pos_reversed: "Перевернутое положение",
        tarot_expand_btn: "Подробное разъяснение 💎",
        personalize_title: "Персонализация",
        label_birth_date: "Дата рождения",
        label_birth_time: "Время рождения",
        label_birth_region: "Место рождения",
        btn_save: "Сохранить данные",
        nav_home: "Главная",
        nav_tarot: "Таро",
        nav_profile: "Профиль",
        data_saved: "Данные сохранены!",
        confirm_save: "Сохранить данные?",
        btn_get_message: "✨ Получить послание",
        universe_title: "Послание Вселенной 🌌"
    },
    en: {
        start_greeting: "Hello, {name}! 👋",
        btn_message_label: "Message from Universe",
        btn_message_desc: "Find out what stars prepared",
        btn_tarot_label: "Card of the Day",
        btn_tarot_desc: "Tarot wisdom for today",
        shuffling_text: "Listening to energies...",
        btn_pull_tarot: "Open card of the day",
        tarot_pos_upright: "Upright",
        tarot_pos_reversed: "Reversed",
        tarot_expand_btn: "Detailed Explanation 💎",
        personalize_title: "Personalization",
        label_birth_date: "Birth Date",
        label_birth_time: "Birth Time",
        label_birth_region: "Birth Place",
        btn_save: "Save Data",
        nav_home: "Home",
        nav_tarot: "Tarot",
        nav_profile: "Profile",
        data_saved: "Data saved!",
        confirm_save: "Save data?",
        btn_get_message: "✨ Get Message",
        universe_title: "Message from Universe 🌌"
    },
    ka: {
        start_greeting: "გამარჯობა, {name}! 👋",
        btn_message_label: "სამყაროს გზავნილი",
        btn_message_desc: "გაიგე რა მოგიმზადეს ვარსკვლავებმა",
        btn_tarot_label: "დღის ბარათი",
        btn_tarot_desc: "ტაროს სიბრძნე დღეისთვის",
        shuffling_text: "ვუსმენთ ენერგიებს...",
        btn_pull_tarot: "გახსენი დღის ბარათი",
        tarot_pos_upright: "პირდაპირი პოზიცია",
        tarot_pos_reversed: "ამობრუნებული პოზიცია",
        tarot_expand_btn: "დეტალური განმარტება 💎",
        personalize_title: "პერსონალიზაცია",
        label_birth_date: "დაბადების თარიღი",
        label_birth_time: "დაბადების დრო",
        label_birth_region: "დაბადების ადგილი",
        btn_save: "მონაცემების შენახვა",
        nav_home: "მთავარი",
        nav_tarot: "ტარო",
        nav_profile: "პროფილი",
        data_saved: "მონაცემები შენახულია!",
        confirm_save: "გნებავთ მონაცემების შენახვა?",
        btn_get_message: "✨ მიიღე შეტყობინება",
        universe_title: "სამყაროს გზავნილი 🌌"
    }
};

let strings = UI_LOCALIZATIONS['ru'];
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

    // Initial language detection from Telegram
    if (!localStorage.getItem(`astre_user_${userId}`) && tg?.initDataUnsafe?.user?.language_code) {
        const tgLang = tg.initDataUnsafe.user.language_code;
        if (['ru', 'en', 'ka'].includes(tgLang)) {
            userData.language = tgLang;
        }
    }

    // Load from LocalStorage as immediate fallback
    const localData = localStorage.getItem(`astre_user_${userId}`);
    if (localData) {
        try {
            userData = { ...userData, ...JSON.parse(localData) };
            updateUI();
        } catch (e) { console.warn("LS parse error", e); }
    }

    // Load messages list
    try {
        const msgRes = await fetch('messages.json');
        universeMessages = await msgRes.json();
    } catch (e) { console.warn("Could not load universe messages", e); }

    try {
        const response = await fetch(`${API_BASE}/api/init/${userId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (data.user) {
            userData = { ...userData, ...data.user };
            localStorage.setItem(`astre_user_${userId}`, JSON.stringify(userData));
        }
        if (data.strings) strings = data.strings;

        updateUI();
    } catch (e) {
        console.warn('Init API error (using local fallbacks):', e);
        if (tg) tg.expand();
        updateUI();
    }
}

function updateUI() {
    const lang = userData?.language || 'ru';
    strings = UI_LOCALIZATIONS[lang] || UI_LOCALIZATIONS['ru'];

    const name = tg?.initDataUnsafe?.user?.first_name || 'друг';

    if (greeting) {
        const template = strings.start_greeting || (lang === 'en' ? "Hello, {name}! 👋" : "Привет, {name}! 👋");
        greeting.innerText = template.replace('{name}', name);
    }
    if (langBadge) langBadge.innerText = lang.toUpperCase();

    const elements = {
        'sub-greeting': strings.btn_message_desc,
        'btn-message-label': strings.btn_message_label,
        'btn-message-desc': strings.btn_message_desc,
        'btn-tarot-label': strings.btn_tarot_label,
        'btn-tarot-desc': strings.btn_tarot_desc,
        'personalize-title': strings.personalize_title,
        'save-personalization': strings.btn_save,
        'pull-tarot-btn': strings.btn_pull_tarot,
        'tarot-expand-btn': strings.tarot_expand_btn
    };

    for (const [id, text] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }

    // Bottom Nav check
    const navItems = document.querySelectorAll('.nav-item .label');
    if (navItems.length >= 3) {
        navItems[0].innerText = strings.nav_home;
        navItems[1].innerText = strings.nav_tarot;
        navItems[2].innerText = strings.nav_profile;
    }

    const bDate = document.getElementById('birth-date');
    const bTime = document.getElementById('birth-time');
    const bRegion = document.getElementById('birth-region');

    if (bDate) bDate.value = userData?.birth_date || '';
    if (bTime) bTime.value = userData?.birth_time || '';
    if (bRegion) bRegion.value = userData?.birth_region || '';
}

function switchView(viewId) {
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
        return null;
    }
}

// Logic for Universe Message
function showUniverseMessage() {
    const lang = userData.language || 'ru';
    if (!universeMessages) {
        const fallback = (lang === 'en' ? "Stars are hidden by clouds. Try later." : "Звезды скрыты облаками. Попробуйте позже.");
        if (tg) tg.showAlert(fallback); else alert(fallback);
        return;
    }

    const isPremium = !!userData.subscription_expiry;
    const pool = isPremium ? [...universeMessages.free[lang], ...universeMessages.premium[lang]] : universeMessages.free[lang];
    const message = pool[Math.floor(Math.random() * pool.length)];

    if (tg) {
        tg.showPopup({
            title: strings.universe_title,
            message: message,
            buttons: [{ type: 'ok' }]
        });
    } else {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    views = {
        home: document.getElementById('view-home'),
        tarot: document.getElementById('view-tarot'),
        personalization: document.getElementById('view-personalization')
    };
    greeting = document.getElementById('greeting');
    langBadge = document.getElementById('lang-indicator');

    if (langBadge) {
        langBadge.addEventListener('click', (e) => {
            e.preventDefault();
            const langs = ['ru', 'en', 'ka'];
            let currentLang = userData.language || 'ru';
            let currentIdx = langs.indexOf(currentLang);
            if (currentIdx === -1) currentIdx = 0;

            const nextLang = langs[(currentIdx + 1) % langs.length];
            userData.language = nextLang;

            updateUI();
            localStorage.setItem(`astre_user_${userId}`, JSON.stringify(userData));

            fetch(`${API_BASE}/api/personalize/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: nextLang })
            });
        });
    }

    const handleFirstTouch = () => {
        triggerFullscreen();
        document.removeEventListener('touchstart', handleFirstTouch);
        document.removeEventListener('click', handleFirstTouch);
    };
    document.addEventListener('touchstart', handleFirstTouch);
    document.addEventListener('click', handleFirstTouch);

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.getAttribute('data-view')));
    });

    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView('home'));
    });

    const tCard = document.getElementById('tarot-card');
    if (tCard) tCard.addEventListener('click', () => switchView('tarot'));

    const mCard = document.getElementById('get-message-card');
    if (mCard) {
        mCard.addEventListener('click', (e) => {
            e.stopPropagation();
            showUniverseMessage();
        });
    }

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
            } catch (e) { }

            if (!data) data = await tryDemoPull();

            setTimeout(() => {
                if (shuffling) shuffling.classList.add('hidden');
                if (data) showTarotResult(data);
                else {
                    tg?.showAlert('Demo card pool unavailable.');
                    pullBtn.classList.remove('hidden');
                }
            }, 1500);
        });
    }

    const saveBtn = document.getElementById('save-personalization');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const data = {
                birth_date: document.getElementById('birth-date').value,
                birth_time: document.getElementById('birth-time').value,
                birth_region: document.getElementById('birth-region').value
            };

            const confirmMsg = strings.confirm_save;
            const saveAction = async (ok) => {
                if (ok) {
                    try {
                        const res = await fetch(`${API_BASE}/api/personalize/${userId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...data, language: userData.language })
                        });

                        userData = { ...userData, ...data };
                        localStorage.setItem(`astre_user_${userId}`, JSON.stringify(userData));

                        if (tg) tg.showAlert(strings.data_saved); else alert(strings.data_saved);
                        switchView('home');
                    } catch (e) {
                        userData = { ...userData, ...data };
                        localStorage.setItem(`astre_user_${userId}`, JSON.stringify(userData));
                        if (tg) tg.showAlert(strings.data_saved); else alert(strings.data_saved);
                        switchView('home');
                    }
                }
            };

            if (tg) tg.showConfirm(confirmMsg, saveAction);
            else if (confirm(confirmMsg)) saveAction(true);
        });
    }

    init();
});
