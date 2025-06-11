document.addEventListener('DOMContentLoaded', () => {
  const searchDate = document.getElementById('searchDate');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const clearBtn = document.getElementById('clearBtn');
  const monthPicker = document.getElementById('monthPicker');

  const profitValue = document.getElementById('card-profit-value');
  const costValue = document.getElementById('card-cost-value');
  const revenueValue = document.getElementById('card-revenue-value');
  const reportTableBody = document.getElementById('reportTableBody');
  let chart;

  flatpickr(monthPicker, {
    locale: 'th',
    plugins: [new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "F Y" })],
    onChange: ([date]) => {
      if (date) {
        loadDashboardData(date.toISOString().slice(0, 7)); 
      }
    }
  });

  searchBtn.addEventListener('click', async () => {
    const date = searchDate.value;
    const billNumber = searchInput.value;
    const rows = await window.electronAPI.getReportData({ date, billNumber });
    renderTable(rows);
  });

  clearBtn.addEventListener('click', () => {
    searchDate.value = '';
    searchInput.value = '';
    reportTableBody.innerHTML = '';
  });

  async function loadDashboardData(month) {
    const data = await window.electronAPI.getDashboardData(month);

    revenueValue.textContent = `${formatBaht(data.summary?.income || 0)} บาท`;
    const cost = (data.summary?.income || 0) * 0.4;
    const profit = (data.summary?.income || 0) - cost;

    costValue.textContent = `${formatBaht(cost)} บาท`;
    profitValue.textContent = `${formatBaht(profit)} บาท`;

    drawChart(data.daily);
  }

  function renderTable(rows) {
    reportTableBody.innerHTML = '';
    rows.forEach(row => {
      const tr = document.createElement('tr');
      const cost = row.amount * 0.4;
      const profit = row.amount - cost;

      tr.innerHTML = `
        <td>${row.date}</td>
        <td>${row.bill_number}</td>
        <td>${row.item}</td>
        <td>1</td>
        <td>${formatBaht(row.amount)}</td>
        <td>${formatBaht(row.amount)}</td>
        <td>${formatBaht(profit)}</td>
      `;
      reportTableBody.appendChild(tr);
    });
  }

  function drawChart(dailyData) {
    const labels = dailyData.map(d => d.day);
    const values = dailyData.map(d => d.income);

    if (chart) chart.destroy();

    const ctx = document.getElementById('salesChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'รายได้รายวัน',
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.7)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => `${value} บ.`
            }
          }
        }
      }
    });
  }

  function formatBaht(number) {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  }

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // yyyy-mm
  monthPicker.value = currentMonth;
  loadDashboardData(currentMonth);
});
