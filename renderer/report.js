const monthPicker = document.getElementById('monthPicker');
const incomeEl = document.getElementById('card-income-value');
const profitEl = document.getElementById('card-profit-value');
const costEl = document.getElementById('card-cost-value');

let dailyChart, topProductChart;

flatpickr(monthPicker, {
  dateFormat: 'Y-m',
  defaultDate: new Date(),
  onChange: async ([date]) => {
    if (date) {
      const month = date.toISOString().slice(0, 7);
      await loadDashboard(month);
    }
  },
});

document.addEventListener('DOMContentLoaded', async () => {
  const todayMonth = new Date().toISOString().slice(0, 7);
  await loadDashboard(todayMonth);
  await loadSummaryTable();
});

async function loadDashboard(month) {
  const { daily, summary, topProducts } = await window.electronAPI.getDashboardData(month);

  incomeEl.textContent = `${summary.income.toLocaleString()} บาท`;
  profitEl.textContent = `${summary.profit.toLocaleString()} บาท`;
  costEl.textContent = `${summary.cost.toLocaleString()} บาท`;

  updateDailyChart(daily);
  updateTopProductChart(topProducts);
}

function updateDailyChart(data) {
  const labels = data.map(d => d.day);
  const values = data.map(d => d.income);

  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(document.getElementById('dailyChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'รายได้ (บาท)',
        data: values,
        borderColor: 'green',
        backgroundColor: 'lightgreen',
        tension: 0.3
      }]
    }
  });
}

function updateTopProductChart(data) {
  const labels = data.map(p => p.name);
  const values = data.map(p => p.total);

  if (topProductChart) topProductChart.destroy();
  topProductChart = new Chart(document.getElementById('topProductChart'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'จำนวนที่ขายได้',
        data: values,
        backgroundColor: ['#6cc', '#9cf', '#fc9', '#f99', '#9f9'],
      }]
    }
  });
}

async function loadSummaryTable() {
  const tableBody = document.getElementById('summary-table');
  const data = await window.electronAPI.getMonthlySummary(); 
  tableBody.innerHTML = data.map(row => `
    <tr>
      <td>${row.month}</td>
      <td>${row.income.toLocaleString()}</td>
      <td style="color:${row.profit >= 0 ? 'green' : 'red'}">
        ${row.profit.toLocaleString()}
      </td>
    </tr>
  `).join('');
}
