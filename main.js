// Initial Account Balances & Rules State
let state = {
    balances: {
        tithe: 0,
        bills: 0,
        freedom: 0,
        fun: 0,
        educate: 0,
        save: 0
    },
    percentages: {
        tithe: 0.10,
        bills: 0.50,
        freedom: 0.10,
        fun: 0.10,
        educate: 0.10,
        save: 0.10
    },
    history: []
};

const ACCOUNT_LABELS = {
    tithe: 'Tithe',
    bills: 'Bills',
    freedom: 'Freedom Fund',
    fun: 'Fun',
    educate: 'Education',
    save: 'Savings'
};

// A distinct accent color per category, used for account borders and the allocation bar
const ACCOUNT_COLORS = {
    tithe: '#d4af6a',
    bills: '#6ea8d8',
    freedom: '#7fc29b',
    fun: '#d98a8a',
    educate: '#b79bd6',
    save: '#e0c46f'
};

const PCT_KEYS = ['tithe', 'bills', 'freedom', 'fun', 'educate', 'save'];

// Load saved data from localStorage if available
function loadState() {
    const savedState = localStorage.getItem('purposeBudgetState');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        // Merge carefully in case an older saved version is missing newer fields
        state = {
            balances: parsed.balances || state.balances,
            percentages: parsed.percentages || state.percentages,
            history: parsed.history || []
        };
    }

    // Sync sliders + value labels with the loaded percentages
    PCT_KEYS.forEach(key => {
        const slider = document.getElementById(key + 'Pct');
        const value = Math.round(state.percentages[key] * 100);
        slider.value = value;
        document.getElementById(key + 'Value').textContent = value + '%';
    });

    renderAccounts();
    renderHistory();
    updateTotalDisplay();
    updateAllocationBar();
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('purposeBudgetState', JSON.stringify(state));
}

// Render account balances dynamically to the grid
function renderAccounts() {
    const grid = document.getElementById('accountsGrid');
    grid.innerHTML = '';

    for (let key in state.balances) {
        const box = document.createElement('div');
        box.className = 'account-box';
        box.style.borderLeftColor = ACCOUNT_COLORS[key];
        box.innerHTML = `
            <h3>${ACCOUNT_LABELS[key]}</h3>
            <p>$${state.balances[key].toFixed(2)}</p>
        `;
        grid.appendChild(box);
    }
}

// Render the income history list, most recent entry first
function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (state.history.length === 0) {
        list.innerHTML = '<li class="empty-state">No income logged yet.</li>';
        return;
    }

    const entries = [...state.history].reverse();

    entries.forEach(entry => {
        const item = document.createElement('li');
        item.innerHTML = `
            <span class="history-date">${entry.date}</span>
            <span class="history-amount">+$${entry.amount.toFixed(2)}</span>
        `;
        list.appendChild(item);
    });
}

// Read the sliders' current values as decimals (e.g. 10 -> 0.10)
// Sliders are constrained by min/max, so this can never come out NaN or negative,
// unlike the old free-text percentage fields.
function getCurrentSliderPercentages() {
    const values = {};
    PCT_KEYS.forEach(key => {
        const raw = parseFloat(document.getElementById(key + 'Pct').value);
        values[key] = isNaN(raw) ? 0 : raw / 100;
    });
    return values;
}

// Update the live "Total Allocated" readout and flag it if it's off from 100%
function updateTotalDisplay() {
    const values = getCurrentSliderPercentages();
    const total = PCT_KEYS.reduce((sum, key) => sum + values[key], 0);
    const totalPct = Math.round(total * 1000) / 10;

    const display = document.getElementById('totalDisplay');
    display.textContent = totalPct + '%';

    if (Math.abs(total - 1.0) > 0.001) {
        display.classList.add('total-warning');
    } else {
        display.classList.remove('total-warning');
    }
}

// Redraw the small stacked bar that visualizes the current allocation live
function updateAllocationBar() {
    const values = getCurrentSliderPercentages();
    const bar = document.getElementById('allocationBar');
    bar.innerHTML = '';

    PCT_KEYS.forEach(key => {
        const segment = document.createElement('div');
        segment.className = 'allocation-segment';
        segment.style.width = (values[key] * 100) + '%';
        segment.style.backgroundColor = ACCOUNT_COLORS[key];
        bar.appendChild(segment);
    });
}

// Wire up each slider: update its label, the total, and the bar as the user drags
PCT_KEYS.forEach(key => {
    const slider = document.getElementById(key + 'Pct');
    slider.addEventListener('input', () => {
        document.getElementById(key + 'Value').textContent = slider.value + '%';
        updateTotalDisplay();
        updateAllocationBar();
    });
});

// Handle Income Distribution
document.getElementById('splitBtn').addEventListener('click', () => {
    const incomeInput = document.getElementById('incomeInput');
    const income = parseFloat(incomeInput.value);
    const message = document.getElementById('splitMessage');

    if (isNaN(income) || income <= 0) {
        message.textContent = 'Please enter a valid income amount.';
        message.classList.add('error');
        return;
    }

    // Add split amounts to respective balances
    for (let key in state.percentages) {
        state.balances[key] += income * state.percentages[key];
    }

    // Log this deposit to the history list
    state.history.push({
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: income
    });

    saveState();
    renderAccounts();
    renderHistory();

    message.textContent = `$${income.toFixed(2)} distributed across your accounts.`;
    message.classList.remove('error');
    incomeInput.value = '';
});

// Handle Custom Percentage Updates
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    const values = getCurrentSliderPercentages();
    const total = PCT_KEYS.reduce((sum, key) => sum + values[key], 0);
    const message = document.getElementById('rulesMessage');

    if (Math.abs(total - 1.0) > 0.001) {
        message.textContent = `Percentages must add up to 100%. Current total: ${Math.round(total * 100)}%.`;
        message.classList.add('error');
        return;
    }

    state.percentages = values;
    saveState();
    message.textContent = 'Allocation rules updated.';
    message.classList.remove('error');
});

// Handle Reset (clears balances + history, keeps the configured percentage rules)
document.getElementById('resetBtn').addEventListener('click', () => {
    const confirmed = confirm('This clears all account balances and income history. Your percentage rules stay the same. Continue?');
    if (!confirmed) return;

    state.balances = { tithe: 0, bills: 0, freedom: 0, fun: 0, educate: 0, save: 0 };
    state.history = [];

    saveState();
    renderAccounts();
    renderHistory();
});

// Run on page load
window.onload = loadState;
