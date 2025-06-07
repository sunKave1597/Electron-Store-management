const addExpenseBtn = document.getElementById('addExpenseBtn');
const expenseModal = document.getElementById('expenseModal');
const closeExpenseModal = document.getElementById('closeExpenseModal');
const expenseForm = document.getElementById('expenseForm');
const expenseDateInput = document.getElementById('expenseDate');

addExpenseBtn.addEventListener('click', () => {
  const today = new Date().toISOString().substr(0, 10);
  expenseDateInput.value = today;

  expenseModal.style.display = 'block';
});

closeExpenseModal.addEventListener('click', () => {
  expenseModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === expenseModal) {
    expenseModal.style.display = 'none';
  }
});


expenseForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const item = document.getElementById('expenseItem').value;
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value;

  if (!item || isNaN(amount) || amount <= 0 || !date) {
    alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }
  try {
    window.electronAPI.addExpense({ item, amount, date });
    alert('บันทึกค่าใช้จ่ายเรียบร้อยแล้ว!');
    loadExpenses(); 
  } catch (err) {
    console.error('เกิดข้อผิดพลาด:', err);
    alert('บันทึกไม่สำเร็จ');
  }

  console.log('บันทึกข้อมูล:', { item, amount, date });

  expenseForm.reset();
  expenseModal.style.display = 'none';


});

async function loadExpenses() {
  const tbody = document.querySelector('#productsTable tbody');
  const expenses = await window.electronAPI.getExpenses();
  tbody.innerHTML = '';

  expenses.forEach((expense) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${expense.date}</td>
      <td>${expense.item}</td>
      <td>${expense.amount.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

document.addEventListener('DOMContentLoaded', loadExpenses);
