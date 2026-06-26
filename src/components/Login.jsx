import { useState } from 'react';
import { useBudget } from '../store.jsx';
import { DollarSign, Delete } from 'lucide-react';

export default function Login() {
  const { state, dispatch } = useBudget();
  const [digits, setDigits] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [error, setError] = useState('');

  const PIN_LEN = 6;

  function press(d) {
    if (digits.length >= PIN_LEN || shaking) return;
    const next = [...digits, d];
    setDigits(next);
    setError('');
    if (next.length === PIN_LEN) {
      setTimeout(() => verify(next.join('')), 80);
    }
  }

  function verify(pin) {
    if (pin === state.settings.pin) {
      dispatch({ type: 'AUTHENTICATE' });
    } else {
      setShaking(true);
      setError('Incorrect PIN. Try again.');
      setTimeout(() => { setShaking(false); setDigits([]); setError(''); }, 650);
    }
  }

  function backspace() {
    if (shaking) return;
    setDigits(d => d.slice(0, -1));
  }

  const rows = [['1','2','3'],['4','5','6'],['7','8','9'],['DEL','0','OK']];

  return (
    <div className="login-screen">
      <div className={`login-card pin-card ${shaking ? 'shake' : ''}`}>
        <div className="login-logo">
          <div className="login-logo-icon">
            <DollarSign size={28} color="#fff" />
          </div>
        </div>
        <h1 className="login-heading">Budget Manager</h1>
        <p className="login-sub">Enter your 6-digit PIN to continue</p>

        <div className="pin-dots">
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <div key={i} className={`pin-dot ${i < digits.length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="pin-error">{error} </div>

        <div className="pin-keypad">
          {rows.map((row, ri) => (
            <div key={ri} className="pin-row">
              {row.map(key => {
                if (key === 'DEL') return (
                  <button key={key} className="pin-key pin-key-del" onClick={backspace} aria-label="Delete">
                    <Delete size={18} />
                  </button>
                );
                if (key === 'OK') return (
                  <button
                    key={key}
                    className="pin-key pin-key-ok"
                    onClick={() => digits.length === PIN_LEN && verify(digits.join(''))}
                    disabled={digits.length !== PIN_LEN}
                    aria-label="Confirm"
                  >
                    OK
                  </button>
                );
                return (
                  <button key={key} className="pin-key" onClick={() => press(key)}>
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
