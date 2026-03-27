class Transaction {
    constructor(amount, date, category, subCategory, description = '', id = null) {
        this.id = id || Date.now().toString();
        this.amount = parseFloat(amount);
        this.date = date;
        this.category = category;
        this.subCategory = subCategory;
        this.description = description;
    }

    get formattedAmount() {
        const symbol = '₹';
        return this.category === 'Income' ? `+${symbol}${this.amount.toFixed(2)}` : `-${symbol}${this.amount.toFixed(2)}`;
    }

    toJSON() {
        return { ...this };
    }
}

class TransactionManager {
    constructor() {
        this.transactions = [];
        this.expenseChart = null;
        this.incomeChart = null;
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        document.getElementById('addBtn').addEventListener('click', () => this.openModal());
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('filterCategory').addEventListener('change', () => this.render());
        document.getElementById('filterSubCategory').addEventListener('change', () => this.render());
        document.getElementById('filterStartDate').addEventListener('change', () => this.render());
        document.getElementById('filterEndDate').addEventListener('change', () => this.render());
        document.getElementById('sortBy').addEventListener('change', () => this.render());
        document.getElementById('exportCsv').addEventListener('click', () => this.exportToCSV());
        document.getElementById('clearAll').addEventListener('click', () => {
            if (confirm('Are you sure? This deletes all transactions.')) {
                this.clearAll();
            }
        });

        document.querySelectorAll('input[name="category"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.updateSubCategories(e.target.value));
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const id = e.target.dataset.id;
                const transaction = this.transactions.find(t => t.id === id);
                if (transaction) this.openModal(transaction);
            } else if (e.target.classList.contains('delete-btn')) {
                const id = e.target.dataset.id;
                this.deleteTransaction(id);
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target.id === 'transactionModal') this.closeModal();
        });
    }

    updateSubCategories(category) {
        const subCatSelect = document.getElementById('subCategory');
        subCatSelect.innerHTML = '<option value="">Select...</option>';

        const subCategories = {
            'Income': ['Salary', 'Allowance', 'Bonus', 'Petty Cash', 'Investment', 'Other'],
            'Expense': ['Rent', 'Food', 'Shopping', 'Entertainment', 'Transport', 'Utilities', 'Medical', 'Other']
        };

        (subCategories[category] || []).forEach(cat => {
            const option = document.createElement('option');
            option.value = option.textContent = cat;
            subCatSelect.appendChild(option);
        });
    }

    openModal(editTransaction = null) {
        const modal = document.getElementById('transactionModal');
        const form = document.getElementById('transactionForm');
        const title = document.getElementById('modalTitle');

        form.reset();
        this.clearErrors();

        if (editTransaction) {
            title.textContent = 'Edit Transaction';
            document.getElementById('amount').value = editTransaction.amount;
            document.getElementById('date').value = editTransaction.date;
            document.querySelector(`input[name="category"][value="${editTransaction.category}"]`).checked = true;
            this.updateSubCategories(editTransaction.category);
            document.getElementById('subCategory').value = editTransaction.subCategory;
            document.getElementById('description').value = editTransaction.description;
            form.dataset.editId = editTransaction.id;
        } else {
            title.textContent = 'Add Transaction';
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            delete form.dataset.editId;
        }

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('transactionModal').style.display = 'none';
    }

    clearErrors() {
        [...document.querySelectorAll('.error')].forEach(e => e.textContent = '');
        [...document.querySelectorAll('input, select, textarea')].forEach(el => el.classList.remove('input-error'));
    }

    showError(id, message) {
        const errorEl = document.getElementById(id);
        errorEl.textContent = message;
        document.getElementById(id.replace('Error', '')).classList.add('input-error');
    }

    validateForm() {
        this.clearErrors();

        const amount = parseFloat(document.getElementById('amount').value);
        const date = new Date(document.getElementById('date').value + 'T00:00');
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const category = document.querySelector('input[name="category"]:checked')?.value;
        const subCategory = document.getElementById('subCategory').value;
        const description = document.getElementById('description').value;

        let valid = true;

        if (!amount || amount <= 0) {
            this.showError('amountError', 'Amount must be > 0');
            valid = false;
        }

        if (date > today) {
            this.showError('dateError', 'Future dates not allowed');
            valid = false;
        }

        if (!category) {
            this.showError('categoryError', 'Select category');
            valid = false;
        }

        if (!subCategory) {
            this.showError('subCategoryError', 'Select sub-category');
            valid = false;
        }

        if (description.length > 100) {
            this.showError('descError', 'Max 100 chars');
            valid = false;
        }

        return valid;
    }

    handleFormSubmit() {
        if (!this.validateForm()) return;

        const formData = {
            amount: document.getElementById('amount').value,
            date: document.getElementById('date').value,
            category: document.querySelector('input[name="category"]:checked').value,
            subCategory: document.getElementById('subCategory').value,
            description: document.getElementById('description').value
        };

        const editId = document.getElementById('transactionForm').dataset.editId;

        if (editId) {
            this.editTransaction(editId, formData);
        } else {
            this.addTransaction(formData);
        }

        this.closeModal();
    }

    addTransaction(data) {
        const transaction = new Transaction(data.amount, data.date, data.category, data.subCategory, data.description);
        this.transactions.unshift(transaction);
        this.saveToLocalStorage();
        this.render();
    }

    editTransaction(id, data) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index > -1) {
            this.transactions[index] = new Transaction(data.amount, data.date, data.category, data.subCategory, data.description, id);
            this.saveToLocalStorage();
            this.render();
        }
    }

    deleteTransaction(id) {
        if (confirm('Delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveToLocalStorage();
            this.render();
        }
    }

    clearAll() {
        this.transactions = [];
        if (this.expenseChart) {
            this.expenseChart.destroy();
            this.expenseChart = null;
        }
        this.saveToLocalStorage();
        this.render();
    }

    getFilteredTransactions() {
        let filtered = [...this.transactions];

        const categoryFilter = document.getElementById('filterCategory').value;
        if (categoryFilter) filtered = filtered.filter(t => t.category === categoryFilter);

        const filterSubCatSelect = document.getElementById('filterSubCategory');
        const allSubCats = [...new Set(this.transactions.map(t => t.subCategory))];

        filterSubCatSelect.innerHTML =
            '<option value="">All</option>' +
            allSubCats.map(cat => `<option value="${cat}">${cat}</option>`).join('');

        const subCatFilter = filterSubCatSelect.value;
        if (subCatFilter) filtered = filtered.filter(t => t.subCategory === subCatFilter);

        const startDate = document.getElementById('filterStartDate').value;
        if (startDate) filtered = filtered.filter(t => new Date(t.date) >= new Date(startDate));

        const endDate = document.getElementById('filterEndDate').value;
        if (endDate) filtered = filtered.filter(t => new Date(t.date) <= new Date(endDate));

        const sortBy = document.getElementById('sortBy').value;

        const sorts = {
            'date-desc': (a, b) => new Date(b.date) - new Date(a.date),
            'date-asc': (a, b) => new Date(a.date) - new Date(b.date),
            'amount-desc': (a, b) => b.amount - a.amount,
            'amount-asc': (a, b) => a.amount - b.amount
        };

        filtered.sort(sorts[sortBy] || sorts['date-desc']);

        return filtered;
    }

    render() {
        const filtered = this.getFilteredTransactions();
        this.renderSummary(filtered);
        this.renderTable(filtered);
        this.renderChart(filtered);
    }

    renderSummary(transactions) {
        const summary = this.getSummary(transactions);
        const symbol = '₹';

        document.getElementById('totalIncome').textContent = `${symbol}${summary.income.toFixed(2)}`;
        document.getElementById('totalExpense').textContent = `${symbol}${summary.expense.toFixed(2)}`;

        const balanceEl = document.getElementById('netBalance');
        balanceEl.textContent = `${symbol}${summary.balance.toFixed(2)}`;
        balanceEl.parentElement.classList.toggle('negative', summary.balance < 0);
    }

    getSummary(transactions = this.transactions) {
        const income = transactions.filter(t => t.category === 'Income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, balance: income - expense };
    }

    renderTable(transactions) {
        const container = document.getElementById('transactionsTable');
        const noData = document.getElementById('noTransactions');

        if (transactions.length === 0) {
            container.innerHTML = '';
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date</th><th>Category</th><th>Sub-Category</th><th>Description</th><th>Amount</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(t => `
                        <tr>
                            <td>${new Date(t.date).toLocaleDateString()}</td>
                            <td>${t.category}</td>
                            <td>${t.subCategory}</td>
                            <td>${t.description || '-'}</td>
                            <td>${t.formattedAmount}</td>
                            <td>
                                <button class="btn btn-small btn-primary edit-btn" data-id="${t.id}">Edit</button>
                                <button class="btn btn-small btn-danger delete-btn" data-id="${t.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderChart(transactions) {
        this.renderIncomeChart(transactions);
        this.renderExpenseChart(transactions);
    }

    renderIncomeChart(transactions) {
        const ctxIncome = document.getElementById('incomeChart').getContext('2d');
        if (this.incomeChart) this.incomeChart.destroy();

        const incomeData = transactions.filter(t => t.category === 'Income').reduce((acc, t) => {
            acc[t.subCategory] = (acc[t.subCategory] || 0) + t.amount;
            return acc;
        }, {});

        const labels = Object.keys(incomeData);
        const data = Object.values(incomeData);

        if (labels.length === 0) {
            ctxIncome.canvas.style.display = 'none';
            return;
        }

        ctxIncome.canvas.style.display = 'block';

        const categoryColors = {
            'Salary': '#2ecc71',
            'Allowance': '#3498db',
            'Bonus': '#f1c40f',
            'Petty Cash': '#9b59b6',
            'Investment': '#1abc9c',
            'Other': '#e67e22'
        };

        const backgroundColors = labels.map(label => categoryColors[label] || '#95a5a6');

        this.incomeChart = new Chart(ctxIncome, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Income',
                    data,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: label,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].backgroundColor[i],
                                    lineWidth: 1,
                                    hidden: false,
                                    index: i
                                }));
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `₹${context.raw}`
                        }
                    }
},
                scales: { x: { beginAtZero: true } }
            }
        });
    }

    renderExpenseChart(transactions) {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        if (this.expenseChart) this.expenseChart.destroy();

        const expenseData = transactions.filter(t => t.category === 'Expense').reduce((acc, t) => {
            acc[t.subCategory] = (acc[t.subCategory] || 0) + t.amount;
            return acc;
        }, {});

        const labels = Object.keys(expenseData);
        const data = Object.values(expenseData);

        if (labels.length === 0) {
            ctx.canvas.style.display = 'none';
            return;
        }

        ctx.canvas.style.display = 'block';

        this.expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    saveToLocalStorage() {
        localStorage.setItem('financeBuddyTransactions', JSON.stringify(this.transactions.map(t => t.toJSON())));
    }

    loadFromLocalStorage() {
        const data = localStorage.getItem('financeBuddyTransactions');
        if (data) this.transactions = JSON.parse(data).map(t => Object.assign(new Transaction(), t));
    }

    exportToCSV() {
        const filtered = this.getFilteredTransactions();
        if (!filtered.length) return alert('No transactions to export');

        let csv = 'Date,Category,Sub-Category,Description,Amount\n';

        filtered.forEach(t => {
            csv += `"${t.date}","${t.category}","${t.subCategory}","${(t.description || '').replace(/"/g, '""')}","${t.amount}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `financebuddy_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    }
}

const app = new TransactionManager();