import { useState, useMemo } from 'react';
import { useBudget, MONTHS, fmt } from '../store.jsx';
import { Plus, Search, Trash2, Pencil, X, ChevronDown } from 'lucide-react';

const TYPES = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'savings', label: 'Savings' },
];

function TransactionModal({ tx, categories, onClose, onSave }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState(tx || {
    date: today,
    type: 'expense',
    catId: '',
    amount: '',
    details: '',
  });

  const allCats = useMemo(() => {
    const map = { income: [], expense: [], savings: [] };
    categories.income.forEach(c => map.income.push({ ...c, section: 'income' }));
    categories.expense.forEach(c => map.expense.push({ ...c, section: 'expense' }));
    categories.savings.forEach(c => map.savings.push({ ...c, section: 'savings' }));
    return map;
  }, [categories]);

  const sectionCats = allCats[form.type] || [];

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'type') next.catId = '';
      return next;
    });
  }

  function submit(e) {
    e.preventDefault();
    if (!form.date || !form.catId || !form.amount) return;
    onSave({ ...form, amount: parseFloat(form.amount) });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {tx ? 'Edit Transaction' : 'Add Transaction'}
          <button className="delete-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              className="form-input"
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              required
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-select" value={form.catId} onChange={e => set('catId', e.target.value)} required>
              <option value="">Select a category…</option>
              {sectionCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Details / Notes</label>
            <input
              className="form-input"
              placeholder="e.g. Netflix, Rent payment, Salary…"
              value={form.details}
              onChange={e => set('details', e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {tx ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Transactions() {
  const { state, dispatch } = useBudget();
  const { transactions, categories, settings, selectedYear, selectedMonth } = state;
  const { currency } = settings;

  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const allCats = useMemo(() => {
    const arr = [];
    categories.income.forEach(c => arr.push({ ...c, section: 'income' }));
    categories.expense.forEach(c => arr.push({ ...c, section: 'expense' }));
    categories.savings.forEach(c => arr.push({ ...c, section: 'savings' }));
    return arr;
  }, [categories]);

  const catMap = useMemo(() => Object.fromEntries(allCats.map(c => [c.id, c])), [allCats]);

  const filtered = useMemo(() => {
    let list = transactions.filter(tx => {
      const d = new Date(tx.date);
      if (d.getFullYear() !== selectedYear) return false;
      if (filterMonth !== 'all' && d.getMonth() !== parseInt(filterMonth)) return false;
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        const cat = catMap[tx.catId];
        if (
          !tx.details?.toLowerCase().includes(q) &&
          !cat?.name.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = new Date(a.date) - new Date(b.date);
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      else if (sortKey === 'type') cmp = a.type.localeCompare(b.type);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [transactions, selectedYear, filterMonth, filterType, search, catMap, sortKey, sortDir]);

  // Totals
  const totals = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savings = filtered.filter(t => t.type === 'savings').reduce((s, t) => s + t.amount, 0);
    return { income, expense, savings };
  }, [filtered]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const SortIcon = ({ k }) => (
    sortKey === k ? <ChevronDown size={12} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} /> : null
  );

  return (
    <div className="page-body">
      {/* Filters row */}
      <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="filters-row">
          {/* Month filter */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 110 }}
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>

          {/* Type filters */}
          {['all', 'income', 'expense', 'savings'].map(t => (
            <button
              key={t}
              className={`filter-chip ${filterType === t ? 'active' : ''}`}
              onClick={() => setFilterType(t)}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Search */}
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              className="form-input"
              style={{ width: 200, paddingLeft: 32 }}
              placeholder="Search transactions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditTx(null); setShowModal(true); }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>Income: </span>
          <strong style={{ color: 'var(--accent-green)' }}>{fmt(totals.income, currency)}</strong>
        </div>
        <div style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>Expenses: </span>
          <strong style={{ color: 'var(--accent-red)' }}>{fmt(totals.expense, currency)}</strong>
        </div>
        <div style={{ padding: '8px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>Savings: </span>
          <strong style={{ color: 'var(--accent-blue)' }}>{fmt(totals.savings, currency)}</strong>
        </div>
        <div style={{ padding: '8px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, marginLeft: 'auto' }}>
          <span style={{ color: 'var(--text-muted)' }}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Plus size={32} style={{ opacity: 0.3 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No transactions found</div>
              <div style={{ fontSize: 12 }}>Add your first transaction or adjust filters</div>
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Date <SortIcon k="date" /></span>
                </th>
                <th onClick={() => toggleSort('type')} style={{ cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Type <SortIcon k="type" /></span>
                </th>
                <th>Category</th>
                <th>Details</th>
                <th onClick={() => toggleSort('amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>Amount <SortIcon k="amount" /></span>
                </th>
                <th style={{ width: 72 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => {
                const cat = catMap[tx.catId];
                return (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <span className={`badge badge-${tx.type}`}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{cat?.name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.details || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: tx.type === 'income' ? 'var(--accent-green)' : tx.type === 'savings' ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount, currency)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="edit-btn" onClick={() => { setEditTx(tx); setShowModal(true); }}>
                          <Pencil size={13} />
                        </button>
                        <button className="delete-btn" onClick={() => dispatch({ type: 'DELETE_TRANSACTION', id: tx.id })}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <TransactionModal
          tx={editTx}
          categories={state.categories}
          onClose={() => { setShowModal(false); setEditTx(null); }}
          onSave={data => {
            if (editTx) dispatch({ type: 'UPDATE_TRANSACTION', tx: { ...editTx, ...data } });
            else dispatch({ type: 'ADD_TRANSACTION', tx: data });
          }}
        />
      )}
    </div>
  );
}
