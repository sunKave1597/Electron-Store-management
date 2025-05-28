window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cost-form');
    const monthInput = document.getElementById('month');
    const costInput = document.getElementById('cost');
    const toast = document.getElementById('toast');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const month = monthInput.value;
        const cost = parseFloat(costInput.value);


        try {
            await window.api.saveMonthlyCost(month, cost);
            showToast("✅ บันทึกเรียบร้อย");
            form.reset();
            loadCosts();
        } catch (err) {
            alert('❌ บันทึกล้มเหลว');
            console.error(err);
        }
    });

    function showToast(message) {
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 2000);
    }
    async function loadCosts(filterText = '') {
        const rows = await window.api.getSummary();
        const body = document.getElementById('cost-table-body');
        body.innerHTML = '';

        rows.forEach(row => {
            if (!filterText || row.month.includes(filterText)) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                        <td>${row.month}</td>
                        <td>${row.total_cost}</td>
                    `;
                body.appendChild(tr);
            }
        });
    }

    document.getElementById('filterText').addEventListener('input', (e) => {
        loadCosts(e.target.value.trim());
    });

    loadCosts();

});
