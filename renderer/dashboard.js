let currentChartType = 'income';

window.addEventListener('DOMContentLoaded', async () => {
  const table = document.getElementById('summary-table');
  const rows = await window.api.getSummary();

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${row.total_revenue} ฿</td>
      <td>${row.profit} ฿</td>
    `;
    table.appendChild(tr);
  });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthPicker = document.getElementById('monthPicker');
  monthPicker.value = currentMonth;
  loadCharts(currentMonth);
  loadTopProductChart(currentMonth);
});

document.getElementById('monthPicker').addEventListener('change', (e) => {
  loadCharts(e.target.value);
});

async function loadCharts(month) {
  const { monthlySummary, dailySummary } = await window.api.getDashboardData(month);

  const selectedMonthData = monthlySummary.find(row => row.label === month) || {
    income: 0, cost: 0, profit: 0
  };
  document.getElementById('card-income-value').textContent =
    `${selectedMonthData.income.toLocaleString()} บาท`;
  document.getElementById('card-cost-value').textContent =
    `${selectedMonthData.cost.toLocaleString()} บาท`;
  const profitElem = document.getElementById('card-profit-value');
  profitElem.textContent = `${selectedMonthData.profit.toLocaleString()} บาท`;
  profitElem.style.color = selectedMonthData.profit < 0 ? 'red' : 'green';
  drawLineChart('dailyChart', dailySummary, 'รายวัน');
}


function drawLineChart(canvasId, data, label) {
  const ctx = document.getElementById(canvasId).getContext('2d');

  if (window[canvasId] && typeof window[canvasId].destroy === 'function') {
    window[canvasId].destroy();
  }

  const chartData = data.map(row => ({
    x: Number(row.label),
    y: row[currentChartType] || 0
  }));

  window[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: `${label} (${currentChartType})`,
        data: chartData,
        borderColor: 'rgba(46, 204, 113, 1)',
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
        tension: 0.3,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'วันในเดือน'
          },
          min: 1,
          max: 31,
          ticks: {
            stepSize: 1,
            callback: value => `${value}`
          }
        },
        y: {
          beginAtZero: true,
          ticks: { font: { size: 14 } }
        }
      }
    }
  });
}


async function loadTopProductChart(month) {
  const data = await window.api.getTopProducts(month);
  drawTopProductPie('topProductChart', data);
}

function drawTopProductPie(canvasId, data) {
  const ctx = document.getElementById(canvasId).getContext('2d');

  if (window[canvasId] && typeof window[canvasId].destroy === 'function') {
    window[canvasId].destroy();
  }

  const labels = data.map(row => row.label);
  const values = data.map(row => row.quantity);

  window[canvasId] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56',
          '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.raw || 0;
              return `${label}: ${value} ชิ้น`;
            }
          }
        }
      }
    }
  });

}
