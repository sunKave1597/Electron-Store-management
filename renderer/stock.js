const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const productsTableBody = document.querySelector('#productsTable tbody');
    const searchInput = document.getElementById('searchInput');
    const addProductBtn = document.getElementById('addProductBtn');

    let products = [];

    // Load products
    function loadProducts() {
        ipcRenderer.invoke('get-products').then((rows) => {
            products = rows;

            renderTable();
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
        <td><button class="delete-btn" data-id="${product.id}">Delete</button></td>
      `;

            productsTableBody.appendChild(tr);
        });

        attachDeleteHandlers();
    }

    // Search handler
    searchInput.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });

    // Add product handler
    addProductBtn.addEventListener('click', () => {
        const name = prompt('Enter product name:');
        const quantity = parseInt(prompt('Enter product quantity:'));
        const price = parseInt(prompt('Enter product price:'));

        if (name && !isNaN(quantity) && !isNaN(price)) {
            ipcRenderer
                .invoke('add-product', name, quantity, price)
                .then(() => {
                    alert('Product added successfully!');
                    loadProducts();
                })
                .catch((err) => {
                    alert('Error adding product: ' + err.message);
                });
        }
    });

    // Delete button handlers
    function attachDeleteHandlers() {
        document.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);

                if (confirm('Are you sure you want to delete this product?')) {
                    ipcRenderer
                        .invoke('delete-product', id)
                        .then(() => {
                            alert('Product deleted successfully!');
                            loadProducts();
                        })
                        .catch((err) => {
                            alert('Error deleting product: ' + err.message);
                        });
                }
            });
        });
    }

    // Initial load
    loadProducts();
});