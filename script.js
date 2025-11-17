// Data Management
class FinanceTracker {
    constructor() {
        this.transactions = this.loadTransactions();
        this.filters = {
            type: '',
            category: '',
            month: ''
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.populateSelectOptions();
        this.setDefaultDate();
        this.render();
        this.updateCharts();
    }

    loadTransactions() {
        const saved = localStorage.getItem('transactions');
        return saved ? JSON.parse(saved) : [];
    }

    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    addTransaction(transaction) {
        transaction.id = Date.now();
        this.transactions.push(transaction);
        this.saveTransactions();
        return transaction.id;
    }

    updateTransaction(id, updatedData) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions[index] = { ...this.transactions[index], ...updatedData };
            this.saveTransactions();
        }
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveTransactions();
    }

    getFilteredTransactions() {
        return this.transactions.filter(t => {
            if (this.filters.type && t.type !== this.filters.type) return false;
            if (this.filters.category && t.category !== this.filters.category) return false;
            if (this.filters.month) {
                const tMonth = t.date.substring(0, 7);
                if (tMonth !== this.filters.month) return false;
            }
            return true;
        });
    }

    getSortedTransactions(sortBy) {
        const sorted = [...this.getFilteredTransactions()];
        
        switch(sortBy) {
            case 'date-asc':
                return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            case 'amount-desc':
                return sorted.sort((a, b) => b.amount - a.amount);
            case 'amount-asc':
                return sorted.sort((a, b) => a.amount - b.amount);
            default:
                return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    }

    calculateTotals() {
        let income = 0, expense = 0;
        this.transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });
        return { income, expense, balance: income - expense };
    }

    calculateSavings() {
        const months = {};
        this.transactions.forEach(t => {
            const monthKey = t.date.substring(0, 7);
            if (!months[monthKey]) months[monthKey] = { income: 0, expense: 0 };
            
            if (t.type === 'income') {
                months[monthKey].income += t.amount;
            } else {
                months[monthKey].expense += t.amount;
            }
        });

        let totalSavings = 0;
        Object.values(months).forEach(month => {
            totalSavings += (month.income - month.expense);
        });
        return totalSavings;
    }

    getExpenseByCategory() {
        const categories = {};
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categories[t.category] = (categories[t.category] || 0) + t.amount;
            });
        return categories;
    }

    getMonthlySummary() {
        const months = {};
        this.transactions.forEach(t => {
            const monthKey = t.date.substring(0, 7);
            if (!months[monthKey]) {
                months[monthKey] = { income: 0, expense: 0 };
            }
            
            if (t.type === 'income') {
                months[monthKey].income += t.amount;
            } else {
                months[monthKey].expense += t.amount;
            }
        });

        return Object.keys(months)
            .sort()
            .reverse()
            .slice(0, 12)
            .map(month => ({ month, ...months[month] }));
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTransaction();
        });

        // Filter changes
        document.getElementById('filterType').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.render();
        });

        document.getElementById('filterCategory').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.render();
        });

        document.getElementById('filterMonth').addEventListener('change', (e) => {
            this.filters.month = e.target.value;
            this.render();
        });

        document.getElementById('resetFiltersBtn').addEventListener('click', () => {
            this.filters = { type: '', category: '', month: '' };
            document.getElementById('filterType').value = '';
            document.getElementById('filterCategory').value = '';
            document.getElementById('filterMonth').value = '';
            this.render();
        });

        // Sort
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.renderTransactions(e.target.value);
        });

        // Export and Clear buttons
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAllData());

        // Edit form
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditTransaction();
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this transaction?')) {
                const id = parseInt(document.getElementById('editForm').dataset.transactionId);
                this.deleteTransaction(id);
                this.closeModal();
                this.render();
            }
        });

        // Modal close
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('editModal')) {
                this.closeModal();
            }
        });
    }

    populateSelectOptions() {
        // Categories for main form
        const mainCategories = [
            { group: 'Income', options: ['Salary', 'Freelance', 'Investment', 'Bonus', 'Other Income'] },
            { group: 'Expenses', options: ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Rent', 'Insurance', 'Other Expense'] }
        ];

        // Populate filter categories
        const filterSelect = document.getElementById('filterCategory');
        const uniqueCategories = [...new Set(this.transactions.map(t => t.category))];
        uniqueCategories.forEach(cat => {
            if (cat) {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                filterSelect.appendChild(option);
            }
        });

        // Populate months for filter
        const monthSelect = document.getElementById('filterMonth');
        const months = new Set();
        this.transactions.forEach(t => {
            months.add(t.date.substring(0, 7));
        });
        
        [...months].sort().reverse().forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            option.textContent = monthName;
            monthSelect.appendChild(option);
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    handleAddTransaction() {
        const transaction = {
            description: document.getElementById('description').value,
            amount: parseFloat(document.getElementById('amount').value),
            category: document.getElementById('category').value,
            type: document.querySelector('input[name="type"]:checked').value,
            date: document.getElementById('date').value,
            notes: document.getElementById('notes').value
        };

        this.addTransaction(transaction);
        document.getElementById('transactionForm').reset();
        this.setDefaultDate();
        this.render();
        this.updateCharts();
    }

    handleEditTransaction() {
        const id = parseInt(document.getElementById('editForm').dataset.transactionId);
        const updatedData = {
            description: document.getElementById('editDescription').value,
            amount: parseFloat(document.getElementById('editAmount').value),
            category: document.getElementById('editCategory').value,
            type: document.querySelector('input[name="editType"]:checked').value,
            date: document.getElementById('editDate').value,
            notes: document.getElementById('editNotes').value
        };

        this.updateTransaction(id, updatedData);
        this.closeModal();
        this.render();
        this.updateCharts();
    }

    openEditModal(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) return;

        document.getElementById('editDescription').value = transaction.description;
        document.getElementById('editAmount').value = transaction.amount;
        document.getElementById('editCategory').value = transaction.category;
        document.querySelector(`input[name="editType"][value="${transaction.type}"]`).checked = true;
        document.getElementById('editDate').value = transaction.date;
        document.getElementById('editNotes').value = transaction.notes || '';
        document.getElementById('editForm').dataset.transactionId = id;

        document.getElementById('editModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('editModal').style.display = 'none';
    }

    render() {
        this.updateDashboard();
        this.renderTransactions();
        this.renderMonthlySummary();
        this.updateCharts();
    }

    updateDashboard() {
        const { income, expense, balance } = this.calculateTotals();
        const savings = this.calculateSavings();

        document.getElementById('totalIncome').textContent = `$${income.toFixed(2)}`;
        document.getElementById('totalExpense').textContent = `$${expense.toFixed(2)}`;
        document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
        document.getElementById('savings').textContent = `$${savings.toFixed(2)}`;

        // Update balance color based on value
        const balanceCard = document.getElementById('balance');
        balanceCard.parentElement.parentElement.className = 'card balance-card';
        if (balance < 0) {
            balanceCard.parentElement.parentElement.style.borderLeftColor = 'var(--danger-color)';
        }
    }

    renderTransactions(sortBy = 'date-desc') {
        const container = document.getElementById('transactionsList');
        const sorted = this.getSortedTransactions(sortBy);

        if (sorted.length === 0) {
            container.innerHTML = '<p class="empty-message">No transactions found</p>';
            return;
        }

        container.innerHTML = sorted.map(t => `
            <div class="transaction-item ${t.type}">
                <div class="transaction-left">
                    <div class="transaction-icon">${t.type === 'income' ? '📈' : '📉'}</div>
                    <div class="transaction-details">
                        <div class="transaction-description">${t.description}</div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <span class="transaction-category">${t.category}</span>
                            <span class="transaction-date">${new Date(t.date).toLocaleDateString()}</span>
                        </div>
                        ${t.notes ? `<div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">${t.notes}</div>` : ''}
                    </div>
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}
                    </div>
                    <div class="transaction-actions">
                        <button class="transaction-btn transaction-btn-edit" onclick="tracker.openEditModal(${t.id})">Edit</button>
                        <button class="transaction-btn transaction-btn-delete" onclick="tracker.deleteAndRefresh(${t.id})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    deleteAndRefresh(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.deleteTransaction(id);
            this.render();
        }
    }

    renderMonthlySummary() {
        const container = document.getElementById('monthlySummary');
        const summary = this.getMonthlySummary();

        if (summary.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No data yet</p>';
            return;
        }

        container.innerHTML = summary.map(item => `
            <div class="summary-item">
                <div class="summary-item-left">
                    <div class="summary-item-month">
                        ${new Date(item.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <div class="summary-item-values">
                        <span>Income: <span class="summary-item-income">$${item.income.toFixed(2)}</span></span>
                        <span>Expense: <span class="summary-item-expense">$${item.expense.toFixed(2)}</span></span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateCharts() {
        this.updateExpenseChart();
        this.updateComparisonChart();
    }

    updateExpenseChart() {
        const ctx = document.getElementById('expenseChart');
        if (!ctx) return;

        const categories = this.getExpenseByCategory();
        const labels = Object.keys(categories);
        const data = Object.values(categories);

        // Destroy existing chart if it exists
        if (this.expenseChart instanceof Chart) {
            this.expenseChart.destroy();
        }

        this.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.length > 0 ? labels : ['No Data'],
                datasets: [{
                    data: data.length > 0 ? data : [1],
                    backgroundColor: [
                        '#6366f1',
                        '#8b5cf6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#3b82f6',
                        '#ec4899',
                        '#14b8a6',
                        '#f97316',
                        '#06b6d4'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 12 },
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    updateComparisonChart() {
        const ctx = document.getElementById('comparisonChart');
        if (!ctx) return;

        const summary = this.getMonthlySummary();
        const labels = summary.map(item => 
            new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        ).reverse();
        const incomeData = summary.map(item => item.income).reverse();
        const expenseData = summary.map(item => item.expense).reverse();

        // Destroy existing chart if it exists
        if (this.comparisonChart instanceof Chart) {
            this.comparisonChart.destroy();
        }

        this.comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['No Data'],
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData.length > 0 ? incomeData : [0],
                        backgroundColor: '#10b981',
                        borderRadius: 8,
                        borderSkipped: false
                    },
                    {
                        label: 'Expenses',
                        data: expenseData.length > 0 ? expenseData : [0],
                        backgroundColor: '#ef4444',
                        borderRadius: 8,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    exportToCSV() {
        const sorted = this.getSortedTransactions('date-asc');
        
        let csv = 'Date,Description,Category,Type,Amount,Notes\n';
        sorted.forEach(t => {
            csv += `"${t.date}","${t.description}","${t.category}","${t.type}","${t.amount}","${t.notes || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-tracker-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    clearAllData() {
        if (confirm('⚠️ Warning: This will delete ALL transactions. This action cannot be undone. Are you sure?')) {
            if (confirm('Are you really sure? Type "YES" mentally - this is your last warning!')) {
                this.transactions = [];
                this.saveTransactions();
                this.filters = { type: '', category: '', month: '' };
                this.render();
                alert('✓ All data has been cleared');
            }
        }
    }
}

// Initialize the tracker when DOM is loaded
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new FinanceTracker();
});
