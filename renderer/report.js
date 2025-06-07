document.addEventListener('DOMContentLoaded', () => {
  // Initialize date picker for month selection
  flatpickr("#monthPicker", {
    locale: "th",
    plugins: [new monthSelectPlugin({
      shorthand: true,
      dateFormat: "m/Y",
      altFormat: "F Y",
      theme: "light"
    })],
    onChange: function (selectedDates, dateStr, instance) {
      // Handle month change
      loadReportData(dateStr);
    }
  });

  // Initialize chart
  const ctx = document.getElementById('salesChart').getContext('2d');
  const salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'รายได้',
        data: [0, 0, 0, 0],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }, {
        label: 'กำไร',
        data: [0, 0, 0, 0],
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

function loadReportData(month = null) {
  // Here you would typically fetch data from your database/API
  // For now, we'll use mock data
  const mockData = {
    profit: 12500,
    cost: 7500,
    revenue: 20000,
    chartData: {
      weeks: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      revenue: [3000, 5000, 7000, 5000],
      profit: [1000, 2000, 3000, 2000]
    },
    tableData: [
      { date: '2023-05-01', billNumber: 'B1001', items: 'Product A', quantity: 2, price: 500, total: 1000, profit: 300 },
      { date: '2023-05-02', billNumber: 'B1002', items: 'Product B', quantity: 1, price: 1200, total: 1200, profit: 400 },
      // More data...
    ]
  };

  // Update cards
  document.getElementById('card-profit-value').textContent = `${mockData.profit.toLocaleString()} บาท`;
  document.getElementById('card-cost-value').textContent = `${mockData.cost.toLocaleString()} บาท`;
  document.getElementById('card-revenue-value').textContent = `${mockData.revenue.toLocaleString()} บาท`;

  // Update chart
  const chart = Chart.getChart('salesChart');
  chart.data.labels = mockData.chartData.weeks;
  chart.data.datasets[0].data = mockData.chartData.revenue;
  chart.data.datasets[1].data = mockData.chartData.profit;
  chart.update();

  // Update table
  const tableBody = document.getElementById('reportTableBody');
  tableBody.innerHTML = mockData.tableData.map(item => `
    <tr>
      <td>${item.date}</td>
      <td>${item.billNumber}</td>
      <td>${item.items}</td>
      <td>${item.quantity}</td>
      <td>${item.price.toLocaleString()}</td>
      <td>${item.total.toLocaleString()}</td>
      <td>${item.profit.toLocaleString()}</td>
    </tr>
  `).join('');
}

function searchReports(date, billNumber) {
  // Here you would implement your search functionality
  console.log(`Searching for date: ${date}, bill number: ${billNumber}`);
  // You would typically filter your data or make an API call here
}