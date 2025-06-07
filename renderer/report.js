document.addEventListener('DOMContentLoaded', () => {
  const monthPicker = flatpickr("#monthPicker", {
    locale: "th",
    plugins: [new monthSelectPlugin({
      dateFormat: "m/Y",
      altFormat: "F Y",
      theme: "light"
    })],
    onChange: function (selectedDates, dateStr, instance) {
      loadReportData(dateStr);
    }
  });

  const ctx = document.getElementById('salesChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'รายรับ',
        data: [],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }, {
        label: 'กำไร',
        data: [],
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  document.getElementById('searchBtn').addEventListener('click', () => {
    const date = document.getElementById('searchDate').value;
    const billNumber = document.getElementById('searchInput').value;
    searchReports(date, billNumber);
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('searchDate').value = '';
    document.getElementById('searchInput').value = '';
    const now = new Date();
    const currentMonthStr = `${now.getMonth() + 1}/${now.getFullYear()}`;
    monthPicker.setDate(now, false);
    loadReportData(currentMonthStr);
  });

  // Initial load for the current month
  const now = new Date();
  const currentMonthStr = `${now.getMonth() + 1}/${now.getFullYear()}`;
  monthPicker.setDate(now, false); // Set picker to current month
  loadReportData(currentMonthStr); // Load data for the current month
});

async function loadReportData(month = null) {
  try {
    const incomeData = await window.electronAPI.getTotalIncome();
    const expenseData = await window.electronAPI.getTotalExpenses();

    const totalIncome = incomeData?.totalIncome ?? 0;
    const totalExpenses = expenseData?.totalExpenses ?? 0;
    const totalProfit = totalIncome - totalExpenses;

    document.getElementById('card-revenue-value').textContent = `${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`;
    document.getElementById('card-cost-value').textContent = `${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`;
    document.getElementById('card-profit-value').textContent = `${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`;

    const reportDetails = await window.electronAPI.getReportData(month);

    const chart = Chart.getChart('salesChart');
    if (chart && reportDetails && reportDetails.chartData) {
      chart.data.labels = reportDetails.chartData.labels;
      if (chart.data.datasets[0]) {
        chart.data.datasets[0].data = reportDetails.chartData.revenue;
        chart.data.datasets[0].label = 'รายรับ';
      }
      if (chart.data.datasets[1]) {
        chart.data.datasets[1].data = reportDetails.chartData.profit;
      }
      chart.update();
    }

    const tableBody = document.getElementById('reportTableBody');
    tableBody.innerHTML = '';
    if (reportDetails && reportDetails.tableData) {
      tableBody.innerHTML = reportDetails.tableData.map(item => {
        // Format date from YYYY-MM-DD to DD/MM/YYYY for display
        const dateParts = item.date.split('-');
        const displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        return `
        <tr>
          <td>${displayDate}</td>
          <td>${item.billNumber || '-'}</td>
          <td>${item.items}</td>
          <td>${item.quantity !== undefined && item.quantity !== null ? item.quantity : '-'}</td>
          <td>${item.price !== undefined && item.price !== null ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
          <td>${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td>${item.profit !== undefined && item.profit !== null ? item.profit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
        </tr>
      `}).join('');
    }

  } catch (error) {
    console.error('Error loading report data:', error);
    document.getElementById('card-revenue-value').textContent = 'Error';
    document.getElementById('card-cost-value').textContent = 'Error';
    document.getElementById('card-profit-value').textContent = 'Error';
  }
}

function searchReports(date, billNumber) {
  console.log(`Searching for date: ${date}, bill number: ${billNumber}`);
  // This function would need an IPC handler and DB query to be fully implemented.
}