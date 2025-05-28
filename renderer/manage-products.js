window.addEventListener('DOMContentLoaded', async () => {
    const nameInput = document.getElementById('name');
    const sellInput = document.getElementById('sell');
    const addBtn = document.getElementById('addBtn');
    const searchInput = document.getElementById('search');
    const list = document.getElementById('product-list');

    let allProducts = [];

    async function loadProducts() {
        allProducts = await window.api.getProducts();
        renderProducts(allProducts);
    }

    function renderProducts(products) {
        list.innerHTML = '';
        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.sell_price} ฿</td>
        <td><button type="button" class="remove-item-btn">🗑 ลบ</button></td>
      `;
            tr.querySelector('.remove-item-btn').addEventListener('click', async () => {
                await window.api.deleteProduct(p.id);
                loadProducts();
            });
            list.appendChild(tr);
        });
    }

    addBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const sell = parseFloat(sellInput.value);

        if (!name || isNaN(sell) || sell < 0) {
            alert('กรุณากรอกข้อมูลให้ถูกต้อง');
            return;
        }

        await window.api.addProduct(name, sell);
        nameInput.value = '';
        sellInput.value = '';
        nameInput.focus();
        showToast("✅ บันทึกเรียบร้อย");
        await loadProducts();
    });
    function showToast(message) {
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 2000);
    }
    searchInput.addEventListener('input', () => {
        const keyword = searchInput.value.toLowerCase();
        const filtered = allProducts.filter(p =>
            p.name.toLowerCase().includes(keyword)
        );
        renderProducts(filtered);
    });

    loadProducts();
});
