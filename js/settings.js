let _editAccountModal, _editIncomeModal, _editCategoryModal, _resetModal;

document.addEventListener('DOMContentLoaded', () => {
    _editAccountModal  = new bootstrap.Modal(document.getElementById('editAccountModal'));
    _editIncomeModal   = new bootstrap.Modal(document.getElementById('editIncomeModal'));
    _editCategoryModal = new bootstrap.Modal(document.getElementById('editCategoryModal'));
    _resetModal        = new bootstrap.Modal(document.getElementById('resetModal'));

    _setupAccountSection();
    _setupIncomeSection();
    _setupCategorySection();
    _setupDataManagement();

    render();
});

function render() {
    const data = getData();
    _renderAccounts(data);
    _renderIncomeSources(data);
    _renderCategories(data);
}

// ── Accounts ────────────────────────────────────────────────────────────────

function _renderAccounts(data) {
    const el = document.getElementById('accounts-list');
    if (data.accounts.length === 0) {
        el.innerHTML = '<p class="text-muted small mb-0">No accounts yet.</p>';
        return;
    }
    el.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
                <thead class="table-light">
                    <tr><th>Name</th><th>Balance</th><th></th></tr>
                </thead>
                <tbody>
                    ${data.accounts.map(a => `
                        <tr>
                            <td class="fw-semibold">${escapeHtml(a.name)}</td>
                            <td>${formatEUR(a.balance || 0)}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-secondary me-1" onclick="openEditAccount('${a.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteAccount('${a.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

function _setupAccountSection() {
    document.getElementById('add-account-form').addEventListener('submit', e => {
        e.preventDefault();
        const name    = document.getElementById('new-account-name').value.trim();
        const balance = parseFloat(document.getElementById('new-account-balance').value) || 0;
        if (!name) return;
        const data = getData();
        data.accounts.push({ id: generateId(), name, balance });
        saveData(data);
        document.getElementById('new-account-name').value    = '';
        document.getElementById('new-account-balance').value = '0';
        render();
    });

    document.getElementById('save-account-btn').addEventListener('click', () => {
        const id      = document.getElementById('edit-account-id').value;
        const name    = document.getElementById('edit-account-name').value.trim();
        const balance = parseFloat(document.getElementById('edit-account-balance').value) || 0;
        if (!name) return;
        const data = getData();
        const acc  = data.accounts.find(a => a.id === id);
        if (acc) { acc.name = name; acc.balance = balance; saveData(data); }
        _editAccountModal.hide();
        render();
    });
}

function openEditAccount(id) {
    const data = getData();
    const acc  = data.accounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('edit-account-id').value      = id;
    document.getElementById('edit-account-name').value    = acc.name;
    document.getElementById('edit-account-balance').value = acc.balance || 0;
    _editAccountModal.show();
}

function deleteAccount(id) {
    if (!confirm('Delete this account? Transactions linked to it will lose their account reference.')) return;
    const data = getData();
    data.accounts = data.accounts.filter(a => a.id !== id);
    saveData(data);
    render();
}

// ── Income Sources ───────────────────────────────────────────────────────────

function _renderIncomeSources(data) {
    const el = document.getElementById('income-sources-list');
    if (data.incomeSources.length === 0) {
        el.innerHTML = '<p class="text-muted small mb-0">No income sources yet.</p>';
        return;
    }
    el.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
                <thead class="table-light">
                    <tr><th>Name</th><th>Expected / month</th><th>Active</th><th></th></tr>
                </thead>
                <tbody>
                    ${data.incomeSources.map(s => `
                        <tr>
                            <td class="fw-semibold">${escapeHtml(s.name)}</td>
                            <td>${formatEUR(s.expectedAmount || 0)}</td>
                            <td>
                                <div class="form-check form-switch mb-0">
                                    <input class="form-check-input" type="checkbox" role="switch"
                                        ${s.active ? 'checked' : ''}
                                        onchange="toggleIncomeSource('${s.id}', this.checked)">
                                </div>
                            </td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-secondary me-1" onclick="openEditIncome('${s.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteIncomeSource('${s.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

function _setupIncomeSection() {
    document.getElementById('add-income-form').addEventListener('submit', e => {
        e.preventDefault();
        const name   = document.getElementById('new-income-name').value.trim();
        const amount = parseFloat(document.getElementById('new-income-amount').value) || 0;
        if (!name) return;
        const data = getData();
        data.incomeSources.push({ id: generateId(), name, expectedAmount: amount, active: true });
        saveData(data);
        document.getElementById('new-income-name').value   = '';
        document.getElementById('new-income-amount').value = '';
        render();
    });

    document.getElementById('save-income-btn').addEventListener('click', () => {
        const id     = document.getElementById('edit-income-id').value;
        const name   = document.getElementById('edit-income-name').value.trim();
        const amount = parseFloat(document.getElementById('edit-income-amount').value) || 0;
        if (!name) return;
        const data = getData();
        const src  = data.incomeSources.find(s => s.id === id);
        if (src) { src.name = name; src.expectedAmount = amount; saveData(data); }
        _editIncomeModal.hide();
        render();
    });
}

function openEditIncome(id) {
    const data = getData();
    const src  = data.incomeSources.find(s => s.id === id);
    if (!src) return;
    document.getElementById('edit-income-id').value     = id;
    document.getElementById('edit-income-name').value   = src.name;
    document.getElementById('edit-income-amount').value = src.expectedAmount || 0;
    _editIncomeModal.show();
}

function toggleIncomeSource(id, active) {
    const data = getData();
    const src  = data.incomeSources.find(s => s.id === id);
    if (src) { src.active = active; saveData(data); }
}

function deleteIncomeSource(id) {
    if (!confirm('Delete this income source?')) return;
    const data = getData();
    data.incomeSources = data.incomeSources.filter(s => s.id !== id);
    saveData(data);
    render();
}

// ── Categories ───────────────────────────────────────────────────────────────

function _renderCategories(data) {
    const el = document.getElementById('categories-list');
    if (data.categories.length === 0) {
        el.innerHTML = '<p class="text-muted small mb-0">No categories yet.</p>';
        return;
    }
    el.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
                <thead class="table-light">
                    <tr><th>Color</th><th>Name</th><th></th></tr>
                </thead>
                <tbody>
                    ${data.categories.map(c => {
                        const usedCount = data.transactions.filter(t => t.categoryId === c.id).length;
                        return `
                        <tr>
                            <td><span class="color-swatch" style="background:${c.color}"></span></td>
                            <td class="fw-semibold">${escapeHtml(c.name)}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-secondary me-1" onclick="openEditCategory('${c.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory('${c.id}')"
                                    ${usedCount > 0 ? `disabled title="Used by ${usedCount} transaction(s) — remove those first"` : ''}>
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

function _setupCategorySection() {
    document.getElementById('add-category-form').addEventListener('submit', e => {
        e.preventDefault();
        const name  = document.getElementById('new-category-name').value.trim();
        const color = document.getElementById('new-category-color').value;
        if (!name) return;
        const data = getData();
        data.categories.push({ id: generateId(), name, color });
        saveData(data);
        document.getElementById('new-category-name').value = '';
        render();
    });

    document.getElementById('save-category-btn').addEventListener('click', () => {
        const id    = document.getElementById('edit-category-id').value;
        const name  = document.getElementById('edit-category-name').value.trim();
        const color = document.getElementById('edit-category-color').value;
        if (!name) return;
        const data = getData();
        const cat  = data.categories.find(c => c.id === id);
        if (cat) { cat.name = name; cat.color = color; saveData(data); }
        _editCategoryModal.hide();
        render();
    });
}

function openEditCategory(id) {
    const data = getData();
    const cat  = data.categories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('edit-category-id').value    = id;
    document.getElementById('edit-category-name').value  = cat.name;
    document.getElementById('edit-category-color').value = cat.color;
    _editCategoryModal.show();
}

function deleteCategory(id) {
    const data      = getData();
    const usedCount = data.transactions.filter(t => t.categoryId === id).length;
    if (usedCount > 0) {
        alert(`Cannot delete: this category is used by ${usedCount} transaction(s). Remove or reassign those transactions first.`);
        return;
    }
    if (!confirm('Delete this category?')) return;
    data.categories = data.categories.filter(c => c.id !== id);
    saveData(data);
    render();
}

// ── Data Management ──────────────────────────────────────────────────────────

function _setupDataManagement() {
    document.getElementById('export-all-btn').addEventListener('click', () => {
        exportJSON(getData(), `finance-backup-${today()}.json`);
    });

    document.getElementById('import-btn').addEventListener('click', () => {
        importJSON((err, data) => {
            if (err) { alert('Import failed: ' + err.message); return; }
            if (!confirm('This will replace ALL current data with the imported file. Continue?')) return;
            saveData(data);
            location.reload();
        });
    });

    document.getElementById('reset-btn').addEventListener('click', () => _resetModal.show());

    document.getElementById('confirm-reset-btn').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        _resetModal.hide();
        location.reload();
    });
}
