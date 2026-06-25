import { useBudget, MONTHS, fmt, fmtCompact, getSectionTotal, getActualSectionTotal, getActualByCategory, getBudgetValue } from '../store.jsx';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10 } },
};

export default function Dashboard() {
  const { state } = useBudget();
  const { budget, transactions, categories, settings, selectedYear, selectedMonth } = state;
  const { currency } = settings;

  const year = selectedYear;
  const month = selectedMonth;
  const incCats = categories.income;
  const expCats = categories.expense;
  const savCats = categories.savings;

  // Monthly totals
  const budgetIncome = getSectionTotal(budget, year, incCats, month);
  const budgetExpenses = getSectionTotal(budget, year, expCats, month);
  const budgetSavings = getSectionTotal(budget, year, savCats, month);
  const toAllocate = budgetIncome - budgetExpenses - budgetSavings;

  const actualIncome = getActualSectionTotal(transactions, year, month, incCats);
  const actualExpenses = getActualSectionTotal(transactions, year, month, expCats);
  const actualSavings = getActualSectionTotal(transactions, year, month, savCats);
  const netBalance = actualIncome - actualExpenses - actualSavings;

  const savingsRate = actualIncome > 0
    ? (settings.savingsRateMode === 'savings'
      ? (actualSavings / actualIncome) * 100
      : ((actualIncome - actualExpenses) / actualIncome) * 100)
    : 0;

  // Bar chart: Budget vs Actual by category (expenses)
  const topExpCats = expCats.slice(0, 8);
  const barData = {
    labels: topExpCats.map(c => c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name),
    datasets: [
      {
        label: 'Budgeted',
        data: topExpCats.map(c => getBudgetValue(budget, year, c.id, month)),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderRadius: 4,
      },
      {
        label: 'Actual',
        data: topExpCats.map(c => getActualByCategory(transactions, year, month, c.id)),
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderRadius: 4,
      },
    ],
  };

  // Line chart: monthly income vs expenses for the year
  const lineLabels = MONTHS;
  const lineIncome = MONTHS.map((_, m) => getActualSectionTotal(transactions, year, m, incCats));
  const lineExpenses = MONTHS.map((_, m) => getActualSectionTotal(transactions, year, m, expCats));
  const lineSavings = MONTHS.map((_, m) => getActualSectionTotal(transactions, year, m, savCats));

  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Income',
        data: lineIncome,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      },
      {
        label: 'Expenses',
        data: lineExpenses,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.05)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      },
      {
        label: 'Savings',
        data: lineSavings,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.05)',
        tension: 0.4,
        fill: false,
        pointRadius: 3,
      },
    ],
  };

  // Doughnut: expense breakdown
  const doughnutCats = expCats.filter(c => getActualByCategory(transactions, year, month, c.id) > 0);
  const COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#a855f7','#06b6d4','#f97316','#ec4899','#84cc16'];
  const doughnutData = {
    labels: doughnutCats.map(c => c.name),
    datasets: [{
      data: doughnutCats.map(c => getActualByCategory(transactions, year, month, c.id)),
      backgroundColor: COLORS.slice(0, doughnutCats.length),
      borderColor: '#1e293b',
      borderWidth: 2,
    }],
  };

  // Recent transactions
  const recent = [...transactions]
    .filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .slice(0, 6);

  const allCats = [...incCats, ...expCats, ...savCats];

  return (
    <div className="page-body">
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card green">
          <div className="kpi-label">Income</div>
          <div className="kpi-value">{fmtCompact(actualIncome, currency)}</div>
          <div className="kpi-sub">Budget: {fmtCompact(budgetIncome, currency)}</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Expenses</div>
          <div className="kpi-value">{fmtCompact(actualExpenses, currency)}</div>
          <div className="kpi-sub">Budget: {fmtCompact(budgetExpenses, currency)}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Savings</div>
          <div className="kpi-value">{fmtCompact(actualSavings, currency)}</div>
          <div className="kpi-sub">Budget: {fmtCompact(budgetSavings, currency)}</div>
        </div>
        <div className={`kpi-card ${savingsRate >= 15 ? 'green' : 'yellow'}`}>
          <div className="kpi-label">Savings Rate</div>
          <div className={`kpi-value ${savingsRate >= 15 ? 'kpi-positive' : ''}`}>{savingsRate.toFixed(1)}%</div>
          <div className="kpi-sub">{settings.savingsRateMode === 'savings' ? 'of income' : 'not spent'}</div>
        </div>
        <div className={`kpi-card ${netBalance >= 0 ? 'green' : 'red'}`}>
          <div className="kpi-label">Net Balance</div>
          <div className={`kpi-value ${netBalance >= 0 ? 'kpi-positive' : 'kpi-negative'}`}>{fmtCompact(netBalance, currency)}</div>
          <div className="kpi-sub">income - exp - sav</div>
        </div>
        <div className={`kpi-card ${Math.abs(toAllocate) < 1 ? 'green' : toAllocate > 0 ? 'yellow' : 'red'}`}>
          <div className="kpi-label">To Allocate</div>
          <div className={`kpi-value ${Math.abs(toAllocate) < 1 ? 'kpi-positive' : toAllocate > 0 ? '' : 'kpi-negative'}`}>{fmtCompact(toAllocate, currency)}</div>
          <div className="kpi-sub">{Math.abs(toAllocate) < 1 ? 'Zero-based achieved!' : toAllocate > 0 ? 'Unallocated budget' : 'Over-allocated'}</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="charts-grid mb-6">
        <div className="chart-card">
          <div className="chart-title">Monthly Trend — {year}</div>
          <div style={{ height: 220 }}>
            <Line
              data={lineData}
              options={{
                ...chartDefaults,
                plugins: {
                  ...chartDefaults.plugins,
                  legend: { display: true, labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
                },
                scales: {
                  x: { grid: { color: 'rgba(51,65,85,0.5)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                  y: { grid: { color: 'rgba(51,65,85,0.5)' }, ticks: { color: '#94a3b8', font: { size: 11 }, callback: v => fmtCompact(v, currency) } },
                },
              }}
            />
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Budget vs Actual Expenses — {MONTHS[month]}</div>
          <div style={{ height: 220 }}>
            <Bar
              data={barData}
              options={{
                ...chartDefaults,
                plugins: {
                  ...chartDefaults.plugins,
                  legend: { display: true, labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
                },
                scales: {
                  x: { grid: { color: 'rgba(51,65,85,0.5)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                  y: { grid: { color: 'rgba(51,65,85,0.5)' }, ticks: { color: '#94a3b8', font: { size: 11 }, callback: v => fmtCompact(v, currency) } },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Expense Breakdown — {MONTHS[month]}</div>
          {doughnutCats.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No expense transactions this month</span>
            </div>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: '0 0 180px', height: 180 }}>
                <Doughnut
                  data={doughnutData}
                  options={{
                    ...chartDefaults,
                    cutout: '65%',
                    plugins: { ...chartDefaults.plugins, legend: { display: false } },
                  }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                {doughnutCats.slice(0, 7).map((cat, i) => {
                  const val = getActualByCategory(transactions, year, month, cat.id);
                  const pct = actualExpenses > 0 ? (val / actualExpenses * 100).toFixed(0) : 0;
                  return (
                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-title">Recent Transactions — {MONTHS[month]} {year}</div>
          {recent.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No transactions this month</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map(tx => {
                const cat = allCats.find(c => c.id === tx.catId);
                return (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.details || cat?.name || 'Transaction'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {cat?.name} · {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: tx.type === 'income' ? 'var(--accent-green)' : tx.type === 'savings' ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount, currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
