'use client';
import { useState } from 'react';

interface CitizenEmailInputProps {
  value: string;
  onChange: (v: string) => void;
}

export default function CitizenEmailInput({ value, onChange }: CitizenEmailInputProps) {
  const [touched, setTouched] = useState(false);
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const showError = touched && value.length > 0 && !isValid;

  return (
    <div style={{ marginTop: 8 }}>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="your@email.com (BBMP replies come here)"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        style={{
          width: '100%',
          background: '#0e1a15',
          border: `1px solid ${showError ? '#e53e3e' : '#1e3028'}`,
          borderRadius: 10,
          padding: '12px 14px',
          color: '#f0ede8',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {showError && (
        <p style={{ color: '#e53e3e', fontFamily: 'DM Sans, sans-serif',
          fontSize: 11, marginTop: 4 }}>
          Enter a valid email address
        </p>
      )}
      <p style={{ color: '#8a9e96', fontFamily: 'DM Sans, sans-serif',
        fontSize: 11, marginTop: 4 }}>
        Optional but recommended. Not stored publicly.
      </p>
    </div>
  );
}
