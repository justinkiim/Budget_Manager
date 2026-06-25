import { useState } from 'react';
import { useBudget, MONTHS, fmt, getBudgetValue, getSectionTotal } from '../store.jsx';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';

function AddCategoryModal({ section, onClose, onAdd }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          Add Category
          <button className="delete-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="form-group">
          <label className="form-label">Category Name</label>
          <input
            className="form-input"
            placeholder={`e.g. ${section === 'income' ? 'Freelance' : section === 'expense' ? 'Gym' : 'Crypto'}`}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) { onAdd(name.trim()); onClose(); } }}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { if (name.trim()) { onAdd(name.trim()); onClose(); } }} disabled={!name.trim()}>
            Add Category
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ cat, section, year, budget, dispatch, currency, isCustom }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(cat.name);

  const monthlyValues = MONTHS.map((_, m) => getBudgetValue(budget, year, cat.id, m));
  const total = monthlyValues.reduce((s, v) => s + v, 0);

  function handleChange(month, value) {
    const num = parseFloat(value) || 0;
    dispatch({ type: 'SET_BUDGET', year, catId: cat.id, month, value: num });
  }

  function saveName() {
    if (editName.trim()) {
      dispatch({ type: 'RENAME_CATEGORY', section, id: cat.id, name: editName.trim() });
    }
    setEditing(false);
  }

  return (
    <tr>
      <td style={{ paddingLeft: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
          {editing ? (
            <>
              <input
                className="form-input"
                style={{ padding: '3px 6px', fontSize: 12, height: 28 }}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
              />
              <button className="edit-btn" onClick={saveName}><Check size={12} /></button>
              <button className="delete-btn" onClick={() => setEditing(false)}><X size={12} /></button>
            </>
          ) : (
            <>
              <span style={{ flex: 1 }}>{cat.name}</span>
              {isCustom && <span className="custom-cat-badge">custom</span>}
              <div className="cat-row-actions" style={{ display: 'none' }}>
                <button className="edit-btn" onClick={() => { setEditName(cat.name); setEditing(true); }}><Pencil size={12} /></button>
                <button className="delete-btn" onClick={() => dispatch({ type: 'REMOVE_CATEGORY', section, id: cat.id })}><Trash2 size={12} /></button>
              </div>
            </>
          )}
        </div>
      </td>
      {MONTHS.map((_, m) => (
        <td key={m}>
          <input
            className="budget-input"
            type="number"
            min="0"
            step="any"
            value={monthlyValues[m] || ''}
            placeholder="—"
            onChange={e => handleChange(m, e.target.value)}
          />
        </td>
      ))}
      <td style={{ fontWeight: 700, color: 'var(--text-primary)', opacity: 0.9 }}>{fmt(total, currency)}</td>
    </tr>
  );
}

function SectionTable({ section, label, cats, year, budget, dispatch, currency, color }) {
  const [showAdd, setShowAdd] = useState(false);

  const monthlyTotals = MONTHS.map((_, m) => getSectionTotal(budget, year, cats, m));
  const grandTotal = monthlyTotals.reduce((s, v) => s + v, 0);

  return (
    <>
      {showAdd && (
        <AddCategoryModal
          section={section}
          onClose={() => setShowAdd(false)}
          onAdd={name => dispatch({ type: 'ADD_CATEGORY', section, name })}
        />
      )}
      <tbody className={`${section}-section`}>
        <tr className={`section-row ${section === 'income' ? 'income-sec' : section === 'expense' ? 'expense-sec' : 'savings-sec'}`}>
          <td>{label}</td>
          {MONTHS.map((_, m) => <td key={m}></td>)}
          <td></td>
        </tr>
        {cats.map(cat => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            section={section}
            year={year}
            budget={budget}
            dispatch={dispatch}
            currency={currency}
            isCustom={cat.custom}
          />
        ))}
        <tr className="add-category-row">
          <td style={{ paddingLeft: 24 }}>
            <button className="add-cat-btn" onClick={() => setShowAdd(true)}>
              <Plus size={12} /> Add category
            </button>
          </td>
          {MONTHS.map((_, m) => <td key={m}></td>)}
          <td></td>
        </tr>
        <tr className="total-row">
          <td>Total {label}</td>
          {monthlyTotals.map((v, m) => (
            <td key={m} style={{ color: color }}>{v > 0 ? fmt(v, currency) : '—'}</td>
          ))}
          <td style={{ color: color }}>{fmt(grandTotal, currency)}</td>
        </tr>
      </tbody>
    </>
  );
}

export default function BudgetPlanning() {
  const { state, dispatch } = useBudget();
  const { budget, categories, settings, selectedYear } = state;
  const { currency } = settings;
  const year = selectedYear;

  const incCats = categories.income;
  const expCats = categories.expense;
  const savCats = categories.savings;

  // "To be allocated" per month = income - expenses - savings
  const allocations = MONTHS.map((_, m) => {
    const inc = getSectionTotal(budget, year, incCats, m);
    const exp = getSectionTotal(budget, year, expCats, m);
    const sav = getSectionTotal(budget, year, savCats, m);
    return inc - exp - sav;
  });
  const totalAlloc = allocations.reduce((s, v) => s + v, 0);

  function allocClass(v) {
    if (Math.abs(v) < 0.01) return 'alloc-ok';
    if (v > 0) return 'alloc-neutral';
    return 'alloc-over';
  }

  return (
    <div className="page-body">
      <div className="card">
        <div className="budget-table-wrap">
          <table className="budget-table">
            <thead>
              <tr>
                <th>Category</th>
                {MONTHS.map(m => <th key={m}>{m}</th>)}
                <th>Total</th>
              </tr>
            </thead>

            {/* To be Allocated row */}
            <tbody>
              <tr className={`alloc-row ${allocClass(totalAlloc)}`}>
                <td>To Be Allocated</td>
                {allocations.map((v, m) => (
                  <td key={m} className={allocClass(v) === 'alloc-ok' ? '' : ''}>
                    <span style={{ fontWeight: 700 }}>
                      {Math.abs(v) < 0.01 ? '✓ $0' : fmt(v, currency)}
                    </span>
                  </td>
                ))}
                <td style={{ fontWeight: 700 }}>{Math.abs(totalAlloc) < 0.01 ? '✓ $0' : fmt(totalAlloc, currency)}</td>
              </tr>
            </tbody>

            <SectionTable
              section="income"
              label="Income"
              cats={incCats}
              year={year}
              budget={budget}
              dispatch={dispatch}
              currency={currency}
              color="var(--accent-green)"
            />
            <SectionTable
              section="expense"
              label="Expenses"
              cats={expCats}
              year={year}
              budget={budget}
              dispatch={dispatch}
              currency={currency}
              color="var(--accent-red)"
            />
            <SectionTable
              section="savings"
              label="Savings"
              cats={savCats}
              year={year}
              budget={budget}
              dispatch={dispatch}
              currency={currency}
              color="var(--accent-blue)"
            />
          </table>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Zero-Based Budgeting:</strong> Assign every dollar of income to expenses or savings until "To Be Allocated" reaches $0 for each month.
      </div>
    </div>
  );
}
