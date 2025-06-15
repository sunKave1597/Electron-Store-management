document.addEventListener('DOMContentLoaded', () => {
  const searchDate = document.getElementById('searchDate');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const clearBtn = document.getElementById('clearBtn');
  const monthPicker = document.getElementById('monthPicker');
  const backBtn = document.getElementById('backBtn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.electronAPI && window.electronAPI.navigateToPage) {
        window.electronAPI.navigateToPage('menu.html').catch(err => console.error('Navigation error:', err));
      } else {
        console.error('electronAPI.navigateToPage is not available.');
      }
    });
  }

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
    try {
      const rows = await window.electronAPI.getReportData({ date, billNumber });
      renderTable(rows);
    } catch (error) {
      console.error('Error fetching report data:', error);
      reportTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
      // Optionally, display a more user-friendly error message elsewhere on the page
    }
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
    reportTableBody.innerHTML = ''; // Clear existing rows

    if (!Array.isArray(rows) || rows.length === 0) {
      const tr = reportTableBody.insertRow();
      const td = tr.insertCell();
      td.colSpan = 7; // Corresponds to the number of columns
      td.textContent = 'ไม่พบข้อมูล';
      td.style.textAlign = 'center';
      return;
    }

    rows.forEach(row => {
      const tr = reportTableBody.insertRow();
      tr.innerHTML = `
        <td>${row.date || 'N/A'}</td>
        <td>${row.bill_number || 'N/A'}</td>
        <td>${row.product_name || 'N/A'}</td>
        <td>${row.quantity !== null && row.quantity !== undefined ? row.quantity : 'N/A'}</td>
        <td>${row.price !== null && row.price !== undefined ? formatBaht(row.price) : 'N/A'}</td>
        <td>${row.total !== null && row.total !== undefined ? formatBaht(row.total) : 'N/A'}</td>
        <td>N/A</td> {/* Profit column as per requirement */}
      `;
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
