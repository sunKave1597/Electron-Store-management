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

// Current date and bill number
const today = new Date();
const options = { year: "numeric", month: "2-digit", day: "2-digit" };
currentDateElement.textContent = today.toLocaleDateString(
    "th-TH",
    options
);

// Generate a random bill number for demo (in real app, get from database)
const randomBillNumber =
    "BILL-" + Math.floor(1000 + Math.random() * 9000);
billNumberElement.textContent = randomBillNumber;

// Mocked products data (in real app, get from database)
let products = [
    { id: 1, name: "สินค้า A", price: 150.0, quantity: 10 },
    { id: 2, name: "สินค้า B", price: 300.0, quantity: 5 },
    { id: 3, name: "สินค้า C", price: 200.0, quantity: 8 },
];

// Mocked bills data
let bills = [];

// Load products into select dropdown
function loadProducts() {
    billProduct.innerHTML = '<option value="">เลือกสินค้า</option>';
    products.forEach((product) => {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = `${product.name
            } (${product.price.toLocaleString()} บาท)`;
        billProduct.appendChild(option);
    });
}

// Product selection change handler
billProduct.addEventListener("change", (e) => {
    const productId = parseInt(e.target.value);
    const selectedProduct = products.find((p) => p.id === productId);

    if (selectedProduct) {
        billPrice.value = selectedProduct.price;
        calculateTotal();
    } else {
        billPrice.value = "";
        billTotal.value = "";
    }
});

// Quantity change handler
billQuantity.addEventListener("input", calculateTotal);

function calculateTotal() {
    if (billPrice.value && billQuantity.value) {
        const price = parseFloat(billPrice.value);
        const quantity = parseInt(billQuantity.value);
        billTotal.value = (price * quantity).toFixed(2);
    }
}

// Modal handlers
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

// Form submission
billForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const productId = parseInt(billProduct.value);
    const quantity = parseInt(billQuantity.value);
    const price = parseFloat(billPrice.value);
    const total = parseFloat(billTotal.value);

    const selectedProduct = products.find((p) => p.id === productId);

    if (selectedProduct) {
        // In real app, save to database via Electron API
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

        alert("บันทึกบิลเรียบร้อยแล้ว");
        billModal.style.display = "none";
        billForm.reset();
    }
});

// Render bills table
function renderBills() {
    billsTableBody.innerHTML = "";

    if (!bills.length) {
        billsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-4">ไม่มีข้อมูล</td>
      </tr>
    `;
        return;
    }

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

    // Attach delete handlers
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

// Initial render
renderBills();