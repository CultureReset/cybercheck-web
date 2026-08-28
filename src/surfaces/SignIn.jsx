import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { session } from '../lib/api.js';
import endpoints from '../lib/endpoints.js';
import { Field, ErrorBox } from '../ui/index.jsx';

/**
 * Sign in: a phone number, then the code that was texted to it.
 *
 * No password at either end, and no Supabase client in this bundle. The API
 * mints the session; this page only stores what it hands back.
 */
export default function SignIn() {
  const nav = useNavigate();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (fn) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const sendCode = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post(endpoints.session.signinCode(), { phone }, { auth: false });
      setStep('code');
    });
  };

  const verify = (e) => {
    e.preventDefault();
    run(async () => {
      const body = await api.post(endpoints.session.verifySigninCode(), { phone, code }, { auth: false });
      if (!body?.session?.access_token) throw new Error('The API did not return a session.');
      session.set(body.session);
      nav('/dashboard', { replace: true });
    });
  };

  return (
    <div className="wrap" style={{ paddingTop: 48, maxWidth: 440 }}>
      <div className="card pad stack">
        <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Sign in</h1>
        <ErrorBox error={error} />

        {step === 'phone' ? (
          <form className="stack" onSubmit={sendCode}>
            <Field label="Mobile number">
              <input className="input" type="tel" autoComplete="tel" required
                     value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <button className="btn primary" disabled={busy || !phone}>{busy ? 'Sending…' : 'Text me a code'}</button>
          </form>
        ) : (
          <form className="stack" onSubmit={verify}>
            <Field label="Code" hint={phone}>
              <input className="input" inputMode="numeric" autoComplete="one-time-code" required
                     value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => setStep('phone')}>Back</button>
              <span className="spacer" />
              <button className="btn primary" disabled={busy || !code}>{busy ? 'Checking…' : 'Sign in'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
