document.addEventListener('DOMContentLoaded', () => {
    const productsTableBody = document.querySelector('#productsTable tbody');
    const searchInput = document.getElementById('searchInput');
    const addProductBtn = document.getElementById('addProductBtn');
    const modal = document.getElementById('productModal');
    const closeBtn = document.querySelector('.close');
    const productForm = document.getElementById('productForm');

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
                    alert('Product added successfully!');
                    modal.style.display = 'none';
                    productForm.reset();
                    loadProducts();
                })
                .catch((err) => {
                    alert('Error adding product: ' + err.message);
                });
        } else {
            alert('Please fill all fields with valid values');
        }
    });

    // Load products
    function loadProducts() {
        window.electronAPI.getProducts().then((rows) => {
            products = rows;
            renderTable();
        }).catch((err) => {
            console.error('Failed to load products:', err);
            alert('Failed to load products: ' + err.message);
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

    // Delete button handlers
    function attachDeleteHandlers() {
        document.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);

                if (confirm('Are you sure you want to delete this product?')) {
                    window.electronAPI.deleteProduct(id)
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