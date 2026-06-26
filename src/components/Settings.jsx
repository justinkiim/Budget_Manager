import { useState } from 'react';
import { useBudget } from '../store.jsx';
import { Save, AlertTriangle, Eye, EyeOff } from 'lucide-react';

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

export default function Settings() {
  const { state, dispatch } = useBudget();
  const { settings } = state;
  const [saved, setSaved] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    startYear:       settings.startYear,
    currency:        settings.currency,
    currencyCode:    settings.currencyCode,
    savingsRateMode: settings.savingsRateMode,
    shiftLateIncome: settings.shiftLateIncome,
    shiftDay:        settings.shiftDay,
    password:        settings.password || '',
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
      <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>

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

        {/* Security */}
        <div className="card">
          <div className="card-title">Security</div>
          <div className="form-group">
            <label className="form-label">App Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPwd ? 'text' : 'password'}
                style={{ paddingRight: 40 }}
                placeholder="Leave empty to disable password protection"
                value={form.password}
                onChange={e => set('password', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => !s)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              When set, a login screen appears on every page load. Leave empty to disable.
            </span>
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

        {/* Save */}
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
            Permanently deletes all budget data, transactions, subscriptions, and custom categories. Cannot be undone.
          </p>
          <button className="btn btn-danger" onClick={resetData}>Reset All Data</button>
        </div>
      </div>
    </div>
  );
}
