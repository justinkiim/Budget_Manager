import { useState, useMemo } from 'react';
import { useBudget, fmt, fmtCompact, fetchStockPrice } from '../store.jsx';
import { Plus, Trash2, Pencil, RefreshCw, X, TrendingUp, TrendingDown } from 'lucide-react';

function HoldingModal({ holding, onClose, onSave }) {
  const [form, setForm] = useState(holding || { ticker: '', shares: '' });

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!form.ticker || !form.shares) return;
    onSave({ ...form, ticker: form.ticker.toUpperCase(), shares: parseFloat(form.shares) });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {holding ? 'Edit Holding' : 'Add Holding'}
          <button className="delete-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Ticker Symbol *</label>
            <input
              className="form-input"
              placeholder="e.g. AAPL, VTI, BTC-USD"
              value={form.ticker}
              onChange={e => set('ticker', e.target.value.toUpperCase())}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Shares / Units *</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={form.shares}
              onChange={e => set('shares', e.target.value)}
              required
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{holding ? 'Save' : 'Add Holding'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const { state, dispatch } = useBudget();
  const { portfolio, settings } = state;
  const { currency } = settings;

  const [showModal, setShowModal] = useState(false);
  const [editH, setEditH] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshPrices() {
    if (refreshing || portfolio.length === 0) return;
    setRefreshing(true);
    await Promise.all(
      portfolio.map(async h => {
        const price = await fetchStockPrice(h.ticker);
        if (price !== null) {
          dispatch({
            type: 'UPDATE_HOLDING',
            holding: { id: h.id, price, lastUpdated: new Date().toISOString() },
          });
        }
      })
    );
    setRefreshing(false);
  }

  function remove(id) {
    if (window.confirm('Remove this holding?')) dispatch({ type: 'DELETE_HOLDING', id });
  }

  const totalValue = useMemo(() =>
    portfolio.reduce((s, h) => s + (h.price || 0) * h.shares, 0),
  [portfolio]);

  const best = useMemo(() => {
    const withPrice = portfolio.filter(h => h.price > 0);
    return withPrice.length > 0 ? withPrice.reduce((a, b) => a.price > b.price ? a : b) : null;
  }, [portfolio]);

  const activeCount = portfolio.length;

  return (
    <div className="page-body">
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Portfolio Value</div>
          <div className="kpi-value">{fmtCompact(totalValue, currency)}</div>
          <div className="kpi-sub">{activeCount} holding{activeCount !== 1 ? 's' : ''}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Top Holding</div>
          <div className="kpi-value" style={{ fontSize: 20 }}>{best ? best.ticker : '—'}</div>
          <div className="kpi-sub">{best ? fmtCompact((best.price || 0) * best.shares, currency) : 'No prices yet'}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Last Refreshed</div>
          <div className="kpi-value" style={{ fontSize: 16, letterSpacing: 0 }}>
            {portfolio.find(h => h.lastUpdated)
              ? new Date(portfolio.find(h => h.lastUpdated).lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </div>
          <div className="kpi-sub">market prices</div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Holdings</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={refreshPrices}
              disabled={refreshing || portfolio.length === 0}
              style={{ gap: 6 }}
            >
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing…' : 'Refresh Prices'}
            </button>
            <button className="btn btn-primary" onClick={() => { setEditH(null); setShowModal(true); }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {portfolio.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={36} style={{ opacity: 0.3 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No holdings yet</div>
              <div style={{ fontSize: 12 }}>Add tickers and share counts — prices fetch from Yahoo Finance</div>
            </div>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0, boxShadow: 'none', background: 'transparent' }}>
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th style={{ textAlign: 'right' }}>Shares</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                  <th style={{ textAlign: 'right' }}>% of Portfolio</th>
                  <th style={{ width: 72 }}></th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map(h => {
                  const value = (h.price || 0) * h.shares;
                  const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
                  return (
                    <tr key={h.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'rgba(96,165,250,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: 'var(--accent-blue)',
                          }}>
                            {h.ticker.slice(0, 3)}
                          </div>
                          <span style={{ fontWeight: 700 }}>{h.ticker}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {h.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {h.price ? fmt(h.price, currency) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {value > 0 ? fmtCompact(value, currency) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <div style={{ width: 60, height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 36, textAlign: 'right' }}>
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="edit-btn" onClick={() => { setEditH(h); setShowModal(true); }}>
                            <Pencil size={13} />
                          </button>
                          <button className="delete-btn" onClick={() => remove(h.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totalValue > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td colSpan={3} style={{ fontWeight: 700, padding: '10px 14px', color: 'var(--text-secondary)' }}>Total</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)', fontSize: 15, padding: '10px 14px' }}>
                      {fmtCompact(totalValue, currency)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--accent-blue)' }}>Live prices:</strong> Click "Refresh Prices" to fetch current market prices via Yahoo Finance. Prices are stored locally and not updated automatically.
      </div>

      {showModal && (
        <HoldingModal
          holding={editH}
          onClose={() => { setShowModal(false); setEditH(null); }}
          onSave={data => {
            if (editH) dispatch({ type: 'UPDATE_HOLDING', holding: { ...editH, ...data } });
            else dispatch({ type: 'ADD_HOLDING', holding: data });
          }}
        />
      )}
    </div>
  );
}
