import { useState } from 'react';
import { useBudget } from '../store.jsx';
import { DollarSign, Eye, EyeOff, Lock } from 'lucide-react';

export default function Login() {
  const { state, dispatch } = useBudget();
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  function attempt(e) {
    e.preventDefault();
    if (value === state.settings.password) {
      dispatch({ type: 'AUTHENTICATE' });
    } else {
      setError('Incorrect password. Try again.');
      setShaking(true);
      setValue('');
      setTimeout(() => setShaking(false), 500);
    }
  }

  return (
    <div className="login-screen">
      <div className={`login-card ${shaking ? 'shake' : ''}`}>
        <div className="login-logo">
          <div className="login-logo-icon">
            <DollarSign size={28} color="#fff" />
          </div>
        </div>

        <h1 className="login-heading">Budget Manager</h1>
        <p className="login-sub">Enter your password to access your financial data</p>

        <form onSubmit={attempt}>
          <div className="login-input-wrap">
            <input
              className="login-input"
              type={show ? 'text' : 'password'}
              placeholder="Password"
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              autoFocus
            />
            <button type="button" className="login-eye-btn" onClick={() => setShow(s => !s)}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="login-error">{error}</div>

          <button type="submit" className="login-btn">
            <Lock size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
