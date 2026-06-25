import { useMemo } from 'react';
import { useBudget, MONTHS, fmt, getBudgetValue, getActualByCategory, getSectionTotal, getActualSectionTotal } from '../store.jsx';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
    tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10 },
  },
  scales: {
    x: { grid: { color: 'rgba(51,65,85,0.5)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    y: { grid: { color: 'rgba(51,65,85,0.5)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
  },
};

export default function Reports() {
  const { state } = useBudget();
  const { budget, transactions, categories, settings, selectedYear } = state;
  const { currency } = settings;
  const year = selectedYear;

  const incCats = categories.income;
  const expCats = categories.expense;
  const savCats = categories.savings;

  // Monthly overview data
  const monthlyData = MONTHS.map((_, m) => {
    const budgetInc = getSectionTotal(budget, year, incCats, m);
    const budgetExp = getSectionTotal(budget, year, expCats, m);
    const budgetSav = getSectionTotal(budget, year, savCats, m);
    const actualInc = getActualSectionTotal(transactions, year, m, incCats);
    const actualExp = getActualSectionTotal(transactions, year, m, expCats);
    const actualSav = getActualSectionTotal(transactions, year, m, savCats);
    return { budgetInc, budgetExp, budgetSav, actualInc, actualExp, actualSav };
  });

  const barBudgetVsActual = {
    labels: MONTHS,
    datasets: [
      { label: 'Budgeted Income', data: monthlyData.map(d => d.budgetInc), backgroundColor: 'rgba(34,197,94,0.4)', borderColor: '#22c55e', borderWidth: 1, borderRadius: 3 },
      { label: 'Actual Income', data: monthlyData.map(d => d.actualInc), backgroundColor: 'rgba(34,197,94,0.8)', borderRadius: 3 },
      { label: 'Budgeted Expenses', data: monthlyData.map(d => d.budgetExp), backgroundColor: 'rgba(239,68,68,0.3)', borderColor: '#ef4444', borderWidth: 1, borderRadius: 3 },
      { label: 'Actual Expenses', data: monthlyData.map(d => d.actualExp), backgroundColor: 'rgba(239,68,68,0.8)', borderRadius: 3 },
    ],
  };

  // Savings progress
  const savingsLine = {
    labels: MONTHS,
    datasets: [
      { label: 'Budgeted Savings', data: monthlyData.map(d => d.budgetSav), borderColor: 'rgba(59,130,246,0.5)', backgroundColor: 'rgba(59,130,246,0.05)', borderDash: [4, 4], tension: 0.3, fill: false, pointRadius: 3 },
      { label: 'Actual Savings', data: monthlyData.map(d => d.actualSav), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.3, fill: true, pointRadius: 3 },
    ],
  };

  // Net flow (income - expenses) monthly
  const netFlow = {
    labels: MONTHS,
    datasets: [
      {
        label: 'Net Flow',
        data: monthlyData.map(d => d.actualInc - d.actualExp),
        backgroundColor: monthlyData.map(d => d.actualInc - d.actualExp >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'),
        borderRadius: 4,
      },
    ],
  };

  // Category-level budget vs actual table (expenses)
  const catDetails = expCats.map(cat => {
    const annualBudget = MONTHS.reduce((s, _, m) => s + getBudgetValue(budget, year, cat.id, m), 0);
    const annualActual = MONTHS.reduce((s, _, m) => s + getActualByCategory(transactions, year, m, cat.id), 0);
    return { cat, annualBudget, annualActual, diff: annualBudget - annualActual };
  }).filter(r => r.annualBudget > 0 || r.annualActual > 0);

  const yearTotals = {
    budgetInc: monthlyData.reduce((s, d) => s + d.budgetInc, 0),
    actualInc: monthlyData.reduce((s, d) => s + d.actualInc, 0),
    budgetExp: monthlyData.reduce((s, d) => s + d.budgetExp, 0),
    actualExp: monthlyData.reduce((s, d) => s + d.actualExp, 0),
    budgetSav: monthlyData.reduce((s, d) => s + d.budgetSav, 0),
    actualSav: monthlyData.reduce((s, d) => s + d.actualSav, 0),
  };

  const savRate = yearTotals.actualInc > 0 ? (yearTotals.actualSav / yearTotals.actualInc * 100) : 0;

  return (
    <div className="page-body">
      {/* Annual summary KPIs */}
      <div className="kpi-grid mb-6">
        <div className="kpi-card green">
          <div className="kpi-label">Annual Income</div>
          <div className="kpi-value">{fmt(yearTotals.actualInc, currency)}</div>
          <div className="kpi-sub">Budget: {fmt(yearTotals.budgetInc, currency)}</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Annual Expenses</div>
          <div className="kpi-value">{fmt(yearTotals.actualExp, currency)}</div>
          <div className="kpi-sub">Budget: {fmt(yearTotals.budgetExp, currency)}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Annual Savings</div>
          <div className="kpi-value">{fmt(yearTotals.actualSav, currency)}</div>
          <div className="kpi-sub">Budget: {fmt(yearTotals.budgetSav, currency)}</div>
        </div>
        <div className={`kpi-card ${savRate >= 20 ? 'green' : 'yellow'}`}>
          <div className="kpi-label">Annual Savings Rate</div>
          <div className="kpi-value">{savRate.toFixed(1)}%</div>
          <div className="kpi-sub">of total income</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid mb-6">
        <div className="chart-card">
          <div className="chart-title">Budget vs Actual — Monthly</div>
          <div style={{ height: 260 }}>
            <Bar data={barBudgetVsActual} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, callback: v => `${currency}${(v/1000).toFixed(0)}k` } } } }} />
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Savings Progress</div>
          <div style={{ height: 260 }}>
            <Line data={savingsLine} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, callback: v => `${currency}${(v/1000).toFixed(0)}k` } } } }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="chart-card" style={{ gridColumn: '1/-1' }}>
          <div className="chart-title">Monthly Net Flow (Income − Expenses)</div>
          <div style={{ height: 220 }}>
            <Bar data={netFlow} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } }, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, callback: v => `${currency}${(v/1000).toFixed(0)}k` } } } }} />
          </div>
        </div>
      </div>

      {/* Category details table */}
      <div className="card">
        <div className="card-title">Expense Category Detail — {year}</div>
        {catDetails.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <span>No expense budget or transactions for {year}</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Budgeted</th>
                  <th style={{ textAlign: 'right' }}>Actual</th>
                  <th style={{ textAlign: 'right' }}>Difference</th>
                  <th style={{ textAlign: 'right' }}>Used %</th>
                  <th style={{ width: 140 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {catDetails.map(({ cat, annualBudget, annualActual, diff }) => {
                  const pct = annualBudget > 0 ? Math.min((annualActual / annualBudget) * 100, 100) : 0;
                  const over = annualActual > annualBudget;
                  return (
                    <tr key={cat.id}>
                      <td>{cat.name}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(annualBudget, currency)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(annualActual, currency)}</td>
                      <td style={{ textAlign: 'right', color: diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                        {diff >= 0 ? '+' : ''}{fmt(diff, currency)}
                      </td>
                      <td style={{ textAlign: 'right', color: over ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                        {annualBudget > 0 ? ((annualActual / annualBudget) * 100).toFixed(0) + '%' : '—'}
                      </td>
                      <td>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: over ? 'var(--accent-red)' : pct > 80 ? 'var(--accent-yellow)' : 'var(--accent-green)',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
