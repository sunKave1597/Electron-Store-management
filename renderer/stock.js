document.addEventListener('DOMContentLoaded', () => {
    const productsTableBody = document.querySelector('#productsTable tbody');
    const searchInput = document.getElementById('searchInput');
    const addProductBtn = document.getElementById('addProductBtn');
    const modal = document.getElementById('productModal');
    const closeBtn = document.querySelector('.close');
    const productForm = document.getElementById('productForm');
    const backBtn = document.getElementById('backBtn');

    let currentUserRole = null; // Variable to store the user's role

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

    // Fetch current user session to get the role
    if (window.electronAPI && window.electronAPI.getCurrentUserSession) {
        window.electronAPI.getCurrentUserSession().then(session => {
            if (session && session.role) {
                currentUserRole = session.role;
                console.log('Current user role:', currentUserRole);
                // Initial load and UI adjustments after fetching role
                loadProducts();
                adjustUIForRole();
            } else {
                console.error('Could not retrieve user session or role.');
                // Fallback if session or role is not available, load products anyway
                loadProducts();
            }
        }).catch(err => {
            console.error('Error fetching user session:', err);
            // Fallback in case of error, load products anyway
            loadProducts();
        });
    } else {
        console.error('electronAPI.getCurrentUserSession is not available.');
        loadProducts();
    }

    function adjustUIForRole() {
        if (currentUserRole === 'staff') {
            if (addProductBtn) {
                addProductBtn.style.display = 'none';
            }
            const manageHeader = document.getElementById('manageHeader');
            if (manageHeader) {
                manageHeader.style.display = 'none';
            }
        }
    }

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
            let rowHTML = `
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>${product.price}</td>
            `;

            if (currentUserRole !== 'staff') {
                rowHTML += `<td><button class="delete-btn" data-id="${product.id}">ลบ</button></td>`;
            } else {

            }

            tr.innerHTML = rowHTML;
            productsTableBody.appendChild(tr);
        });

        if (currentUserRole !== 'staff') {
            attachDeleteHandlers();
        }
    }

    searchInput.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });

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

});