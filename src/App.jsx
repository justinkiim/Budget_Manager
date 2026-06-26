import { useState, useEffect } from 'react';
import { BudgetProvider, useBudget, MONTHS } from './store.jsx';
import Dashboard from './components/Dashboard';
import BudgetPlanning from './components/BudgetPlanning';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Subscriptions from './components/Subscriptions';
import Portfolio from './components/Portfolio';
import Login from './components/Login';
import {
  LayoutDashboard, CalendarDays, Receipt, BarChart3,
  Settings as SettingsIcon, DollarSign, ChevronLeft, ChevronRight,
  Menu, X, Sun, Moon, CreditCard, TrendingUp
} from 'lucide-react';

const VIEWS = [
  { id: 'dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'planning',      label: 'Budget Planning',  icon: CalendarDays    },
  { id: 'transactions',  label: 'Transactions',     icon: Receipt         },
  { id: 'subscriptions', label: 'Subscriptions',    icon: CreditCard      },
  { id: 'portfolio',     label: 'Portfolio',        icon: TrendingUp      },
  { id: 'reports',       label: 'Reports',          icon: BarChart3       },
];

function YearMonthSelector() {
  const { state, dispatch } = useBudget();
  const { selectedYear, selectedMonth } = state;

  function prevYear() { dispatch({ type: 'SET_YEAR', year: selectedYear - 1 }); }
  function nextYear() { dispatch({ type: 'SET_YEAR', year: selectedYear + 1 }); }
  function prevMonth() {
    if (selectedMonth === 0) { dispatch({ type: 'SET_MONTH', month: 11 }); dispatch({ type: 'SET_YEAR', year: selectedYear - 1 }); }
    else dispatch({ type: 'SET_MONTH', month: selectedMonth - 1 });
  }
  function nextMonth() {
    if (selectedMonth === 11) { dispatch({ type: 'SET_MONTH', month: 0 }); dispatch({ type: 'SET_YEAR', year: selectedYear + 1 }); }
    else dispatch({ type: 'SET_MONTH', month: selectedMonth + 1 });
  }

  return (
    <div className="period-selector">
      <div className="period-control">
        <button className="period-btn" onClick={prevYear}><ChevronLeft size={14} /></button>
        <span className="period-label">{selectedYear}</span>
        <button className="period-btn" onClick={nextYear}><ChevronRight size={14} /></button>
      </div>
      <div className="period-control">
        <button className="period-btn" onClick={prevMonth}><ChevronLeft size={14} /></button>
        <span className="period-label">{MONTHS[selectedMonth]}</span>
        <button className="period-btn" onClick={nextMonth}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function YearSelector() {
  const { state, dispatch } = useBudget();
  const { selectedYear } = state;
  return (
    <div className="period-selector">
      <div className="period-control">
        <button className="period-btn" onClick={() => dispatch({ type: 'SET_YEAR', year: selectedYear - 1 })}><ChevronLeft size={14} /></button>
        <span className="period-label">{selectedYear}</span>
        <button className="period-btn" onClick={() => dispatch({ type: 'SET_YEAR', year: selectedYear + 1 })}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

const PAGE_SUBTITLES = {
  dashboard:     'Overview of your financial health',
  planning:      'Set monthly allocations — aim for zero remaining',
  transactions:  'Log and track all income, expenses & savings',
  subscriptions: 'Manage recurring payments — auto-log when paid',
  portfolio:     'Track investment holdings & live market prices',
  reports:       'Annual analysis & category breakdowns',
};

function AppInner() {
  const { state, dispatch } = useBudget();
  const { currentView, isAuthenticated, settings } = state;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings.theme]);

  const needsAuth = settings.pin && settings.pin.trim() !== '' && !isAuthenticated;
  if (needsAuth) return <Login />;

  const view = VIEWS.find(v => v.id === currentView) || VIEWS[0];

  function navigate(id) {
    dispatch({ type: 'SET_VIEW', view: id });
    setSidebarOpen(false);
  }

  const showYearMonth = ['dashboard', 'transactions'].includes(currentView);
  const showYearOnly  = ['planning', 'reports'].includes(currentView);

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

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

        <div className="sidebar-footer">
          <span className="sidebar-footer-text">Zero-Based Budget</span>
          <button
            className="theme-toggle-btn"
            onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
            title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {settings.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <div className="page-title">{view?.label || 'Settings'}</div>
              <div className="page-subtitle">{PAGE_SUBTITLES[currentView] || ''}</div>
            </div>
          </div>
          {showYearMonth && <YearMonthSelector />}
          {showYearOnly  && <YearSelector />}
        </header>

        {currentView === 'dashboard'     && <Dashboard />}
        {currentView === 'planning'      && <BudgetPlanning />}
        {currentView === 'transactions'  && <Transactions />}
        {currentView === 'subscriptions' && <Subscriptions />}
        {currentView === 'portfolio'     && <Portfolio />}
        {currentView === 'reports'       && <Reports />}
        {currentView === 'settings'      && <Settings />}
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
