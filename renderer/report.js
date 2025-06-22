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
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // บวก 1 เพราะ getMonth() เริ่มที่ 0
        const formatted = `${year}-${month}`;
        loadDashboardData(formatted);
      }
    }
  });
  const monthRange = document.getElementById('monthRange');

  flatpickr(monthRange, {
    locale: 'th',
    mode: 'range',
    plugins: [new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "F Y" })],
  });
  searchMTableBtn.addEventListener('click', async () => {
    const range = monthRange.value.split(' ถึง ');
    const startMonth = range[0];
    const endMonth = range[1];

    const rows = await window.electronAPI.getReportData({ startMonth, endMonth });
    renderTable(rows);
  });
  clearBtnMtableBtn.addEventListener('click', () => {
    monthRange.value = '';
    loadAllReports();
  });

  searchBtn.addEventListener('click', async () => {
    const date = searchDate.value;
    const billNumber = searchInput.value;
    const rows = await window.electronAPI.getReportData({ date, billNumber });
    console.log(rows);
    renderTable(rows);
  });


  clearBtn.addEventListener('click', () => {
    searchDate.value = '';
    searchInput.value = '';
    loadAllReports(); // โหลดข้อมูลใหม่ทั้งหมด
  });


  async function loadDashboardData(month) {
    const data = await window.electronAPI.getDashboardData(month);

    revenueValue.textContent = `${formatBaht(data.summary?.income || 0)} บาท`;
    const cost = data.cost?.total || 0;
    const profit = (data.summary?.income || 0) - cost;

    costValue.textContent = `${formatBaht(cost)} บาท`;
    profitValue.textContent = `${formatBaht(profit)} บาท`;

    drawChart(data.daily);
  }

  function renderTable(rows) {
    reportTableBody.innerHTML = '';
    rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
      <td>${row.month}</td>
      <td>${row.bill_count}</td>
      <td>${formatBaht(row.total_income)}</td>
      <td>${formatBaht(row.total_cost)}</td>
      <td>${formatBaht(row.total_profit)}</td>
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
  const currentMonth = now.toISOString().slice(0, 7);
  monthPicker.value = currentMonth;
  loadDashboardData(currentMonth);

  async function loadAllReports() {
    const rows = await window.electronAPI.getReportData({ date: '', billNumber: '' });
    renderTable(rows);
  }
  loadAllReports();
});