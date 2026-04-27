let _editBalanceModal;
let _patrimonioChart = null;
let _categoryChart   = null;
let _monthlyChart    = null;

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
    _renderCategoryChart(data, year, month);
    _renderPatrimonioChart(data);
    _renderMonthlyChart(data);
    _renderMonthlyHistory(data);
    _renderRecentTransactions(data);
}

// ── Patrimônio total ──────────────────────────────────────────────────────────

function _renderPatrimonio(data) {
    const total = data.accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const el    = document.getElementById('total-patrimonio');
    el.textContent = formatEUR(total);
    el.className   = `patrimonio-value ${total >= 0 ? 'text-success' : 'text-danger'}`;
}

// ── Account cards ─────────────────────────────────────────────────────────────

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

// ── This month summary ────────────────────────────────────────────────────────

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

// ── Category doughnut chart ───────────────────────────────────────────────────

function _renderCategoryChart(data, year, month) {
    const noData  = document.getElementById('category-no-data');
    const wrapper = document.getElementById('category-chart-wrapper');

    if (_categoryChart) { _categoryChart.destroy(); _categoryChart = null; }

    const expenses = _monthTransactions(data, year, month).filter(t => t.type === 'expense');

    if (expenses.length === 0) {
        noData.style.display  = '';
        wrapper.style.display = 'none';
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

    noData.style.display  = 'none';
    wrapper.style.display = '';

    _categoryChart = new Chart(document.getElementById('category-chart'), {
        type: 'doughnut',
        data: {
            labels: sorted.map(c => c.name),
            datasets: [{
                data: sorted.map(c => c.total),
                backgroundColor: sorted.map(c => c.color),
                borderWidth: 2,
                borderColor: '#fff',
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '58%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        generateLabels: chart => {
                            const ds = chart.data.datasets[0];
                            return chart.data.labels.map((label, i) => ({
                                text: `${label}  ${formatEUR(ds.data[i])}`,
                                fillStyle: ds.backgroundColor[i],
                                strokeStyle: '#fff',
                                lineWidth: 2,
                                index: i
                            }));
                        },
                        font: { size: 11 },
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const pct = total > 0 ? (ctx.raw / total * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${formatEUR(ctx.raw)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ── Patrimônio trend (line chart) ─────────────────────────────────────────────

function _renderPatrimonioChart(data) {
    const noData  = document.getElementById('patrimonio-chart-no-data');
    const wrapper = document.getElementById('patrimonio-chart-wrapper');

    if (_patrimonioChart) { _patrimonioChart.destroy(); _patrimonioChart = null; }

    const history = _computePatrimonioHistory(data);

    if (history.length < 2) {
        noData.style.display  = '';
        wrapper.style.display = 'none';
        return;
    }

    noData.style.display  = 'none';
    wrapper.style.display = '';

    _patrimonioChart = new Chart(document.getElementById('patrimonio-chart'), {
        type: 'line',
        data: {
            labels: history.map(h => _shortMonthLabel(h.month)),
            datasets: [{
                label: 'Patrimônio',
                data: history.map(h => h.balance),
                borderColor: '#198754',
                backgroundColor: 'rgba(25, 135, 84, 0.07)',
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#198754',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: ctx => ` ${formatEUR(ctx.raw)}` }
                }
            },
            scales: {
                y: {
                    ticks: { callback: val => formatEUR(val), maxTicksLimit: 5 },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function _computePatrimonioHistory(data) {
    // Collect all months from ALL transactions (not capped) plus current month
    const allMonthsSet = new Set();
    const { year, month } = currentYearMonth();
    allMonthsSet.add(monthToParam(year, month));
    data.transactions.forEach(t => {
        const d = txDateYearMonth(t.date);
        allMonthsSet.add(monthToParam(d.year, d.month));
    });

    const allSorted = [...allMonthsSet].sort();

    // Compute net per month for all months
    const netByMonth = {};
    allSorted.forEach(m => { netByMonth[m] = 0; });
    data.transactions.forEach(t => {
        const d   = txDateYearMonth(t.date);
        const key = monthToParam(d.year, d.month);
        netByMonth[key] += t.type === 'income' ? t.amount : -t.amount;
    });

    const currentTotal = data.accounts.reduce((s, a) => s + (a.balance || 0), 0);

    // Reconstruct backwards from current balance
    const fullHistory = [];
    let bal = currentTotal;
    for (let i = allSorted.length - 1; i >= 0; i--) {
        fullHistory.unshift({ month: allSorted[i], balance: bal });
        if (i > 0) bal -= netByMonth[allSorted[i]];
    }

    // Return last 12 months
    return fullHistory.slice(-12);
}

// ── Monthly income vs expenses bar chart ──────────────────────────────────────

function _renderMonthlyChart(data) {
    const noData  = document.getElementById('monthly-chart-no-data');
    const wrapper = document.getElementById('monthly-chart-wrapper');

    if (_monthlyChart) { _monthlyChart.destroy(); _monthlyChart = null; }

    if (data.transactions.length === 0) {
        noData.style.display  = '';
        wrapper.style.display = 'none';
        return;
    }

    const months          = _getRelevantMonths(data, 12);
    const incomeByMonth   = {};
    const expensesByMonth = {};
    months.forEach(m => { incomeByMonth[m] = 0; expensesByMonth[m] = 0; });

    data.transactions.forEach(t => {
        const d   = txDateYearMonth(t.date);
        const key = monthToParam(d.year, d.month);
        if (!Object.prototype.hasOwnProperty.call(incomeByMonth, key)) return;
        if (t.type === 'income') incomeByMonth[key]   += t.amount;
        else                     expensesByMonth[key] += t.amount;
    });

    noData.style.display  = 'none';
    wrapper.style.display = '';

    _monthlyChart = new Chart(document.getElementById('monthly-chart'), {
        type: 'bar',
        data: {
            labels: months.map(_shortMonthLabel),
            datasets: [
                {
                    label: 'Income',
                    data: months.map(m => incomeByMonth[m]),
                    backgroundColor: 'rgba(25, 135, 84, 0.75)',
                    borderColor: '#198754',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Expenses',
                    data: months.map(m => expensesByMonth[m]),
                    backgroundColor: 'rgba(220, 53, 69, 0.75)',
                    borderColor: '#dc3545',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${formatEUR(ctx.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    ticks: { callback: val => formatEUR(val), maxTicksLimit: 5 },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── Monthly history table ─────────────────────────────────────────────────────

function _renderMonthlyHistory(data) {
    const container = document.getElementById('monthly-history-container');

    const { year: cy, month: cm } = currentYearMonth();
    const currentParam            = monthToParam(cy, cm);
    const months                  = _getRelevantMonths(data, 24).slice().reverse();

    const rows = months.map(m => {
        const [y, mo] = m.split('-').map(Number);
        const txs     = data.transactions.filter(t => {
            const d = txDateYearMonth(t.date);
            return monthToParam(d.year, d.month) === m;
        });
        const income   = txs.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0);
        const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const net      = income - expenses;
        const savings  = income > 0 ? (net / income * 100).toFixed(0) : null;
        return { m, year: y, month: mo, income, expenses, net, savings, txCount: txs.length };
    }).filter(r => r.txCount > 0 || r.m === currentParam);

    if (rows.length === 0) {
        container.innerHTML = '<p class="text-muted p-3 mb-0">No history yet.</p>';
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Month</th>
                        <th class="text-end">Income</th>
                        <th class="text-end">Expenses</th>
                        <th class="text-end">Net</th>
                        <th class="text-end d-none d-sm-table-cell">Savings rate</th>
                        <th class="text-end d-none d-md-table-cell">Transactions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => `
                        <tr>
                            <td>
                                <a href="transactions.html?month=${r.m}" class="fw-semibold text-decoration-none">
                                    ${formatMonth(r.year, r.month)}
                                </a>
                            </td>
                            <td class="text-end text-success">${formatEUR(r.income)}</td>
                            <td class="text-end text-danger">${formatEUR(r.expenses)}</td>
                            <td class="text-end fw-semibold ${r.net >= 0 ? 'text-success' : 'text-danger'}">
                                ${r.net >= 0 ? '+' : ''}${formatEUR(r.net)}
                            </td>
                            <td class="text-end d-none d-sm-table-cell text-muted">
                                ${r.savings !== null ? `${r.savings}%` : '—'}
                            </td>
                            <td class="text-end d-none d-md-table-cell text-muted small">${r.txCount}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

// ── Recent transactions ───────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function _monthTransactions(data, year, month) {
    return data.transactions.filter(t => {
        const d = txDateYearMonth(t.date);
        return d.year === year && d.month === month;
    });
}

function _getRelevantMonths(data, limit = 12) {
    const set = new Set();
    const { year, month } = currentYearMonth();
    set.add(monthToParam(year, month));
    data.transactions.forEach(t => {
        const d = txDateYearMonth(t.date);
        set.add(monthToParam(d.year, d.month));
    });
    return [...set].sort().slice(-limit);
}

function _shortMonthLabel(monthParam) {
    const [y, m] = monthParam.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ── Edit balance modal ────────────────────────────────────────────────────────

function openEditBalance(accountId) {
    const data = getData();
    const acc  = data.accounts.find(a => a.id === accountId);
    if (!acc) return;
    document.getElementById('balance-account-id').value     = accountId;
    document.getElementById('balance-input').value          = acc.balance || 0;
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
