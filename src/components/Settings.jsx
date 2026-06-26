import { useState } from 'react';
import { useBudget } from '../store.jsx';
import { Save, AlertTriangle, Plus, Trash2 } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$',  name: 'US Dollar'         },
  { code: 'EUR', symbol: '€',  name: 'Euro'              },
  { code: 'GBP', symbol: '£',  name: 'British Pound'     },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen'      },
  { code: 'CAD', symbol: '$',  name: 'Canadian Dollar'   },
  { code: 'AUD', symbol: '$',  name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc'       },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee'      },
  { code: 'KRW', symbol: '₩',  name: 'Korean Won'        },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real'    },
  { code: 'MXN', symbol: '$',  name: 'Mexican Peso'      },
  { code: 'SGD', symbol: '$',  name: 'Singapore Dollar'  },
];

const PIN_LEN = 6;

function PinSetup({ pin, onChange }) {
  const [pinInput, setPinInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('view'); // 'view' | 'set' | 'clear'

  function handleSet() {
    if (pinInput.length !== PIN_LEN || !/^\d{6}$/.test(pinInput)) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    if (pinInput !== confirmInput) {
      setError('PINs do not match');
      return;
    }
    onChange(pinInput);
    setPinInput('');
    setConfirmInput('');
    setError('');
    setMode('view');
  }

  function handleClear() {
    onChange('');
    setMode('view');
  }

  if (mode === 'view') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          {pin ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {Array.from({ length: PIN_LEN }).map((_, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 6px var(--accent-blue)' }} />
              ))}
              <span style={{ fontSize: 12, color: 'var(--accent-green)', marginLeft: 8, fontWeight: 600 }}>PIN set</span>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No PIN — app is unprotected</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setMode('set')} style={{ fontSize: 12 }}>
            {pin ? 'Change PIN' : 'Set PIN'}
          </button>
          {pin && (
            <button className="btn btn-danger" onClick={() => setMode('clear')} style={{ fontSize: 12 }}>
              Remove PIN
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'clear') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Remove PIN protection? The app will be accessible without authentication.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setMode('view')}>Cancel</button>
          <button className="btn btn-danger" onClick={handleClear}>Remove PIN</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="form-group">
        <label className="form-label">New PIN (6 digits)</label>
        <input
          className="form-input"
          type="number"
          inputMode="numeric"
          pattern="\d{6}"
          placeholder="Enter 6-digit PIN"
          value={pinInput}
          onChange={e => { setPinInput(e.target.value.slice(0, 6)); setError(''); }}
          style={{ letterSpacing: '0.3em', fontWeight: 700 }}
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label">Confirm PIN</label>
        <input
          className="form-input"
          type="number"
          inputMode="numeric"
          pattern="\d{6}"
          placeholder="Re-enter PIN"
          value={confirmInput}
          onChange={e => { setConfirmInput(e.target.value.slice(0, 6)); setError(''); }}
          style={{ letterSpacing: '0.3em', fontWeight: 700 }}
        />
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--accent-red)' }}>{error}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => { setMode('view'); setError(''); setPinInput(''); setConfirmInput(''); }}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSet}>Set PIN</button>
      </div>
    </div>
  );
}

function PaycheckConfig({ config, categories, onChange }) {
  const [cfg, setCfg] = useState({
    amount: config.amount || 0,
    incomeCatId: config.incomeCatId || '',
    allocations: config.allocations || [],
  });

  const allExpSav = [...categories.expense, ...categories.savings];

  function addAlloc() {
    setCfg(p => ({ ...p, allocations: [...p.allocations, { catId: '', type: 'expense', pct: 0, label: '' }] }));
  }

  function setAlloc(idx, field, value) {
    setCfg(p => {
      const allocs = p.allocations.map((a, i) => {
        if (i !== idx) return a;
        const next = { ...a, [field]: value };
        if (field === 'catId') {
          const cat = allExpSav.find(c => c.id === value);
          next.label = cat?.name || '';
          next.type = categories.expense.some(c => c.id === value) ? 'expense' : 'savings';
        }
        return next;
      });
      return { ...p, allocations: allocs };
    });
  }

  function removeAlloc(idx) {
    setCfg(p => ({ ...p, allocations: p.allocations.filter((_, i) => i !== idx) }));
  }

  function save() {
    onChange({ ...cfg, amount: parseFloat(cfg.amount) || 0, allocations: cfg.allocations.map(a => ({ ...a, pct: parseFloat(a.pct) || 0 })) });
  }

  const totalPct = cfg.allocations.reduce((s, a) => s + (parseFloat(a.pct) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Default Paycheck Amount</label>
          <input
            className="form-input"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={cfg.amount}
            onChange={e => setCfg(p => ({ ...p, amount: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Income Category</label>
          <select className="form-select" value={cfg.incomeCatId} onChange={e => setCfg(p => ({ ...p, incomeCatId: e.target.value }))}>
            <option value="">Select category…</option>
            {categories.income.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <label className="form-label" style={{ margin: 0 }}>Allocation Rules</label>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }} onClick={addAlloc}>
            <Plus size={12} /> Add
          </button>
        </div>

        {cfg.allocations.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>
            No allocations — the Post Paycheck modal will just create an income transaction.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cfg.allocations.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                className="form-select"
                style={{ flex: 1 }}
                value={a.catId}
                onChange={e => setAlloc(i, 'catId', e.target.value)}
              >
                <option value="">Select category…</option>
                <optgroup label="Expenses">
                  {categories.expense.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
                <optgroup label="Savings">
                  {categories.savings.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              </select>
              <input
                className="form-input"
                type="number"
                min="0"
                max="100"
                step="0.1"
                style={{ width: 80, textAlign: 'right' }}
                value={a.pct}
                onChange={e => setAlloc(i, 'pct', e.target.value)}
                placeholder="%"
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 16 }}>%</span>
              <button className="delete-btn" onClick={() => removeAlloc(i)}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>

        {cfg.allocations.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>Total:</span>
            <strong style={{ color: totalPct > 100 ? 'var(--accent-red)' : totalPct === 100 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
              {totalPct.toFixed(1)}%
            </strong>
            {totalPct > 100 && <span style={{ color: 'var(--accent-red)' }}>Exceeds 100%</span>}
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={save} style={{ alignSelf: 'flex-start' }}>
        Save Paycheck Config
      </button>
    </div>
  );
}

export default function Settings() {
  const { state, dispatch } = useBudget();
  const { settings, categories } = state;
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    startYear:       settings.startYear,
    currency:        settings.currency,
    currencyCode:    settings.currencyCode,
    savingsRateMode: settings.savingsRateMode,
    shiftLateIncome: settings.shiftLateIncome,
    shiftDay:        settings.shiftDay,
  });

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })); }

  function handleCurrencyChange(code) {
    const cur = CURRENCIES.find(c => c.code === code);
    if (cur) setForm(prev => ({ ...prev, currencyCode: cur.code, currency: cur.symbol }));
  }

  function save() {
    dispatch({ type: 'UPDATE_SETTINGS', settings: form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetData() {
    if (window.confirm('Permanently delete ALL budget data, transactions, subscriptions, and settings? This cannot be undone.')) {
      localStorage.removeItem('budgetmanager_v1');
      window.location.reload();
    }
  }

  const yearOptions = [];
  for (let y = 2020; y <= 2035; y++) yearOptions.push(y);

  return (
    <div className="page-body">
      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* General */}
        <div className="card">
          <div className="card-title">General</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Starting Year</label>
              <select className="form-select" value={form.startYear} onChange={e => set('startYear', parseInt(e.target.value))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Base year for your budget. Set once and leave it.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={form.currencyCode} onChange={e => handleCurrencyChange(e.target.value)}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Security — PIN */}
        <div className="card">
          <div className="card-title">Security — PIN Lock</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              A 6-digit PIN is required on every page load. Session is in-memory only — refreshing always requires re-authentication.
            </span>
            <PinSetup
              pin={settings.pin}
              onChange={pin => dispatch({ type: 'UPDATE_SETTINGS', settings: { pin } })}
            />
          </div>
        </div>

        {/* KPI Calculation */}
        <div className="card">
          <div className="card-title">KPI Calculation</div>
          <div className="form-group">
            <label className="form-label">Savings Rate Calculation Method</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="radio" name="savingsMode" value="savings" checked={form.savingsRateMode === 'savings'} onChange={() => set('savingsRateMode', 'savings')} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Active — % allocated to Savings</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>SR = Savings / Income</div>
                </div>
              </label>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="radio" name="savingsMode" value="passive" checked={form.savingsRateMode === 'passive'} onChange={() => set('savingsRateMode', 'passive')} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Passive — % not allocated to Expenses</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>SR = (Income − Expenses) / Income</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Late Income Shift */}
        <div className="card">
          <div className="card-title">Late Monthly Income</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Shift Late Income</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 360 }}>
                  Treat income received on or after a certain day as income for the next month.
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={form.shiftLateIncome} onChange={e => set('shiftLateIncome', e.target.checked)} />
                <span className="switch-slider" />
              </label>
            </div>
            {form.shiftLateIncome && (
              <div className="form-group">
                <label className="form-label">Starting on day:</label>
                <input
                  className="form-input"
                  type="number"
                  min="1" max="31"
                  value={form.shiftDay}
                  onChange={e => set('shiftDay', parseInt(e.target.value) || 20)}
                  style={{ width: 100 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Income on day {form.shiftDay}+ will count toward next month.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Paycheck Config */}
        <div className="card">
          <div className="card-title">Paycheck Configuration</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, display: 'block' }}>
            Pre-configure paycheck amounts and split percentages. These pre-fill the "Post Paycheck" button in Transactions.
          </span>
          <PaycheckConfig
            config={settings.paycheckConfig}
            categories={categories}
            onChange={cfg => dispatch({ type: 'UPDATE_SETTINGS', settings: { paycheckConfig: cfg } })}
          />
        </div>

        {/* Save general settings */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={save}>
            <Save size={14} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
          {saved && <span style={{ fontSize: 13, color: 'var(--accent-green)' }}>Settings saved successfully.</span>}
        </div>

        {/* Danger zone */}
        <div style={{ marginTop: 16, padding: 20, border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius)', background: 'rgba(248,113,113,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--accent-red)', fontWeight: 700 }}>
            <AlertTriangle size={16} />
            Danger Zone
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Permanently deletes all budget data, transactions, subscriptions, portfolio, and custom categories. Cannot be undone.
          </p>
          <button className="btn btn-danger" onClick={resetData}>Reset All Data</button>
        </div>
      </div>
    </div>
  );
}
