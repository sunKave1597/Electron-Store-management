document.addEventListener('DOMContentLoaded', () => {
    const productsTableBody = document.querySelector('#productsTable tbody');
    const searchInput = document.getElementById('searchInput');
    const addProductBtn = document.getElementById('addProductBtn');
    const modal = document.getElementById('productModal');
    const closeBtn = document.querySelector('.close');
    const productForm = document.getElementById('productForm');
    const backBtn = document.getElementById('backBtn');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.navigateToPage) {
                window.electronAPI.navigateToPage('menu.html').catch(err => console.error('Navigation error:', err));
            } else {
                console.error('electronAPI.navigateToPage is not available.');
                // Fallback or error message
            }
        });
    }

    let products = [];

    addProductBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('productName').value;
        const quantity = parseInt(document.getElementById('productQuantity').value);
        const price = parseFloat(document.getElementById('productPrice').value);

        if (name && !isNaN(quantity) && !isNaN(price)) {
            window.electronAPI.addProduct(name, quantity, price)
                .then(() => {
                    alert('เพิ่มสินค้าเสร็จสิ้น');
                    modal.style.display = 'none';
                    productForm.reset();
                    loadProducts();
                })
                .catch((err) => {
                    alert('ผิดพลาดสินค้า: ' + err.message);
                });
        } else {
            alert('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
        } s
    });

    // Load products
    function loadProducts() {
        window.electronAPI.getProducts().then((rows) => {
            products = rows;
            renderTable();
        }).catch((err) => {
            console.error('โหลดข้อมูลผิดพลาด:', err);
            alert('โหลดข้อมูลผิดพลาด: ' + err.message);
        });
    }

    // Render filtered/sorted table
    function renderTable(filter = '') {
        productsTableBody.innerHTML = '';

        const filtered = products.filter((p) =>
            p.name.toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach((product, index) => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>${product.price}</td>
                <td><button class="delete-btn" data-id="${product.id}">ลบ</button></td>
            `;

            productsTableBody.appendChild(tr);
        });

        attachDeleteHandlers();
    }

    // Search handler
    searchInput.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });

    // Delete button handlers
    function attachDeleteHandlers() {
        document.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);

                if (confirm('คุณแน่ใจว่าต้องการลบสินค้านี้?')) {
                    window.electronAPI.deleteProduct(id)
                        .then(() => {
                            alert('ลบสินค้าสำเร็จ');
                            loadProducts();
                        })
                        .catch((err) => {
                            alert('ผิดพลาด: ' + err.message);
                        });
                }
            });
        });
    }

    // Initial load
    loadProducts();
});