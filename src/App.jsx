import { useState } from 'react';
import { BudgetProvider, useBudget, MONTHS } from './store.jsx';
import Dashboard from './components/Dashboard';
import BudgetPlanning from './components/BudgetPlanning';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import Settings from './components/Settings';
import {
  LayoutDashboard, CalendarDays, Receipt, BarChart3,
  Settings as SettingsIcon, DollarSign, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planning', label: 'Budget Planning', icon: CalendarDays },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

function YearMonthSelector() {
  const { state, dispatch } = useBudget();
  const { selectedYear, selectedMonth } = state;

  function prevYear() { dispatch({ type: 'SET_YEAR', year: selectedYear - 1 }); }
  function nextYear() { dispatch({ type: 'SET_YEAR', year: selectedYear + 1 }); }
  function prevMonth() {
    if (selectedMonth === 0) {
      dispatch({ type: 'SET_MONTH', month: 11 });
      dispatch({ type: 'SET_YEAR', year: selectedYear - 1 });
    } else {
      dispatch({ type: 'SET_MONTH', month: selectedMonth - 1 });
    }
  }
  function nextMonth() {
    if (selectedMonth === 11) {
      dispatch({ type: 'SET_MONTH', month: 0 });
      dispatch({ type: 'SET_YEAR', year: selectedYear + 1 });
    } else {
      dispatch({ type: 'SET_MONTH', month: selectedMonth + 1 });
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {/* Year */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        <button onClick={prevYear} style={{ padding: '6px 8px', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ padding: '6px 10px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 44, textAlign: 'center' }}>{selectedYear}</span>
        <button onClick={nextYear} style={{ padding: '6px 8px', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={14} />
        </button>
      </div>
      {/* Month */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        <button onClick={prevMonth} style={{ padding: '6px 8px', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ padding: '6px 10px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 36, textAlign: 'center' }}>{MONTHS[selectedMonth]}</span>
        <button onClick={nextMonth} style={{ padding: '6px 8px', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function AppInner() {
  const { state, dispatch } = useBudget();
  const { currentView } = state;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const view = VIEWS.find(v => v.id === currentView) || VIEWS[0];

  function navigate(id) {
    dispatch({ type: 'SET_VIEW', view: id });
    setSidebarOpen(false);
  }

  const showPeriod = ['dashboard', 'transactions', 'reports'].includes(currentView);
  const showMonthSelector = ['dashboard', 'transactions'].includes(currentView);

  return (
    <div className="app-layout">
      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <DollarSign size={18} color="white" />
            </div>
            <span>Budget Manager</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <span className="nav-section-label">Navigation</span>
          {VIEWS.map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                className={`nav-item ${currentView === v.id ? 'active' : ''}`}
                onClick={() => navigate(v.id)}
              >
                <Icon size={16} />
                {v.label}
              </button>
            );
          })}
          <span className="nav-section-label" style={{ marginTop: 8 }}>Configuration</span>
          <button
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <SettingsIcon size={16} />
            Settings
          </button>
        </nav>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
          Zero-Based Budget Tracker
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <div className="page-title">{view?.label || 'Settings'}</div>
              {currentView === 'planning' && (
                <div className="page-subtitle">Set your monthly budget allocations — aim for zero remaining</div>
              )}
              {currentView === 'dashboard' && (
                <div className="page-subtitle">Overview of your financial health</div>
              )}
              {currentView === 'transactions' && (
                <div className="page-subtitle">Log and track all income, expenses & savings</div>
              )}
              {currentView === 'reports' && (
                <div className="page-subtitle">Annual analysis & category breakdowns</div>
              )}
            </div>
          </div>
          {showPeriod && (
            <YearMonthSelector />
          )}
        </header>

        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'planning' && <BudgetPlanning />}
        {currentView === 'transactions' && <Transactions />}
        {currentView === 'reports' && <Reports />}
        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BudgetProvider>
      <AppInner />
    </BudgetProvider>
  );
}
