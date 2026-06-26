import { useState, useMemo } from 'react';
import { useBudget, fmt, isSubPaidThisCycle } from '../store.jsx';
import { Plus, Check, Trash2, Pencil, X, CreditCard } from 'lucide-react';

const SUB_COLORS = ['#60a5fa','#34d399','#f87171','#fbbf24','#a78bfa','#f97316','#06b6d4','#ec4899'];
const CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual',  label: 'Annual'  },
  { value: 'weekly',  label: 'Weekly'  },
];

function SubModal({ sub, categories, onClose, onSave }) {
  const [form, setForm] = useState(sub || {
    name: '', cost: '', cycle: 'monthly', catId: '', color: SUB_COLORS[0],
  });

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); }

  function submit(e) {
    e.preventDefault();
    if (!form.name || !form.cost || !form.catId) return;
    onSave({ ...form, cost: parseFloat(form.cost) });
    onClose();
  }

  const expCats = categories.expense;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {sub ? 'Edit Subscription' : 'Add Subscription'}
          <button className="delete-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" placeholder="Netflix, Spotify, Gym…" value={form.name} onChange={e => set('name', e.target.value)} required autoFocus />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Cost *</label>
              <input className="form-input" type="number" min="0" step="any" placeholder="0.00" value={form.cost} onChange={e => set('cost', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Billing Cycle *</label>
              <select className="form-select" value={form.cycle} onChange={e => set('cycle', e.target.value)}>
                {CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Expense Category *</label>
            <select className="form-select" value={form.catId} onChange={e => set('catId', e.target.value)} required>
              <option value="">Select category…</option>
              {expCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SUB_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  style={{
                    width: 26, height: 26,
                    borderRadius: '50%',
                    background: c,
                    border: form.color === c ? `3px solid white` : '3px solid transparent',
                    outline: form.color === c ? `2px solid ${c}` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: form.color === c ? `0 0 10px ${c}80` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{sub ? 'Save Changes' : 'Add Subscription'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Subscriptions() {
  const { state, dispatch } = useBudget();
  const { subscriptions, categories, settings } = state;
  const { currency } = settings;
  const [showModal, setShowModal] = useState(false);
  const [editSub, setEditSub] = useState(null);

  const catMap = useMemo(() => {
    const map = {};
    [...categories.income, ...categories.expense, ...categories.savings].forEach(c => { map[c.id] = c; });
    return map;
  }, [categories]);

  function pay(id) {
    dispatch({ type: 'PAY_SUBSCRIPTION', id });
  }

  function remove(id) {
    if (window.confirm('Delete this subscription?')) {
      dispatch({ type: 'DELETE_SUBSCRIPTION', id });
    }
  }

  const monthlyCost = subscriptions.reduce((s, sub) => {
    if (!sub.active) return s;
    if (sub.cycle === 'monthly') return s + sub.cost;
    if (sub.cycle === 'annual') return s + sub.cost / 12;
    if (sub.cycle === 'weekly') return s + sub.cost * 4.33;
    return s;
  }, 0);

  const annualCost = subscriptions.reduce((s, sub) => {
    if (!sub.active) return s;
    if (sub.cycle === 'monthly') return s + sub.cost * 12;
    if (sub.cycle === 'annual') return s + sub.cost;
    if (sub.cycle === 'weekly') return s + sub.cost * 52;
    return s;
  }, 0);

  const paidCount = subscriptions.filter(s => isSubPaidThisCycle(s)).length;

  return (
    <div className="page-body">
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Active Subscriptions</div>
          <div className="kpi-value">{subscriptions.filter(s => s.active).length}</div>
          <div className="kpi-sub">{paidCount} paid this cycle</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Monthly Cost</div>
          <div className="kpi-value">{fmt(monthlyCost, currency)}</div>
          <div className="kpi-sub">estimated monthly</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-label">Annual Cost</div>
          <div className="kpi-value">{fmt(annualCost, currency)}</div>
          <div className="kpi-sub">estimated per year</div>
        </div>
      </div>

      {/* List */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Recurring Subscriptions</div>
          <button className="btn btn-primary" onClick={() => { setEditSub(null); setShowModal(true); }}>
            <Plus size={14} /> Add
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={36} style={{ opacity: 0.3 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No subscriptions yet</div>
              <div style={{ fontSize: 12 }}>Add your recurring bills to track and auto-log payments</div>
            </div>
          </div>
        ) : (
          <div className="sub-list">
            {subscriptions.map(sub => {
              const paid = isSubPaidThisCycle(sub);
              const cat = catMap[sub.catId];
              return (
                <div key={sub.id} className={`sub-card ${paid ? 'paid' : ''}`}>
                  {/* Color dot */}
                  <div className="sub-dot" style={{ background: sub.color, boxShadow: `0 0 8px ${sub.color}60` }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="sub-name">{sub.name}</div>
                      <span className="sub-cycle-badge">{sub.cycle}</span>
                      {paid && (
                        <span style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 600 }}>✓ Paid</span>
                      )}
                    </div>
                    <div className="sub-meta">
                      {fmt(sub.cost, currency)}
                      {sub.cycle !== 'monthly' && (
                        <span style={{ marginLeft: 6, opacity: 0.7 }}>
                          ({fmt(sub.cycle === 'annual' ? sub.cost / 12 : sub.cost * 4.33, currency)}/mo)
                        </span>
                      )}
                      {cat && <span style={{ marginLeft: 8 }}>· {cat.name}</span>}
                      {sub.lastPaidDate && (
                        <span style={{ marginLeft: 8 }}>
                          · Last paid {new Date(sub.lastPaidDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className={`sub-pay-btn ${paid ? 'paid' : ''}`}
                      onClick={() => !paid && pay(sub.id)}
                      disabled={paid}
                      title={paid ? 'Already paid this cycle' : 'Mark as paid — adds to transactions'}
                    >
                      <Check size={14} />
                    </button>
                    <button className="edit-btn" onClick={() => { setEditSub(sub); setShowModal(true); }}>
                      <Pencil size={13} />
                    </button>
                    <button className="delete-btn" onClick={() => remove(sub.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--accent-blue)' }}>Auto-logging:</strong> Clicking the checkmark on a subscription automatically records the payment as a transaction in your expense log for today's date.
      </div>

      {showModal && (
        <SubModal
          sub={editSub}
          categories={categories}
          onClose={() => { setShowModal(false); setEditSub(null); }}
          onSave={data => {
            if (editSub) dispatch({ type: 'UPDATE_SUBSCRIPTION', sub: { ...editSub, ...data } });
            else dispatch({ type: 'ADD_SUBSCRIPTION', sub: data });
          }}
        />
      )}
    </div>
  );
}
