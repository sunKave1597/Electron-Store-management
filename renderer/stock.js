document.addEventListener('DOMContentLoaded', () => {
    const productsTableBody = document.querySelector('#productsTable tbody');
    const searchInput = document.getElementById('searchInput');
    const addProductBtn = document.getElementById('addProductBtn');
    const modal = document.getElementById('productModal');
    const closeBtn = document.querySelector('.close');
    const productForm = document.getElementById('productForm');
    const backBtn = document.getElementById('backBtn');
    const updateQtyBtn = document.getElementById('updateQtyBtn');
    const saveBtn = document.getElementById('saveBtn');

    let currentUserRole = null;
    let products = [];
    let editingProductId = null;

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.navigateToPage) {
                window.electronAPI.navigateToPage('menu.html').catch(err => console.error('Navigation error:', err));
            }
        });
    }

    if (window.electronAPI?.getCurrentUserSession) {
        window.electronAPI.getCurrentUserSession().then(session => {
            currentUserRole = session?.role || null;
            loadProducts();
            adjustUIForRole();
        }).catch(() => loadProducts());
    } else {
        loadProducts();
    }

    function adjustUIForRole() {
        if (currentUserRole === 'staff') {
            addProductBtn.style.display = 'none';
            document.getElementById('manageHeader').style.display = 'none';
        }
    }

addProductBtn.addEventListener('click', () => {
  editingProductId = null;
  productForm.reset();

  document.getElementById('productName').disabled = false;
  document.getElementById('productPrice').disabled = false;

  saveBtn.style.display = 'inline-block';
  updateQtyBtn.style.display = 'none';

  modal.style.display = 'block';
});


    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.style.display = 'none';
    });

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (editingProductId !== null) return;

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
        }
    });

updateQtyBtn.addEventListener('click', () => {
  const quantity = parseInt(document.getElementById('productQuantity').value);

  if (!isNaN(quantity) && editingProductId !== null) {
    window.electronAPI.updateProductQuantity(editingProductId, quantity)
      .then(() => {
        alert('อัปเดตจำนวนสำเร็จ');
        modal.style.display = 'none';
        editingProductId = null;
        productForm.reset();
        loadProducts();
      })
      .catch((err) => {
        alert('อัปเดตผิดพลาด: ' + err.message);
      });
  } else {
    alert('กรุณากรอกจำนวนที่ถูกต้อง');
  }
});


    function loadProducts() {
        window.electronAPI.getProducts().then((rows) => {
            products = rows;
            renderTable();
        }).catch((err) => {
            alert('โหลดข้อมูลผิดพลาด: ' + err.message);
        });
    }

    function renderTable(filter = '') {
        productsTableBody.innerHTML = '';
        const filtered = products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));

        filtered.forEach((product, index) => {
            const tr = document.createElement('tr');
            let rowHTML = `
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>${product.price}</td>
            `;

            if (currentUserRole !== 'staff') {
                rowHTML += `
                    <td>
                        <button class="edit-btn" data-id="${product.id}" data-index="${index}">แก้ไขจำนวน</button>
                        <button class="delete-btn" data-id="${product.id}">ลบ</button>
                    </td>
                `;
            }

            tr.innerHTML = rowHTML;
            productsTableBody.appendChild(tr);
        });

        if (currentUserRole !== 'staff') {
            attachDeleteHandlers();
            attachEditHandlers();
        }
    }

    function attachEditHandlers() {
  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      const product = products[index];

      editingProductId = product.id;

      // ตั้งค่าฟอร์ม
      document.getElementById('productName').value = product.name;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productQuantity').value = product.quantity;

      // ห้ามแก้ชื่อและราคา
      document.getElementById('productName').disabled = true;
      document.getElementById('productPrice').disabled = true;

      // toggle ปุ่ม
      saveBtn.style.display = 'none';
      updateQtyBtn.style.display = 'inline-block';

      // แสดง modal
      modal.style.display = 'block';
    });
  });
}


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

    searchInput.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });
});
