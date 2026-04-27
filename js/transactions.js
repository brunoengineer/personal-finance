let _currentYear, _currentMonth;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const { year, month } = parseMonthParam(params.get('month'));
    _currentYear  = year;
    _currentMonth = month;

    _setupNavigation();
    _setupForm();
    _setupExport();

    render();
});

function render() {
    document.getElementById('month-label').textContent = formatMonth(_currentYear, _currentMonth);
    _updateUrlParam();

    const data = getData();
    _renderSummary(data);
    _renderTransactionList(data);
}

function _updateUrlParam() {
    const url = new URL(window.location);
    url.searchParams.set('month', monthToParam(_currentYear, _currentMonth));
    window.history.replaceState({}, '', url);
}

function _setupNavigation() {
    document.getElementById('prev-month').addEventListener('click', () => {
        const p = prevMonth(_currentYear, _currentMonth);
        _currentYear  = p.year;
        _currentMonth = p.month;
        render();
    });
    document.getElementById('next-month').addEventListener('click', () => {
        const n = nextMonth(_currentYear, _currentMonth);
        _currentYear  = n.year;
        _currentMonth = n.month;
        render();
    });
}

function _setupForm() {
    const data        = getData();
    const accountSel  = document.getElementById('tx-account');
    const categorySel = document.getElementById('tx-category');
    const typeSelect  = document.getElementById('tx-type');
    const catField    = document.getElementById('category-field');

    document.getElementById('tx-date').value = today();

    if (data.accounts.length === 0) {
        document.getElementById('no-accounts-warning').classList.remove('d-none');
        document.getElementById('add-tx-btn').disabled = true;
    }

    accountSel.innerHTML  = data.accounts.map(a =>
        `<option value="${a.id}">${escapeHtml(a.name)}</option>`
    ).join('');

    categorySel.innerHTML = data.categories.map(c =>
        `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join('');

    typeSelect.addEventListener('change', () => {
        catField.style.display = typeSelect.value === 'expense' ? '' : 'none';
    });

    document.getElementById('add-tx-form').addEventListener('submit', e => {
        e.preventDefault();
        _addTransaction();
    });
}

function _addTransaction() {
    const date        = document.getElementById('tx-date').value;
    const amount      = parseFloat(document.getElementById('tx-amount').value);
    const accountId   = document.getElementById('tx-account').value;
    const type        = document.getElementById('tx-type').value;
    const description = document.getElementById('tx-description').value.trim();
    const categoryId  = type === 'expense' ? (document.getElementById('tx-category').value || null) : null;

    if (!date || isNaN(amount) || amount <= 0 || !description || !accountId) return;

    const data = getData();
    data.transactions.push({ id: generateId(), date, description, amount, type, categoryId, accountId });
    saveData(data);

    document.getElementById('tx-amount').value      = '';
    document.getElementById('tx-description').value = '';

    render();
}

function _renderSummary(data) {
    const txs      = _monthTransactions(data);
    const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net      = income - expenses;

    document.getElementById('month-income').textContent   = formatEUR(income);
    document.getElementById('month-expenses').textContent = formatEUR(expenses);
    const netEl = document.getElementById('month-net');
    netEl.textContent = formatEUR(net);
    netEl.className   = `fs-5 fw-bold ${net >= 0 ? 'text-success' : 'text-danger'}`;
}

function _renderTransactionList(data) {
    const txs       = _monthTransactions(data).sort((a, b) => b.date.localeCompare(a.date));
    const container = document.getElementById('transaction-list');

    if (txs.length === 0) {
        container.innerHTML = '<p class="text-muted p-3 mb-0">No transactions for this month.</p>';
        return;
    }

    container.innerHTML = `<ul class="list-group list-group-flush">
        ${txs.map(t => {
            const cat      = t.categoryId ? data.categories.find(c => c.id === t.categoryId) : null;
            const acc      = data.accounts.find(a => a.id === t.accountId);
            const catBadge = cat
                ? `<span class="badge-category ms-1" style="background:${cat.color}">${escapeHtml(cat.name)}</span>`
                : '';
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div class="me-3">
                        <div class="fw-semibold">${escapeHtml(t.description)}</div>
                        <small class="text-muted">
                            ${t.date}${acc ? ` · ${escapeHtml(acc.name)}` : ''}${catBadge}
                        </small>
                    </div>
                    <div class="d-flex align-items-center gap-3 flex-shrink-0">
                        <span class="${t.type === 'income' ? 'transaction-amount-income' : 'transaction-amount-expense'}">
                            ${t.type === 'income' ? '+' : '−'}${formatEUR(t.amount)}
                        </span>
                        <button class="btn btn-sm btn-outline-danger py-0 px-1 lh-1"
                            onclick="deleteTransaction('${t.id}')" title="Delete transaction">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </li>`;
        }).join('')}
    </ul>`;
}

function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;
    const data = getData();
    data.transactions = data.transactions.filter(t => t.id !== id);
    saveData(data);
    render();
}

function _monthTransactions(data) {
    return data.transactions.filter(t => {
        const { year, month } = txDateYearMonth(t.date);
        return year === _currentYear && month === _currentMonth;
    });
}

function _setupExport() {
    document.getElementById('export-month-btn').addEventListener('click', () => {
        const data     = getData();
        const txs      = _monthTransactions(data);
        const filename = `transactions-${monthToParam(_currentYear, _currentMonth)}.json`;
        exportJSON({ year: _currentYear, month: _currentMonth, transactions: txs }, filename);
    });

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
}
