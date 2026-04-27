function formatEUR(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount || 0);
}

function formatMonth(year, month) {
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function currentYearMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function parseMonthParam(param) {
    if (!param) return currentYearMonth();
    const parts = param.split('-').map(Number);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return currentYearMonth();
    return { year: parts[0], month: parts[1] };
}

function monthToParam(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

function prevMonth(year, month) {
    return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year, month) {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function txDateYearMonth(dateStr) {
    const parts = dateStr.split('-').map(Number);
    return { year: parts[0], month: parts[1] };
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}
