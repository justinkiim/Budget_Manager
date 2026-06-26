import { createContext, useContext, useReducer, useEffect } from 'react';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function makeDefaultCategories() {
  return {
    income: [
      { id: 'inc-1', name: 'Employment (Net)', custom: false },
      { id: 'inc-2', name: 'Reimbursements', custom: false },
      { id: 'inc-3', name: 'Bonus', custom: false },
      { id: 'inc-4', name: 'Refunds', custom: false },
      { id: 'inc-5', name: 'Side Hustle (Net)', custom: false },
      { id: 'inc-6', name: 'Other Income', custom: false },
    ],
    expense: [
      { id: 'exp-1', name: 'Rent / Mortgage', custom: false },
      { id: 'exp-2', name: 'Food & Groceries', custom: false },
      { id: 'exp-3', name: 'Subscriptions', custom: false },
      { id: 'exp-4', name: 'Utilities', custom: false },
      { id: 'exp-5', name: 'Transportation', custom: false },
      { id: 'exp-6', name: 'Healthcare', custom: false },
      { id: 'exp-7', name: 'Entertainment', custom: false },
      { id: 'exp-8', name: 'Clothing', custom: false },
      { id: 'exp-9', name: 'Personal Care', custom: false },
    ],
    savings: [
      { id: 'sav-1', name: 'Emergency Fund', custom: false },
      { id: 'sav-2', name: 'Stock Portfolio', custom: false },
      { id: 'sav-3', name: '401(k)', custom: false },
      { id: 'sav-4', name: 'Roth IRA', custom: false },
      { id: 'sav-5', name: 'HSA', custom: false },
    ],
  };
}

function defaultState() {
  return {
    settings: {
      startYear: new Date().getFullYear(),
      currency: '$',
      currencyCode: 'USD',
      savingsRateMode: 'savings',
      shiftLateIncome: false,
      shiftDay: 20,
      password: '',
      theme: 'dark',
    },
    categories: makeDefaultCategories(),
    budget: {},
    transactions: [],
    subscriptions: [],
    currentView: 'dashboard',
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth(),
    isAuthenticated: false,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem('budgetmanager_v1');
    if (!raw) return defaultState();
    const saved = JSON.parse(raw);
    const def = defaultState();
    return {
      ...def,
      ...saved,
      currentView: 'dashboard',
      selectedYear: saved.selectedYear || def.selectedYear,
      selectedMonth: saved.selectedMonth !== undefined ? saved.selectedMonth : def.selectedMonth,
      isAuthenticated: false,
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  const { currentView, isAuthenticated, ...persist } = state;
  localStorage.setItem('budgetmanager_v1', JSON.stringify(persist));
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.view };
    case 'SET_YEAR':
      return { ...state, selectedYear: action.year };
    case 'SET_MONTH':
      return { ...state, selectedMonth: action.month };
    case 'AUTHENTICATE':
      return { ...state, isAuthenticated: true };
    case 'TOGGLE_THEME': {
      const theme = state.settings.theme === 'dark' ? 'light' : 'dark';
      return { ...state, settings: { ...state.settings, theme } };
    }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'SET_BUDGET': {
      const { year, catId, month, value } = action;
      const budget = JSON.parse(JSON.stringify(state.budget));
      if (!budget[year]) budget[year] = {};
      if (!budget[year][catId]) budget[year][catId] = {};
      budget[year][catId][month] = value;
      return { ...state, budget };
    }
    case 'ADD_CATEGORY': {
      const { section, name } = action;
      const cats = JSON.parse(JSON.stringify(state.categories));
      const id = `${section}-${Date.now()}`;
      cats[section].push({ id, name, custom: true });
      return { ...state, categories: cats };
    }
    case 'REMOVE_CATEGORY': {
      const { section, id } = action;
      const cats = JSON.parse(JSON.stringify(state.categories));
      cats[section] = cats[section].filter(c => c.id !== id);
      return { ...state, categories: cats };
    }
    case 'RENAME_CATEGORY': {
      const { section, id, name } = action;
      const cats = JSON.parse(JSON.stringify(state.categories));
      const cat = cats[section].find(c => c.id === id);
      if (cat) cat.name = name;
      return { ...state, categories: cats };
    }
    case 'ADD_TRANSACTION': {
      const tx = { flagged: false, ...action.tx, id: Date.now().toString() };
      return { ...state, transactions: [tx, ...state.transactions] };
    }
    case 'UPDATE_TRANSACTION': {
      const txs = state.transactions.map(t =>
        t.id === action.tx.id ? { ...t, ...action.tx } : t
      );
      return { ...state, transactions: txs };
    }
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.id) };
    case 'ADD_SUBSCRIPTION': {
      const sub = { lastPaidDate: null, active: true, color: '#60a5fa', ...action.sub, id: Date.now().toString() };
      return { ...state, subscriptions: [...state.subscriptions, sub] };
    }
    case 'UPDATE_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: state.subscriptions.map(s => s.id === action.sub.id ? { ...s, ...action.sub } : s),
      };
    case 'DELETE_SUBSCRIPTION':
      return { ...state, subscriptions: state.subscriptions.filter(s => s.id !== action.id) };
    case 'PAY_SUBSCRIPTION': {
      const sub = state.subscriptions.find(s => s.id === action.id);
      if (!sub) return state;
      const today = new Date().toISOString().slice(0, 10);
      const tx = {
        id: Date.now().toString(),
        date: today,
        type: 'expense',
        catId: sub.catId,
        amount: sub.cost,
        details: sub.name,
        flagged: false,
        fromSubscription: sub.id,
      };
      const subscriptions = state.subscriptions.map(s =>
        s.id === action.id ? { ...s, lastPaidDate: today } : s
      );
      return { ...state, transactions: [tx, ...state.transactions], subscriptions };
    }
    default:
      return state;
  }
}

const BudgetContext = createContext(null);

export function BudgetProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  useEffect(() => { saveState(state); }, [state]);
  return (
    <BudgetContext.Provider value={{ state, dispatch }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  return useContext(BudgetContext);
}

export function getBudgetValue(budget, year, catId, month) {
  return budget?.[year]?.[catId]?.[month] ?? 0;
}

export function getCatBudgetTotal(budget, year, catId) {
  let total = 0;
  for (let m = 0; m < 12; m++) total += getBudgetValue(budget, year, catId, m);
  return total;
}

export function getSectionTotal(budget, year, cats, month) {
  let total = 0;
  for (const cat of cats) total += getBudgetValue(budget, year, cat.id, month);
  return total;
}

export function fmt(value, currency = '$') {
  if (value === 0) return `${currency}0`;
  const abs = Math.abs(value);
  const formatted = abs >= 1000
    ? abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : abs.toFixed(2).replace(/\.00$/, '');
  return `${value < 0 ? '-' : ''}${currency}${formatted}`;
}

export function fmtCompact(value, currency = '$') {
  const abs = Math.abs(value);
  let str;
  if (abs >= 1000000) str = (abs / 1000000).toFixed(1) + 'M';
  else if (abs >= 1000) str = (abs / 1000).toFixed(1) + 'K';
  else str = abs.toFixed(0);
  return `${value < 0 ? '-' : ''}${currency}${str}`;
}

export function getTransactionsByMonth(transactions, year, month) {
  return transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function getTransactionsByYear(transactions, year) {
  return transactions.filter(tx => new Date(tx.date).getFullYear() === year);
}

export function getActualByCategory(transactions, year, month, catId) {
  const txs = month !== null
    ? getTransactionsByMonth(transactions, year, month)
    : getTransactionsByYear(transactions, year);
  return txs.filter(tx => tx.catId === catId).reduce((s, tx) => s + tx.amount, 0);
}

export function getActualSectionTotal(transactions, year, month, cats) {
  let total = 0;
  for (const cat of cats) total += getActualByCategory(transactions, year, month, cat.id);
  return total;
}

export function isSubPaidThisCycle(sub) {
  if (!sub.lastPaidDate) return false;
  const paid = new Date(sub.lastPaidDate + 'T12:00:00');
  const now = new Date();
  if (sub.cycle === 'monthly') {
    return paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth();
  }
  if (sub.cycle === 'annual') {
    return paid.getFullYear() === now.getFullYear();
  }
  if (sub.cycle === 'weekly') {
    return (now - paid) / (1000 * 60 * 60 * 24) < 7;
  }
  return false;
}
