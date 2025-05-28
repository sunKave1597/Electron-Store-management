window.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("income-form");
    const dateInput = document.getElementById("date");
    const itemsContainer = document.getElementById("items-container");
    const addBtn = document.getElementById("add-item-btn");
    const toast = document.getElementById("toast");

    function showToast(message, focusElement = null) {
        if (!toast) {
            console.warn("Toast element not found!");
            return;
        }
        toast.textContent = message;
        toast.style.display = "block";
        setTimeout(() => {
            toast.style.display = "none";
            if (focusElement) focusElement.focus();
        }, 2000);
    }

    let products = [];
    try {
        products = await window.api.getProducts();
    } catch (err) {
        console.error("❌ Failed to load products:", err);
        showToast("โหลดข้อมูลสินค้าล้มเหลว");
        return;
    }

    function getProductOptions() {
        return products
            .map(
                (p) => `
            <option value="${p.name}" data-sell="${p.sell_price}">
                ${p.name} (ขาย ${p.sell_price})
            </option>
        `
            )
            .join("");
    }

    function createItemRow() {
        const item = document.createElement("div");
        item.classList.add("item-row");
        item.innerHTML = `
            <select class="product-select" required>${getProductOptions()}</select>
            <input type="number" class="qty" placeholder="จำนวน" min="1" required>
            <input type="number" class="sell-price" placeholder="ราคาขาย" required>
            <button type="button" class="remove-item-btn">🗑</button>
        `;

        setupItemEvents(item);

        const qtyInput = item.querySelector(".qty");
        qtyInput.addEventListener("input", () => {
            if (qtyInput.value <= 0) {
                showToast("จำนวนต้องมากกว่า 0", qtyInput);
            }
        });

        return item;
    }

    function setupItemEvents(item) {
        const select = item.querySelector(".product-select");
        const sellInput = item.querySelector(".sell-price");
        const selected = select.options[select.selectedIndex];
        if (selected && selected.dataset.sell) {
            sellInput.value = selected.dataset.sell;
        }

        select.addEventListener("change", () => {
            const selectedOption = select.options[select.selectedIndex];
            sellInput.value = selectedOption?.dataset.sell || "";
        });

        item.querySelector(".remove-item-btn").addEventListener("click", () => {
            const rows = itemsContainer.querySelectorAll(".item-row");
            if (rows.length > 1) {
                item.remove();
            } else {
                showToast("ต้องมีอย่างน้อย 1 รายการ");
            }
        });
    }

    function clearForm() {
        dateInput.value = "";
        itemsContainer.innerHTML = "";
        itemsContainer.appendChild(createItemRow());
    }

    clearForm();

    addBtn.addEventListener("click", () => {
        itemsContainer.appendChild(createItemRow());
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const date = dateInput.value;
        if (!date) {
            showToast("กรุณาเลือกวันที่");
            return;
        }

        const entries = [];
        const rows = itemsContainer.querySelectorAll(".item-row");

        rows.forEach((row) => {
            const productName = row.querySelector(".product-select").value;
            const quantity = parseInt(row.querySelector(".qty").value);
            const sellPrice = parseInt(row.querySelector(".sell-price").value);

            if (productName && quantity > 0 && !isNaN(sellPrice)) {
                entries.push({
                    date,
                    product_name: productName,
                    quantity,
                    sell_price: sellPrice,
                });
            }
        });

        if (entries.length === 0) {
            showToast("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        try {
            await window.api.addIncome(entries);
            showToast("✅ บันทึกเรียบร้อย");
            const [year, month] = date.split('-');
            loadIncomeHistory(`${year}-${month}`);

            clearForm();
        } catch (err) {
            console.error("❌ เกิดข้อผิดพลาดในการบันทึก:", err);
            showToast("❌ เกิดข้อผิดพลาดในการบันทึก");
        }
    });

    flatpickr("#month-filter", {
        plugins: [
            new monthSelectPlugin({
                shorthand: true,
                dateFormat: "Y-m",
                altFormat: "F Y",
            }),
        ],
        locale: "th",
        onReady: function (selectedDates, dateStr, instance) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const currentMonth = `${year}-${month}`;
            instance.setDate(currentMonth, true);
            loadIncomeHistory(currentMonth);
        },
    });

    document.getElementById("month-filter").addEventListener("change", (e) => {
        const value = e.target.value;
        loadIncomeHistory(value);
    });

    async function loadIncomeHistory(month = null) {
        const rows = await window.api.getIncomeEntries(month);
        const table = document.getElementById("history-table");
        const totalEl = document.getElementById("month-total");

        table.innerHTML = "";
        let totalMonth = 0;

        if (!rows || rows.length === 0) {
            table.innerHTML = `<tr><td colspan="6">ไม่พบข้อมูล</td></tr>`;
            if (totalEl) totalEl.textContent = "รวมทั้งหมด: 0 บาท";
            return;
        }

        rows.forEach(row => {
            const total = row.quantity * row.sell_price;
            totalMonth += total;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.date}</td>
                <td>${row.product_name}</td>
                <td>${row.quantity}</td>
                <td>${row.sell_price}</td>
                <td>${total}</td>
                <td>
                    <button class="delete-entry-btn" data-id="${row.id}" style="background-color: #e74c3c; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">
                        ลบ
                    </button>
                </td>
            `;
            table.appendChild(tr);
        });

        if (totalEl) totalEl.textContent = `รวมทั้งหมด: ${totalMonth.toLocaleString()} บาท`;

        // ✅ ใส่ตรงนี้เลย
        const deleteButtons = table.querySelectorAll('.delete-entry-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const confirmed = confirm("แน่ใจนะว่าจะลบรายการนี้?");
                if (!confirmed) return;

                try {
                    await window.api.deleteIncomeEntry(id);
                    showToast("🗑 ลบรายการเรียบร้อย");
                    loadIncomeHistory(document.getElementById('month-filter').value);
                } catch (err) {
                    console.error("❌ ลบไม่สำเร็จ:", err);
                    showToast("❌ ลบไม่สำเร็จ");
                }
            });
        });
    }

});
