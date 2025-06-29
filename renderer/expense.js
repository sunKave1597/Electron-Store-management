const addExpenseBtn = document.getElementById('addExpenseBtn');
const expenseModal = document.getElementById('expenseModal');
const closeExpenseModal = document.getElementById('closeExpenseModal');
const expenseForm = document.getElementById('expenseForm');
const expenseDateInput = document.getElementById('expenseDate');
const expenseItemSelect = document.getElementById('expenseItem');


const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (window.electronAPI && window.electronAPI.navigateToPage) {
      window.electronAPI.navigateToPage('menu.html').catch(err => console.error('Navigation error:', err));
    } else {
      console.error('electronAPI.navigateToPage is not available.');
    }
  });
}

async function populateExpenseItemDropdown() {
  try {
    const products = await window.electronAPI.getProducts();
    expenseItemSelect.innerHTML = ''; 
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'เลือกสินค้า';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    expenseItemSelect.appendChild(placeholderOption);

    products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.name; 
      option.textContent = product.name;
      expenseItemSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error populating expense items:', error);
  }
}

addExpenseBtn.addEventListener('click', () => {
  const today = new Date().toISOString().substr(0, 10);
  expenseDateInput.value = today;
  populateExpenseItemDropdown();
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

  const item = expenseItemSelect.value; // Get value from select
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value;

  if (!item || isNaN(amount) || amount <= 0 || !date) {
    alert('กรุณากรอกข้อมูลให้ครบถ้วน และเลือกรายการ');
    return;
  }
  try {
    window.electronAPI.addExpense({ item, amount, date });
    alert('บันทึกค่าใช้จ่ายเสร็จสิ้น!');
    loadExpenses();
  } catch (err) {
    console.error('เกิดข้อผิดพลาด:', err);
    alert('บันทึกไม่สำเร็จ');
  }

  console.log('บันทึกข้อมูล:', { item, amount, date });

  expenseForm.reset();
  expenseModal.style.display = 'none';
});
function displayExpenses(expensesToDisplay) {
  const tbody = document.querySelector('#productsTable tbody');
  tbody.innerHTML = '';

  let totalExpense = 0;

  expensesToDisplay.forEach((expense) => {
    totalExpense += (expense.amount ?? 0);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${expense.date}</td>
      <td>${expense.item}</td>
      <td>${(expense.amount ?? 0).toFixed(2)}</td>
      ${currentUserRole !== 'staff' ? `<td><button class="delete-btn" data-id="${expense.id}">ลบ</button></td>` : ''}
    `;
    tbody.appendChild(row);
  });

  const totalExpenseValueElement = document.getElementById('total-expense-value');
  if (totalExpenseValueElement) {
    totalExpenseValueElement.textContent = `${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`;
  }
}

async function loadExpenses() {
  try {
    const expenses = await window.electronAPI.getExpenses();
    displayExpenses(expenses);
  } catch (error) {
    console.error('Error loading expenses:', error);
    alert('เกิดข้อผิดพลาดในการโหลดรายการค่าใช้จ่าย');
  }
}

async function deleteExpense(expenseId) {
  try {
    await window.electronAPI.deleteExpense(expenseId);
    loadExpenses();
  } catch (error) {
    console.error('Error deleting expense:', error);
    alert('เกิดข้อผิดพลาดในการลบรายการค่าใช้จ่าย');
  }
}

const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const searchDateInput = document.getElementById('searchDate');
const searchItemInput = document.getElementById('searchItemInput');
const searchAmountInput = document.getElementById('searchAmountInput');

searchBtn.addEventListener('click', async () => {
  try {
    const allExpenses = await window.electronAPI.getExpenses();
    const dateQuery = searchDateInput.value;
    const itemQuery = searchItemInput.value.toLowerCase();
    const amountQuery = searchAmountInput.value;
    const filteredExpenses = allExpenses.filter(expense => {
      let matchesDate = true;
      if (dateQuery) {
        matchesDate = expense.date === dateQuery;
      }
      let matchesItem = true;
      if (itemQuery) {
        matchesItem = expense.item.toLowerCase().includes(itemQuery);
      }
      let matchesAmount = true;
      if (amountQuery) {
        const amountValue = parseFloat(amountQuery);
        if (!isNaN(amountValue)) {
          matchesAmount = expense.amount === amountValue;
        } else {
          matchesAmount = false;
        }
      }
      return matchesDate && matchesItem && matchesAmount;
    });
    displayExpenses(filteredExpenses);
  } catch (error) {
    console.error('Error searching expenses:', error);
    alert('เกิดข้อผิดพลาดในการค้นหารายการ');
  }
});
clearSearchBtn.addEventListener('click', () => {
  searchDateInput.value = '';
  searchItemInput.value = '';
  searchAmountInput.value = '';
  loadExpenses(); 
});

let currentUserRole = null; 

function adjustExpenseUIForRole() {
  if (currentUserRole === 'staff') {
    const manageHeader = document.getElementById('expenseManageHeader');
    if (manageHeader) {
      manageHeader.style.display = 'none';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.electronAPI && window.electronAPI.getCurrentUserSession) {
    window.electronAPI.getCurrentUserSession().then(session => {
      if (session && session.role) {
        currentUserRole = session.role;
        console.log('Current user role (expense page):', currentUserRole);
      } else {
        console.error('Could not retrieve user session or role for expense page.');
      }
      loadExpenses();
      adjustExpenseUIForRole(); 
      populateExpenseItemDropdown();
    }).catch(err => {
      console.error('Error fetching user session for expense page:', err);
      loadExpenses();
      adjustExpenseUIForRole();
      populateExpenseItemDropdown();
    });
  } else {
    console.error('electronAPI.getCurrentUserSession is not available on expense page.');
    loadExpenses();
    adjustExpenseUIForRole();
    populateExpenseItemDropdown();
  }
});

const productsTableBody = document.querySelector('#productsTable tbody');
productsTableBody.addEventListener('click', (event) => {
  if (event.target.classList.contains('delete-btn')) {
    if (currentUserRole === 'staff') {
      alert('คุณไม่มีสิทธิ์ลบรายการนี้');
      return;
    }
    const expenseId = event.target.dataset.id;
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
      deleteExpense(expenseId);
    }
  }
});
const addExistingExpenseBtn = document.getElementById('addExistingExpenseBtn');
const expenseModalExisting = document.getElementById('expenseModalExisting');
const closeExpenseModalExisting = document.getElementById('closeExpenseModalExisting');
const existingItemSearch = document.getElementById('existingItemSearch');
const existingItemList = document.getElementById('existingItemList');
const existingQuantity = document.getElementById('existingQuantity');
const existingPrice = document.getElementById('existingPrice');
const existingDate = document.getElementById('existingDate');
const expenseFormExisting = document.getElementById('expenseFormExisting');
let productNames = []; 

addExistingExpenseBtn.addEventListener('click', async () => {
  expenseModalExisting.style.display = 'block';
  existingQuantity.value = 1;
  existingPrice.value = 0;
  existingDate.value = new Date().toISOString().slice(0, 10);
  existingItemSearch.value = '';
  existingItemList.innerHTML = '';

  try {
    const products = await window.electronAPI.getProducts();
    productNames = products.map(p => p.name);
  } catch (err) {
    alert('โหลดข้อมูลสินค้าไม่สำเร็จ');
    console.error(err);
  }
});

closeExpenseModalExisting.addEventListener('click', () => {
  expenseModalExisting.style.display = 'none';
  existingItemList.innerHTML = '';
});

window.addEventListener('click', (e) => {
  if (e.target === expenseModalExisting) {
    expenseModalExisting.style.display = 'none';
    existingItemList.innerHTML = '';
  }
});

existingItemSearch.addEventListener('input', function () {
  const val = this.value.toLowerCase();
  existingItemList.innerHTML = '';
  if (!val) return;

  const filtered = productNames.filter(name => name.toLowerCase().includes(val));
  filtered.forEach(name => {
    const div = document.createElement('div');
    div.classList.add('autocomplete-item');
    div.textContent = name;
    div.addEventListener('click', () => {
      existingItemSearch.value = name;
      existingItemList.innerHTML = '';
    });
    existingItemList.appendChild(div);
  });
});

expenseFormExisting.addEventListener('submit', async (e) => {
  e.preventDefault();
  const item = existingItemSearch.value.trim();
  const quantity = parseInt(existingQuantity.value, 10);
  const price = parseFloat(existingPrice.value);
  const date = existingDate.value;
  if (!item || quantity <= 0 || isNaN(price) || price < 0 || !date) {
    alert('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
    return;
  }
  const amount = quantity;
  const pricetotal = quantity * price;
  try {
    await window.electronAPI.addExistingExpense({ item, amount, date , pricetotal });
    alert('บันทึกรายการเดิมสำเร็จ');
    expenseModalExisting.style.display = 'none';
    loadExpenses();
  } catch (err) {
    console.error('Error adding existing expense:', err);
    alert('บันทึกรายการเดิมไม่สำเร็จ');
  }
});
