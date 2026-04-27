const STORAGE_KEY = 'finance_data';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return _seedDefaultData();
    try {
        return JSON.parse(raw);
    } catch {
        return _seedDefaultData();
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function _seedDefaultData() {
    const data = {
        accounts: [],
        incomeSources: [],
        categories: [
            { id: generateId(), name: 'Food', color: '#e74c3c' },
            { id: generateId(), name: 'Transport', color: '#3498db' },
            { id: generateId(), name: 'Housing', color: '#2ecc71' },
            { id: generateId(), name: 'Health', color: '#9b59b6' },
            { id: generateId(), name: 'Leisure', color: '#f39c12' },
            { id: generateId(), name: 'Other', color: '#95a5a6' },
        ],
        transactions: []
    };
    saveData(data);
    return data;
}

function exportJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importJSON(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                callback(null, JSON.parse(ev.target.result));
            } catch {
                callback(new Error('Invalid JSON file'));
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
