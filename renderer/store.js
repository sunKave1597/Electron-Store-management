const currentDateElement = document.getElementById("currentDate");
const billNumberElement = document.getElementById("billNumber");
const billsTableBody = document.getElementById("billsTableBody");
const createBillBtn = document.getElementById("createBillBtn");
const billModal = document.getElementById("billModal");
const closeBtn = document.querySelector(".close");
const billForm = document.getElementById("billForm");
const billProduct = document.getElementById("billProduct");
const billQuantity = document.getElementById("billQuantity");
const billPrice = document.getElementById("billPrice");
const billTotal = document.getElementById("billTotal");
const totalAmount = document.getElementById("totalAmount");
const receivedAmount = document.getElementById("receivedAmount");
const changeAmount = document.getElementById("changeAmount");
const doneBtn = document.getElementById("doneBtn");
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

const today = new Date();
const options = { year: "numeric", month: "2-digit", day: "2-digit" };
currentDateElement.textContent = today.toLocaleDateString("th-TH", options);

const randomBillNumber = "BILL-" + Math.floor(1000 + Math.random() * 9000);
billNumberElement.textContent = randomBillNumber;

let bills = [];

async function loadProducts() {
    billProduct.innerHTML = '<option value="">เลือกสินค้า</option>';
    try {
        const products = await window.electronAPI.getProducts();
        products.forEach((product) => {
            const option = document.createElement("option");
            option.value = product.id;
            option.textContent = `${product.name} (${product.price.toLocaleString()} บาท)`;
            billProduct.appendChild(option);
        });
        window._products = products;
    } catch (err) {
        console.error("Failed to load products:", err);
        billProduct.innerHTML = '<option value="">โหลดสินค้าล้มเหลว</option>';
    }
}

function calculateTotal() {
    if (billPrice.value && billQuantity.value) {
        const price = parseFloat(billPrice.value);
        const quantity = parseInt(billQuantity.value);
        billTotal.value = (price * quantity).toFixed(2);
    }
}

function updateBillSummary() {
    const total = bills.reduce((sum, bill) => sum + bill.total, 0);
    totalAmount.value = total.toFixed(2);

    if (receivedAmount.value) {
        const received = parseFloat(receivedAmount.value);
        const change = received - total;
        changeAmount.value = change >= 0 ? change.toFixed(2) : "0.00";
    } else {
        changeAmount.value = "0.00";
    }
}

function renderBills() {
    billsTableBody.innerHTML = "";

    if (!bills.length) {
        billsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4">ไม่มีข้อมูล</td>
            </tr>
        `;
    } else {
        bills.forEach((bill, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${bill.productName}</td>
                <td>${bill.price.toLocaleString()}</td>
                <td>${bill.quantity}</td>
                <td><button class="delete-btn" data-id="${bill.id}">ลบ</button></td>
            `;
            billsTableBody.appendChild(row);
        });
    }

    updateBillSummary();

    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const id = parseInt(e.target.dataset.id);
            if (confirm("คุณแน่ใจที่จะลบรายการนี้?")) {
                bills = bills.filter((bill) => bill.id !== id);
                renderBills();
            }
        });
    });
}

billProduct.addEventListener("change", (e) => {
    const productId = parseInt(e.target.value);
    const selectedProduct = (window._products || []).find((p) => p.id === productId);

    if (selectedProduct) {
        billPrice.value = selectedProduct.price;
        calculateTotal();
    } else {
        billPrice.value = "";
        billTotal.value = "";
    }
});

billQuantity.addEventListener("input", calculateTotal);

createBillBtn.addEventListener("click", () => {
    loadProducts();
    billModal.style.display = "block";
});

closeBtn.addEventListener("click", () => {
    billModal.style.display = "none";
    billForm.reset();
});

window.addEventListener("click", (event) => {
    if (event.target === billModal) {
        billModal.style.display = "none";
        billForm.reset();
    }
});

billForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const productId = parseInt(billProduct.value);
    const quantity = parseInt(billQuantity.value);
    const price = parseFloat(billPrice.value);
    const total = parseFloat(billTotal.value);

    const selectedProduct = (window._products || []).find((p) => p.id === productId);

    if (selectedProduct) {
        const newBill = {
            id: bills.length ? Math.max(...bills.map((b) => b.id)) + 1 : 1,
            billNumber: randomBillNumber,
            date: today.toISOString(),
            productId: productId,
            productName: selectedProduct.name,
            price: price,
            quantity: quantity,
            total: total,
        };

        bills.push(newBill);
        renderBills();

        billModal.style.display = "none";
        billForm.reset();
    }
});

receivedAmount.addEventListener("input", updateBillSummary);

doneBtn.addEventListener("click", async () => {
    const total = parseFloat(totalAmount.value);
    const received = parseFloat(receivedAmount.value);
    const change = parseFloat(changeAmount.value);

    if (isNaN(total) || total <= 0) {
        alert("ไม่มีรายการสินค้าในบิล");
        return;
    }

    if (isNaN(received) || received < total) {
        alert("จำนวนเงินที่รับไม่เพียงพอ");
        return;
    }

    try {
        const billData = {
            billNumber: randomBillNumber,
            totalAmount: total,
            receivedAmount: received,
            changeAmount: change,
            items: bills.map(bill => ({
                productId: bill.productId,
                productName: bill.productName,
                price: bill.price,
                quantity: bill.quantity,
                total: bill.total
            }))
        };

        await window.electronAPI.createBill(billData);
        alert("บันทึกบิลเรียบร้อยแล้ว");
        window.location.reload();
    } catch (err) {
        console.error("Failed to save bill:", err);
        alert("เกิดข้อผิดพลาดในการบันทึกบิล");
    }
});

renderBills();