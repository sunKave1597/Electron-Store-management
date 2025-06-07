
document.getElementById('onClik-btn').onclick = function () {
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

document.getElementById('clear-btn').onclick = function () {
    document.getElementById('searchDate').value = '';
    const rows = document.querySelectorAll('#productsTable tbody tr');
    rows.forEach(row => row.style.display = '');
};

function loadIncomeData() {
    window.electronAPI.getBills()
        .then((billsData) => {
            const tableBody = document.querySelector('#productsTable tbody');
            tableBody.innerHTML = ''; // Clear existing rows

            let totalIncome = 0; // Initialize total income

            billsData.forEach(bill => {
                totalIncome += (bill.total_amount ?? 0); // Accumulate total amount
                const row = document.createElement('tr');
                row.innerHTML = `
                                <td>${bill.date}</td>
                                <td>${bill.bill_number}</td>
                                <td>${(bill.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td>
                                    <button class="delete-btn" data-id="${bill.id}">ลบ</button>
                                    <button class="onClik-btn" data-id="${bill.id}">ดู</button>
                                </td>
                                `;
                tableBody.appendChild(row);
            });

            // Update the total income card
            const totalIncomeValueElement = document.getElementById('total-income-value');
            if (totalIncomeValueElement) {
                totalIncomeValueElement.textContent = `${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`;
            }

            document.querySelectorAll('.onClik-btn').forEach(button => {
                button.onclick = function () {
                    const billId = button.getAttribute('data-id');

                    window.electronAPI.getBillDetail(billId)
                        .then(data => {
                            const bill = data.bill;
                            const items = data.items;

                            const billDate = new Date(bill.date);
                            const options = { month: '2-digit', day: '2-digit' };
                            const formattedDate = billDate.toLocaleDateString('th-TH', options);

                            document.getElementById('modalBillNumber').textContent = bill.bill_number;
                            document.getElementById('modalBillDate').textContent = formattedDate;
                            document.getElementById('modalTotalAmount').textContent = (bill.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
                            document.getElementById('modalReceivedAmount').textContent = (bill.received_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
                            document.getElementById('modalChangeAmount').textContent = (bill.change_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

                            const itemsTableBody = document.querySelector('#itemsTable tbody');
                            itemsTableBody.innerHTML = '';

                            items.forEach(item => {
                                const itemRow = document.createElement('tr');
                                itemRow.innerHTML = `
                                    <td>${item.product_name}</td>
                                    <td>${item.quantity}</td>
                                    <td>${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td>${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                `;
                                itemsTableBody.appendChild(itemRow);
                            });

                            document.getElementById('billModal').style.display = 'block';
                        })
                        .catch(error => {
                            console.error('Error fetching bill detail:', error);
                        });
                };
            });


            document.querySelectorAll('.delete-btn').forEach(button => {
                button.onclick = function () {
                    const billId = button.getAttribute('data-id');
                    if (confirm('คุณแน่ใจว่าจะลบบิลนี้ใช่ไหม?')) {
                        window.electronAPI.deleteBill(billId)
                            .then(() => {
                                button.closest('tr').remove();
                            })
                            .catch(error => {
                                console.error('Error deleting bill:', error);
                            });
                    }
                };
            });
        })
        .catch(error => {
            console.error('Error fetching bills:', error);
        });
}
document.getElementById('closeBillModal').onclick = function () {
    document.getElementById('billModal').style.display = 'none';
};

window.onclick = function (event) {
    const modal = document.getElementById('billModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};
loadIncomeData();
