let _editBalanceModal;

document.addEventListener('DOMContentLoaded', () => {
    _editBalanceModal = new bootstrap.Modal(document.getElementById('editBalanceModal'));
    document.getElementById('save-balance-btn').addEventListener('click', _saveBalance);
    render();
});

function render() {
    const data          = getData();
    const { year, month } = currentYearMonth();

    document.getElementById('current-month-label').textContent = formatMonth(year, month);
    document.getElementById('view-month-link').href =
        `transactions.html?month=${monthToParam(year, month)}`;

    _renderPatrimonio(data);
    _renderAccounts(data);
    _renderMonthSummary(data, year, month);
    _renderCategoryBreakdown(data, year, month);
    _renderRecentTransactions(data);
}

function _renderPatrimonio(data) {
    const total = data.accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const el    = document.getElementById('total-patrimonio');
    el.textContent = formatEUR(total);
    el.className   = `patrimonio-value ${total >= 0 ? 'text-success' : 'text-danger'}`;
}

function _renderAccounts(data) {
    const row = document.getElementById('accounts-row');
    if (data.accounts.length === 0) {
        row.innerHTML = `
            <div class="col-12">
                <p class="text-muted">No accounts yet. <a href="settings.html">Add one in Settings.</a></p>
            </div>`;
        return;
    }
    row.innerHTML = data.accounts.map(acc => `
        <div class="col-md-4 col-sm-6 mb-3">
            <div class="card h-100">
                <div class="card-body d-flex flex-column">
                    <div class="text-muted small text-uppercase fw-semibold mb-1">${escapeHtml(acc.name)}</div>
                    <div class="fs-4 fw-bold mb-3 ${(acc.balance || 0) < 0 ? 'text-danger' : ''}">${formatEUR(acc.balance || 0)}</div>
                    <button class="btn btn-sm btn-outline-secondary mt-auto" onclick="openEditBalance('${acc.id}')">
                        <i class="bi bi-pencil me-1"></i>Edit balance
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function _renderMonthSummary(data, year, month) {
    const txs      = _monthTransactions(data, year, month);
    const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net      = income - expenses;

    document.getElementById('month-income').textContent   = formatEUR(income);
    document.getElementById('month-expenses').textContent = formatEUR(expenses);
    const netEl = document.getElementById('month-net');
    netEl.textContent = formatEUR(net);
    netEl.className   = `fs-5 fw-bold ${net >= 0 ? 'text-success' : 'text-danger'}`;
}

function _renderCategoryBreakdown(data, year, month) {
    const expenses  = _monthTransactions(data, year, month).filter(t => t.type === 'expense');
    const container = document.getElementById('category-breakdown');

    if (expenses.length === 0) {
        container.innerHTML = '<p class="text-muted mb-0">No expenses this month.</p>';
        return;
    }

    const total      = expenses.reduce((s, t) => s + t.amount, 0);
    const byCategory = {};

    expenses.forEach(t => {
        const cat = t.categoryId ? data.categories.find(c => c.id === t.categoryId) : null;
        const key = t.categoryId || '__none__';
        if (!byCategory[key]) {
            byCategory[key] = {
                name:  cat ? cat.name  : 'Uncategorized',
                color: cat ? cat.color : '#95a5a6',
                total: 0
            };
        }
        byCategory[key].total += t.amount;
    });

    const sorted = Object.values(byCategory).sort((a, b) => b.total - a.total);

    container.innerHTML = sorted.map(cat => {
        const pct = total > 0 ? (cat.total / total * 100).toFixed(1) : 0;
        return `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="d-flex align-items-center gap-2">
                        <span class="color-swatch" style="background:${cat.color}"></span>
                        ${escapeHtml(cat.name)}
                    </span>
                    <span class="fw-semibold">${formatEUR(cat.total)}</span>
                </div>
                <div class="progress" style="height:6px">
                    <div class="progress-bar" role="progressbar"
                        style="width:${pct}%;background-color:${cat.color}"
                        aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
                    </div>
                </div>
            </div>`;
    }).join('');
}

function _renderRecentTransactions(data) {
    const container = document.getElementById('recent-transactions');
    const sorted    = [...data.transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10);

    if (sorted.length === 0) {
        container.innerHTML = '<p class="text-muted p-3 mb-0">No transactions yet.</p>';
        return;
    }

    container.innerHTML = `<ul class="list-group list-group-flush">
        ${sorted.map(t => {
            const cat      = t.categoryId ? data.categories.find(c => c.id === t.categoryId) : null;
            const acc      = data.accounts.find(a => a.id === t.accountId);
            const catBadge = cat
                ? `<span class="badge-category ms-1" style="background:${cat.color}">${escapeHtml(cat.name)}</span>`
                : '';
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-semibold">${escapeHtml(t.description)}</div>
                        <small class="text-muted">
                            ${t.date}${acc ? ` · ${escapeHtml(acc.name)}` : ''}${catBadge}
                        </small>
                    </div>
                    <span class="${t.type === 'income' ? 'transaction-amount-income' : 'transaction-amount-expense'}">
                        ${t.type === 'income' ? '+' : '−'}${formatEUR(t.amount)}
                    </span>
                </li>`;
        }).join('')}
    </ul>`;
}

function _monthTransactions(data, year, month) {
    return data.transactions.filter(t => {
        const d = txDateYearMonth(t.date);
        return d.year === year && d.month === month;
    });
}

function openEditBalance(accountId) {
    const data = getData();
    const acc  = data.accounts.find(a => a.id === accountId);
    if (!acc) return;
    document.getElementById('balance-account-id').value = accountId;
    document.getElementById('balance-input').value      = acc.balance || 0;
    document.getElementById('edit-balance-name').textContent = acc.name;
    _editBalanceModal.show();
}

function _saveBalance() {
    const id    = document.getElementById('balance-account-id').value;
    const value = parseFloat(document.getElementById('balance-input').value);
    if (isNaN(value)) return;
    const data = getData();
    const acc  = data.accounts.find(a => a.id === id);
    if (acc) {
        acc.balance = value;
        saveData(data);
        _editBalanceModal.hide();
        render();
    }
}
