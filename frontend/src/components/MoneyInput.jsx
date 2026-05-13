// src/components/MoneyInput.jsx
// Text input that formats monetary values with Colombian thousand-dot separators.
// Displays: "800.000"  "1.234.567"  "-50.000"
// Stores:    number in parent via onChange(number)
// Props:
//   value         – current numeric value (or '' when unset)
//   onChange      – called with a number
//   allowNegative – allow leading minus sign (credit cards)
//   className, placeholder, required, etc. – forwarded to <input>
import { useState, useEffect, useRef } from 'react';

function addDots(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function toDisplay(value) {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (isNaN(n) || n === 0) return '';
  const abs = Math.abs(n);
  return (n < 0 ? '-' : '') + addDots(String(abs));
}

export default function MoneyInput({ value, onChange, allowNegative = false, className, ...rest }) {
  const [display, setDisplay] = useState(() => toDisplay(value));
  // Track whether the displayed value was set by the user (don't clobber mid-typing)
  const userTypingRef = useRef(false);

  // Sync display when parent resets the value (e.g. modal close → form reset)
  useEffect(() => {
    if (!userTypingRef.current) {
      setDisplay(toDisplay(value));
    }
    userTypingRef.current = false;
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    userTypingRef.current = true;

    if (raw === '') {
      setDisplay('');
      onChange(0);
      return;
    }

    if (allowNegative && raw === '-') {
      setDisplay('-');
      return;
    }

    const negative = allowNegative && raw.startsWith('-');
    const digits   = raw.replace(/[^\d]/g, '');

    if (!digits) {
      setDisplay(negative ? '-' : '');
      return;
    }

    const formatted = addDots(digits);
    setDisplay(negative ? `-${formatted}` : formatted);
    const num = parseInt(digits, 10);
    onChange(negative ? -num : num);
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      className={className}
      {...rest}
    />
  );
}
