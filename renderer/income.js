
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

const pageSearchButton = document.getElementById('onClik-btn');
const searchDateInput = document.getElementById('searchDate');
const searchBillNumberInput = document.getElementById('searchInput'); 
const clearButton = document.getElementById('clear-btn');


function renderBillsTable(billsData) {
    const tableBody = document.querySelector('#productsTable tbody');
    tableBody.innerHTML = ''; 

    let totalIncome = 0;

    if (!billsData || billsData.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4; // Span all columns
        cell.textContent = 'ไม่พบข้อมูลบิล';
        cell.style.textAlign = 'center';
    } else {
        billsData.forEach(bill => {
            totalIncome += (bill.total_amount ?? 0);
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${bill.date}</td>
                <td>${bill.bill_number}</td>
                <td>${(bill.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>
                    <button class="delete-btn" data-id="${bill.id}">ลบ</button>
                    <button class="onClik-btn view-bill-btn" data-id="${bill.id}">รายละเอียด</button> 
                </td>`;
            // Note: Renamed the class for view buttons in table to 'view-bill-btn' to avoid conflict with main search button
        });
    }

    // Update the total income card
    const totalIncomeValueElement = document.getElementById('total-income-value');
    if (totalIncomeValueElement) {
        totalIncomeValueElement.textContent = `${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`;
    }

    // Re-attach event listeners for "View" buttons in the table
    document.querySelectorAll('.view-bill-btn').forEach(button => {
        button.onclick = function () {
            const billId = button.getAttribute('data-id');
            window.electronAPI.getBillDetail(billId)
                .then(data => {
                    const bill = data.bill;
                    const items = data.items;

                    const billDate = new Date(bill.date);
                    // Ensure date is displayed correctly, might need to adjust if bill.date is not already YYYY-MM-DD
                    const displayDate = !isNaN(billDate.valueOf()) ?
                        billDate.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }) :
                        bill.date;


                    document.getElementById('modalBillNumber').textContent = bill.bill_number;
                    document.getElementById('modalBillDate').textContent = displayDate;
                    document.getElementById('modalTotalAmount').textContent = (bill.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
                    document.getElementById('modalReceivedAmount').textContent = (bill.received_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
                    document.getElementById('modalChangeAmount').textContent = (bill.change_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

                    const itemsTableBody = document.querySelector('#itemsTable tbody');
                    itemsTableBody.innerHTML = '';

                    items.forEach(item => {
                        const itemRow = itemsTableBody.insertRow();
                        itemRow.innerHTML = `
                            <td>${item.product_name}</td>
                            <td>${item.quantity}</td>
                            <td>${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td>${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        `;
                    });
                    document.getElementById('billModal').style.display = 'block';
                })
                .catch(error => {
                    console.error('Error fetching bill detail:', error);
                    alert('ไม่สามารถโหลดรายละเอียดบิลได้');
                });
        };
    });

    // Re-attach event listeners for "Delete" buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = function () {
            const billId = button.getAttribute('data-id');
            if (confirm('คุณแน่ใจว่าจะลบบิลนี้ใช่ไหม?')) {
                window.electronAPI.deleteBill(billId)
                    .then(() => {
                        // Instead of button.closest('tr').remove(), we should re-fetch or filter current data
                        // For simplicity now, just reload all data. Could be optimized.
                        loadIncomeData();
                        alert('ลบบิลเสร็จสิ้น');
                    })
                    .catch(error => {
                        console.error('Error deleting bill:', error);
                        alert('เกิดข้อผิดพลาดในการลบบิล');
                    });
            }
        };
    });
}

if (pageSearchButton) {
    pageSearchButton.onclick = async function () {
        const date = searchDateInput.value;
        const billNumber = searchBillNumberInput.value.trim();

        try {
            const billsData = await window.electronAPI.searchBills({ date, billNumber });
            renderBillsTable(billsData);
        } catch (error) {
            console.error('Error searching bills:', error);
            alert('เกิดข้อผิดพลาดในการค้นหาบิล');
            renderBillsTable([]); // Display empty table on error
        }
    };
}


if (clearButton) {
    clearButton.onclick = function () {
        searchDateInput.value = '';
        searchBillNumberInput.value = '';
        loadIncomeData(); // Reload all bills
    };
}

function loadIncomeData() {
    window.electronAPI.getBills()
        .then((billsData) => {
            renderBillsTable(billsData);
        })
        .catch(error => {
            console.error('Error fetching all bills:', error);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูลบิลทั้งหมด');
            renderBillsTable([]); // Display empty table on error
        });
}

const closeBillModalButton = document.getElementById('closeBillModal');
if (closeBillModalButton) {
    closeBillModalButton.onclick = function () {
        document.getElementById('billModal').style.display = 'none';
    };
}


window.onclick = function (event) {
    const modal = document.getElementById('billModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};
loadIncomeData();
document.getElementById('billModal').style.display = 'none';


window.onclick = function (event) {
    const modal = document.getElementById('billModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};
loadIncomeData();
