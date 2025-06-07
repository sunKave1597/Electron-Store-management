document.addEventListener('DOMContentLoaded', () => {
  flatpickr("#monthPicker", {
    locale: "th",
    plugins: [new monthSelectPlugin({
      shorthand: true,
      dateFormat: "m/Y",
      altFormat: "F Y",
      theme: "light"
    })],
    onChange: function (selectedDates, dateStr, instance) {
      loadReportData(dateStr);
    }
  });

  const ctx = document.getElementById('salesChart').getContext('2d');
  const salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [], // Initial empty labels
      datasets: [{
        label: 'รายรับ', // Changed from 'รายได้'
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

  // Search functionality
  document.getElementById('searchBtn').addEventListener('click', () => {
    const date = document.getElementById('searchDate').value;
    const billNumber = document.getElementById('searchInput').value;
    searchReports(date, billNumber);
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('searchDate').value = '';
    document.getElementById('searchInput').value = '';
    loadReportData();
  });

  // Initial load
  loadReportData();
});

async function loadReportData(month = null) {
  try {
    // Fetch total income and expenses for the cards
    const incomeData = await window.electronAPI.getTotalIncome();
    const expenseData = await window.electronAPI.getTotalExpenses();

    const totalIncome = incomeData?.totalIncome ?? 0;
    const totalExpenses = expenseData?.totalExpenses ?? 0;
    const totalProfit = totalIncome - totalExpenses;

    document.getElementById('card-revenue-value').textContent = `${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`; // รายรับ
    document.getElementById('card-cost-value').textContent = `${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`; // ทุน
    document.getElementById('card-profit-value').textContent = `${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`; // กำไร

    // Fetch detailed data for chart and table (can be filtered by month)
    // The exact API and parameters might need adjustment based on main.js implementation
    const reportDetails = await window.electronAPI.getReportData(month);

    // Update chart
    const chart = Chart.getChart('salesChart');
    if (chart && reportDetails && reportDetails.chartData) {
      chart.data.labels = reportDetails.chartData.labels; // e.g., ['Day 1', 'Day 2', ...] or ['Week 1', ...]
      // Ensure the datasets exist before assigning data
      if (chart.data.datasets[0]) { // รายได้
        chart.data.datasets[0].data = reportDetails.chartData.revenue;
        chart.data.datasets[0].label = 'รายรับ'; // Update label to match card
      }
      if (chart.data.datasets[1]) { // กำไร
        chart.data.datasets[1].data = reportDetails.chartData.profit;
      }
      chart.update();
    }

    // Update table
    const tableBody = document.getElementById('reportTableBody');
    tableBody.innerHTML = ''; // Clear existing rows
    if (reportDetails && reportDetails.tableData) {
      tableBody.innerHTML = reportDetails.tableData.map(item => `
        <tr>
          <td>${item.date}</td>
          <td>${item.billNumber || '-'}</td>
          <td>${item.items}</td>
          <td>${item.quantity !== undefined ? item.quantity : '-'}</td>
          <td>${item.price !== undefined ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
          <td>${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td>${item.profit !== undefined ? item.profit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
        </tr>
      `).join('');
    }

  } catch (error) {
    console.error('Error loading report data:', error);
    // Display some error message to the user, e.g., by updating a status div
    document.getElementById('card-revenue-value').textContent = 'Error';
    document.getElementById('card-cost-value').textContent = 'Error';
    document.getElementById('card-profit-value').textContent = 'Error';
  }
}

function searchReports(date, billNumber) {
  // Here you would implement your search functionality
  console.log(`Searching for date: ${date}, bill number: ${billNumber}`);
  // You would typically filter your data or make an API call here
  // For now, this might call loadReportData with more specific filters if the API supports it
  // Or, if the dataset is small, client-side filtering could be done after a general loadReportData()
  // This aspect may need further refinement depending on API capabilities.
  // For this iteration, we assume loadReportData handles the main data loading,
  // and month is the primary filter it supports.
}