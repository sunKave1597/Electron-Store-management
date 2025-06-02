// ฟังก์ชันเพิ่มรายรับ
document.getElementById('addIncomeBtn').onclick = function () {
  const incomeDate = document.getElementById('incomeDate').value;
  const incomeItem = document.getElementById('incomeItem').value;
  let incomeAmount = document.getElementById('incomeAmount').value;

  incomeAmount = parseFloat(incomeAmount);
  if (isNaN(incomeAmount) || incomeAmount <= 0) {
    alert("กรุณากรอกจำนวนเงินที่ถูกต้องและมากกว่า 0");
    return;
  }

  const billNumber = generateBillNumber();

  if (!incomeDate || !incomeItem || !incomeAmount) {
    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  window.electronAPI.addIncome(incomeDate, incomeItem, incomeAmount, billNumber)
    .then((response) => {
      console.log('Income added', response);
      loadIncomeData(); // รีเฟรชข้อมูลหลังจากเพิ่ม
    })
    .catch(error => {
      console.error('Error adding income:', error);
    });
};

function generateBillNumber() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let billNumber = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    billNumber += characters[randomIndex];
  }
  return billNumber;
}

document.getElementById('searchBtn').onclick = function () {
  const searchDate = document.getElementById('searchDate').value;
  const rows = document.querySelectorAll('#productsTable tbody tr');
  rows.forEach(row => {
    const dateCell = row.querySelector('td[data-type="date"]');
    if (!searchDate || (dateCell && dateCell.textContent === searchDate)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
};

document.getElementById('clearSearchBtn').onclick = function () {
  document.getElementById('searchDate').value = '';
  const rows = document.querySelectorAll('#productsTable tbody tr');
  rows.forEach(row => row.style.display = '');
};

function loadIncomeData() {
  window.electronAPI.getIncome()
    .then((incomeData) => {
      const tableBody = document.querySelector('#productsTable tbody');
      tableBody.innerHTML = ''; 
      incomeData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td data-type="date">${item.date}</td>
          <td>${item.item}</td>
          <td>${item.bill_number}</td>
          <td>${item.amount}</td>
          <td>
            <button class="deleteBtn" data-id="${item.id}">Delete</button>
          </td>
        `;
        tableBody.appendChild(row);
      });

      // ฟังก์ชันลบรายรับ
      document.querySelectorAll('.deleteBtn').forEach(button => {
        button.onclick = function () {
          const incomeId = button.getAttribute('data-id');
          window.electronAPI.deleteIncome(incomeId)
            .then(() => {
              button.closest('tr').remove(); // ลบแถวในตาราง
            })
            .catch(error => {
              console.error('Error deleting income:', error);
            });
        };
      });
    })
    .catch(error => {
      console.error('Error fetching income:', error);
    });
}

// โหลดข้อมูลรายรับเมื่อเริ่มต้น
loadIncomeData();
