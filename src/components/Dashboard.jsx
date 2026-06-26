import { useMemo } from 'react';
import { useBudget, MONTHS, fmt, fmtCompact, getSectionTotal, getActualSectionTotal, getActualByCategory, getBudgetValue } from '../store.jsx';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10 },
  },
};

const SCALE_DEFAULTS = {
  x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
  y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
};

const COLORS = ['#60a5fa','#f87171','#34d399','#fbbf24','#a78bfa','#06b6d4','#f97316','#ec4899','#84cc16'];

/* ── Burn Rate Rings (SVG) ── */
function BurnRateRings({ income, budget, currency }) {
  const { actualInc, budgetInc, actualExp, budgetExp, actualSav, budgetSav } = budget;
  const size = 200;
  const cx = 100;
  const cy = 100;

  const rings = [
    { r: 80, w: 11, actual: actualInc, limit: budgetInc, label: 'Income',   base: '#34d399', invert: false },
    { r: 61, w: 11, actual: actualExp, limit: budgetExp, label: 'Expenses',  base: '#f87171', invert: true  },
    { r: 42, w: 11, actual: actualSav, limit: budgetSav, label: 'Savings',   base: '#60a5fa', invert: false },
  ];

  function ringColor(actual, limit, invert) {
    const pct = limit > 0 ? (actual / limit) * 100 : 0;
    if (invert) {
      if (pct >= 100) return '#f87171';
      if (pct >= 80)  return '#fbbf24';
      return '#34d399';
    }
    return pct >= 80 ? '#34d399' : pct >= 40 ? '#60a5fa' : '#fbbf24';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          {rings.map((ring, i) => {
            const circ = 2 * Math.PI * ring.r;
            const pct = ring.limit > 0 ? Math.min((ring.actual / ring.limit) * 100, 100) : 0;
            const offset = circ * (1 - pct / 100);
            const color = ringColor(ring.actual, ring.limit, ring.invert);
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={ring.w} strokeLinecap="round" />
                <circle
                  cx={cx} cy={cy} r={ring.r}
                  fill="none"
                  stroke={color}
                  strokeWidth={ring.w}
                  strokeLinecap="round"
                  strokeDasharray={`${circ} ${circ}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{
                    transition: 'stroke-dashoffset 1s ease, stroke 0.4s ease',
                    filter: `drop-shadow(0 0 5px ${color}99)`,
                  }}
                />
              </g>
            );
          })}
          <text x={cx} y={cy - 7} textAnchor="middle" fill="var(--text-primary, #f0f4f8)" fontSize="12" fontWeight="700">Burn Rate</text>
          <text x={cx} y={cy + 9} textAnchor="middle" fill="var(--text-muted, #475569)" fontSize="11">
            {rings[1].limit > 0 ? ((rings[1].actual / rings[1].limit) * 100).toFixed(0) : 0}% of budget
          </text>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
        {rings.map((ring, i) => {
          const pct = ring.limit > 0 ? Math.min((ring.actual / ring.limit) * 100, 100) : 0;
          const color = ringColor(ring.actual, ring.limit, ring.invert);
          return (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{ring.label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease', boxShadow: `0 0 6px ${color}60` }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                {fmtCompact(ring.actual, currency)} / {fmtCompact(ring.limit, currency)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Savings Forecast Sparkline ── */
function SavingsForecast({ transactions, year, savCats, currency }) {
  const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() : 11;

  const historical = useMemo(() => {
    return MONTHS.slice(0, currentMonth + 1).map((_, m) =>
      getActualSectionTotal(transactions, year, m, savCats)
    );
  }, [transactions, year, savCats, currentMonth]);

  const validPoints = historical.filter(v => v > 0);
  if (validPoints.length < 3) return null;

  const n = validPoints.length;
  const xs = validPoints.map((_, i) => i);
  const sumX = xs.reduce((s, x) => s + x, 0);
  const sumY = validPoints.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * validPoints[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;

  const projCount = Math.min(6, 11 - currentMonth);
  const projLabels = MONTHS.slice(currentMonth + 1, currentMonth + 1 + projCount);
  const projValues = projLabels.map((_, i) => Math.max(0, intercept + slope * (n + i)));

  const allLabels = [...MONTHS.slice(0, currentMonth + 1), ...projLabels];
  const histData = [...historical, ...Array(projCount).fill(null)];
  const foreData = [...Array(currentMonth + 1).fill(null), historical[currentMonth], ...projValues];

  const chartData = {
    labels: allLabels,
    datasets: [
      {
        label: 'Actual Savings',
        data: histData,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.08)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#60a5fa',
        spanGaps: false,
      },
      {
        label: '6-Month Forecast',
        data: foreData,
        borderColor: 'rgba(167,139,250,0.8)',
        backgroundColor: 'rgba(167,139,250,0.05)',
        borderWidth: 2,
        borderDash: [5, 4],
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        pointBackgroundColor: '#a78bfa',
        spanGaps: false,
      },
    ],
  };

  const opts = {
    ...CHART_DEFAULTS,
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: { display: true, labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
    },
    scales: {
      ...SCALE_DEFAULTS,
      y: { ...SCALE_DEFAULTS.y, ticks: { ...SCALE_DEFAULTS.y.ticks, callback: v => fmtCompact(v, currency) } },
    },
  };

  const avgForecast = projValues.length > 0 ? projValues.reduce((s, v) => s + v, 0) / projValues.length : 0;
  const trend = slope > 0 ? 'upward' : slope < -10 ? 'declining' : 'stable';

  return (
    <div className="chart-card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="chart-title" style={{ marginBottom: 0 }}>Savings Velocity & Forecast</div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12,
          background: trend === 'upward' ? 'rgba(52,211,153,0.15)' : trend === 'declining' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
          color: trend === 'upward' ? 'var(--accent-green)' : trend === 'declining' ? 'var(--accent-red)' : 'var(--accent-yellow)',
        }}>
          {trend === 'upward' ? '↑ Trending up' : trend === 'declining' ? '↓ Declining' : '→ Stable'}
        </span>
      </div>
      <div style={{ height: 200 }}>
        <Line data={chartData} options={opts} />
      </div>
      {projValues.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          Avg projected: <strong style={{ color: 'var(--accent-purple)' }}>{fmtCompact(avgForecast, currency)}</strong>/mo over next {projValues.length} months
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { state } = useBudget();
  const { budget, transactions, categories, settings, selectedYear, selectedMonth } = state;
  const { currency } = settings;
  const year = selectedYear;
  const month = selectedMonth;
  const incCats = categories.income;
  const expCats = categories.expense;
  const savCats = categories.savings;

  const budgetInc = getSectionTotal(budget, year, incCats, month);
  const budgetExp = getSectionTotal(budget, year, expCats, month);
  const budgetSav = getSectionTotal(budget, year, savCats, month);
  const toAllocate = budgetInc - budgetExp - budgetSav;

  const actualInc = getActualSectionTotal(transactions, year, month, incCats);
  const actualExp = getActualSectionTotal(transactions, year, month, expCats);
  const actualSav = getActualSectionTotal(transactions, year, month, savCats);
  const netBalance = actualInc - actualExp - actualSav;

  const savingsRate = actualInc > 0
    ? (settings.savingsRateMode === 'savings'
      ? (actualSav / actualInc) * 100
      : ((actualInc - actualExp) / actualInc) * 100)
    : 0;

  // Bar: budget vs actual per expense category
  const topExpCats = expCats.slice(0, 8);
  const barData = {
    labels: topExpCats.map(c => c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name),
    datasets: [
      { label: 'Budget', data: topExpCats.map(c => getBudgetValue(budget, year, c.id, month)), backgroundColor: 'rgba(96,165,250,0.5)', borderRadius: 4 },
      { label: 'Actual', data: topExpCats.map(c => getActualByCategory(transactions, year, month, c.id)), backgroundColor: 'rgba(248,113,113,0.6)', borderRadius: 4 },
    ],
  };

  // Line: monthly trend
  const lineData = {
    labels: MONTHS,
    datasets: [
      { label: 'Income',   data: MONTHS.map((_, m) => getActualSectionTotal(transactions, year, m, incCats)), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', tension: 0.4, fill: true, pointRadius: 3 },
      { label: 'Expenses', data: MONTHS.map((_, m) => getActualSectionTotal(transactions, year, m, expCats)), borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.05)', tension: 0.4, fill: true, pointRadius: 3 },
      { label: 'Savings',  data: MONTHS.map((_, m) => getActualSectionTotal(transactions, year, m, savCats)), borderColor: '#60a5fa', backgroundColor: 'transparent', tension: 0.4, fill: false, pointRadius: 3 },
    ],
  };

  // Doughnut
  const doughnutCats = expCats.filter(c => getActualByCategory(transactions, year, month, c.id) > 0);
  const doughnutData = {
    labels: doughnutCats.map(c => c.name),
    datasets: [{
      data: doughnutCats.map(c => getActualByCategory(transactions, year, month, c.id)),
      backgroundColor: COLORS.slice(0, doughnutCats.length),
      borderColor: 'rgba(0,0,0,0.3)',
      borderWidth: 2,
    }],
  };

  // Recent transactions
  const recent = [...transactions].filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  }).slice(0, 6);

  const allCats = [...incCats, ...expCats, ...savCats];
  const catMap = Object.fromEntries(allCats.map(c => [c.id, c]));

  const scaleOpts = {
    ...CHART_DEFAULTS,
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: { display: true, labels: { color: '#64748b', boxWidth: 12, font: { size: 11 } } },
    },
    scales: {
      ...SCALE_DEFAULTS,
      y: { ...SCALE_DEFAULTS.y, ticks: { ...SCALE_DEFAULTS.y.ticks, callback: v => fmtCompact(v, currency) } },
    },
  };

  const burnBudget = { actualInc, budgetInc, actualExp, budgetExp, actualSav, budgetSav };

  return (
    <div className="page-body">
      {/* KPI tiles */}
      <div className="kpi-grid">
        <div className="kpi-card green">
          <div className="kpi-label">Income</div>
          <div className="kpi-value">{fmtCompact(actualInc, currency)}</div>
          <div className="kpi-sub">Budget: {fmtCompact(budgetInc, currency)}</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Expenses</div>
          <div className="kpi-value">{fmtCompact(actualExp, currency)}</div>
          <div className="kpi-sub">Budget: {fmtCompact(budgetExp, currency)}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Savings</div>
          <div className="kpi-value">{fmtCompact(actualSav, currency)}</div>
          <div className="kpi-sub">Budget: {fmtCompact(budgetSav, currency)}</div>
        </div>
        <div className={`kpi-card ${savingsRate >= 15 ? 'green' : 'yellow'}`}>
          <div className="kpi-label">Savings Rate</div>
          <div className={`kpi-value ${savingsRate >= 15 ? 'kpi-positive' : ''}`}>{savingsRate.toFixed(1)}%</div>
          <div className="kpi-sub">{settings.savingsRateMode === 'savings' ? 'of income' : 'not spent'}</div>
        </div>
        <div className={`kpi-card ${netBalance >= 0 ? 'green' : 'red'}`}>
          <div className="kpi-label">Net Balance</div>
          <div className={`kpi-value ${netBalance >= 0 ? 'kpi-positive' : 'kpi-negative'}`}>{fmtCompact(netBalance, currency)}</div>
          <div className="kpi-sub">inc − exp − sav</div>
        </div>
        <div className={`kpi-card ${Math.abs(toAllocate) < 1 ? 'green' : toAllocate > 0 ? 'yellow' : 'red'}`}>
          <div className="kpi-label">To Allocate</div>
          <div className={`kpi-value ${Math.abs(toAllocate) < 1 ? 'kpi-positive' : toAllocate > 0 ? '' : 'kpi-negative'}`}>
            {Math.abs(toAllocate) < 1 ? '✓ $0' : fmtCompact(toAllocate, currency)}
          </div>
          <div className="kpi-sub">{Math.abs(toAllocate) < 1 ? 'Zero-based achieved!' : toAllocate > 0 ? 'Unallocated' : 'Over-allocated'}</div>
        </div>
      </div>

      {/* Burn rate rings + trend chart */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Monthly Burn Rate — {MONTHS[month]} {year}</div>
          <BurnRateRings budget={burnBudget} currency={currency} />
        </div>
        <div className="chart-card">
          <div className="chart-title">Monthly Trend — {year}</div>
          <div style={{ height: 220 }}>
            <Line data={lineData} options={scaleOpts} />
          </div>
        </div>
      </div>

      {/* Budget vs Actual bar + doughnut */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Budget vs Actual Expenses — {MONTHS[month]}</div>
          <div style={{ height: 220 }}>
            <Bar data={barData} options={scaleOpts} />
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Expense Breakdown — {MONTHS[month]}</div>
          {doughnutCats.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <span style={{ fontSize: 13 }}>No expense transactions this month</span>
            </div>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: '0 0 170px', height: 170 }}>
                <Doughnut data={doughnutData} options={{ ...CHART_DEFAULTS, cutout: '65%' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                {doughnutCats.slice(0, 7).map((cat, i) => {
                  const val = getActualByCategory(transactions, year, month, cat.id);
                  const pct = actualExp > 0 ? (val / actualExp * 100).toFixed(0) : 0;
                  return (
                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Savings forecast */}
      <SavingsForecast transactions={transactions} year={year} savCats={savCats} currency={currency} />

      {/* Recent transactions */}
      <div className="chart-card">
        <div className="chart-title">Recent Transactions — {MONTHS[month]} {year}</div>
        {recent.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <span style={{ fontSize: 13 }}>No transactions this month</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recent.map((tx, idx) => {
              const cat = catMap[tx.catId];
              return (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < recent.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: tx.type === 'income' ? 'rgba(52,211,153,0.15)' : tx.type === 'savings' ? 'rgba(96,165,250,0.15)' : 'rgba(248,113,113,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                    color: tx.type === 'income' ? 'var(--accent-green)' : tx.type === 'savings' ? 'var(--accent-blue)' : 'var(--accent-red)',
                  }}>
                    {tx.type === 'income' ? '+' : tx.type === 'savings' ? '→' : '−'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.details || cat?.name || 'Transaction'}
                      {tx.flagged && <span className="flag-indicator" />}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {cat?.name} · {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: tx.type === 'income' ? 'var(--accent-green)' : tx.type === 'savings' ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
                    {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
