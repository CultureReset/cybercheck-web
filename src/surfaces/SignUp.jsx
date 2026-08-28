import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { session } from '../lib/api.js';
import endpoints from '../lib/endpoints.js';
import { useAsync } from '../lib/useAsync.js';
import { Field, ErrorBox } from '../ui/index.jsx';
import { titleFor } from '../lib/discover.js';

/**
 * Sign up: number, code, then the business.
 *
 * The industry list is fetched, not typed out here — GET /api/gcr/taxonomy
 * is computed from the businesses that exist, so a kind of business nobody
 * has signed up as yet is still selectable the moment one does, and this
 * page never needs a new option added to it.
 *
 * Anyone can complete this. There is no allow-list and no invitation
 * required; that is what makes it a sign-up rather than an onboarding form.
 */
export default function SignUp() {
  const nav = useNavigate();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [form, setForm] = useState({ business_name: '', entity_type: '', city: '', website: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [similar, setSimilar] = useState([]);

  const taxonomy = useAsync(() => api.get(endpoints.public.taxonomy(), { auth: false }), []);
  const types = useMemo(() => {
    const rows = taxonomy.data?.subtypes || [];
    const seen = new Map();
    for (const r of rows) {
      if (!r.entity_type) continue;
      seen.set(r.entity_type, (seen.get(r.entity_type) || 0) + (r.entity_count || 0));
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
  }, [taxonomy.data]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const run = async (fn) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (err) { setError(err); } finally { setBusy(false); }
  };

  const sendCode = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post(endpoints.session.signupCode(), { phone }, { auth: false });
      setStep('code');
    });
  };

  const verify = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post(endpoints.session.verifySignupCode(), { phone, code }, { auth: false });
      setStep('business');
    });
  };

  // Before creating a second record for a business that is already listed,
  // offer the claim instead.
  const checkSimilar = async (name) => {
    set('business_name', name);
    if (name.trim().length < 4) return setSimilar([]);
    try {
      const body = await api.post(endpoints.session.similar(), { business_name: name }, { auth: false });
      setSimilar(body?.matches || body?.similar || []);
    } catch { setSimilar([]); }
  };

  const register = (e) => {
    e.preventDefault();
    run(async () => {
      const body = await api.post(endpoints.session.register(), { phone, code, ...form }, { auth: false });
      if (body?.session?.access_token) {
        session.set(body.session);
        nav('/dashboard', { replace: true });
      } else {
        setStep('done');
      }
    });
  };

  return (
    <div className="wrap" style={{ paddingTop: 48, maxWidth: 520 }}>
      <div className="card pad stack">
        <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Add your business</h1>
        <ErrorBox error={error} />

        {step === 'phone' ? (
          <form className="stack" onSubmit={sendCode}>
            <Field label="Mobile number" hint="this becomes your sign-in">
              <input className="input" type="tel" autoComplete="tel" required
                     value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <button className="btn primary" disabled={busy || !phone}>{busy ? 'Sending…' : 'Text me a code'}</button>
          </form>
        ) : null}

        {step === 'code' ? (
          <form className="stack" onSubmit={verify}>
            <Field label="Code" hint={phone}>
              <input className="input" inputMode="numeric" autoComplete="one-time-code" required
                     value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => setStep('phone')}>Back</button>
              <span className="spacer" />
              <button className="btn primary" disabled={busy || !code}>{busy ? 'Checking…' : 'Continue'}</button>
            </div>
          </form>
        ) : null}

        {step === 'business' ? (
          <form className="stack" onSubmit={register}>
            <Field label="Business name">
              <input className="input" required value={form.business_name}
                     onChange={(e) => checkSimilar(e.target.value)} />
            </Field>

            {similar.length ? (
              <div className="card pad stack" style={{ background: 'var(--surface-2)' }}>
                <div className="dim">Already listed? Claim it instead of adding a second one.</div>
                {similar.slice(0, 4).map((s) => (
                  <a className="btn sm" key={s.slug} href={`/b/${encodeURIComponent(s.slug)}`}>{s.name}</a>
                ))}
              </div>
            ) : null}

            <Field label="Kind of business">
              <select className="select" value={form.entity_type} onChange={(e) => set('entity_type', e.target.value)}>
                <option value="">—</option>
                {types.map((t) => <option key={t} value={t}>{titleFor(t)}</option>)}
              </select>
            </Field>

            <Field label="City"><input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Website" hint="optional"><input className="input" type="url" value={form.website} onChange={(e) => set('website', e.target.value)} /></Field>
            <Field label="Email" hint="optional"><input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>

            <div className="row">
              <button type="button" className="btn ghost" onClick={() => setStep('code')}>Back</button>
              <span className="spacer" />
              <button className="btn primary" disabled={busy || !form.business_name}>{busy ? 'Creating…' : 'Create account'}</button>
            </div>
          </form>
        ) : null}

        {step === 'done' ? (
          <div className="stack">
            <div>Your business was created.</div>
            <a className="btn primary" href="/signin">Sign in</a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
