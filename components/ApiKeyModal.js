'use client';

import { useState } from 'react';
import { getCommonCopy } from '@/lib/locales';
import { isCredentialComplete, serializeCredential } from 'studio';

export default function ApiKeyModal({ providers = [], initialProviderId, onSave, onClose, overlay = false, title, subtitle, locale = 'en' }) {
  const [providerId, setProviderId] = useState(initialProviderId || providers[0]?.id);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const copy = getCommonCopy(locale).apiKeyModal;
  const provider = providers.find((item) => item.id === providerId) || providers[0];
  const fields = provider?.credential.fields || [];
  const helpUrl = provider?.credential.helpUrl;

  const handleProviderChange = (nextId) => {
    setProviderId(nextId);
    setValues({});
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!provider || !isCredentialComplete(provider.credential, values)) { setError(copy.missingKeyError); return; }
    onSave(serializeCredential(provider.credential, values), provider.id);
  };

  const wrapperClass = overlay
    ? 'fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 font-inter animate-fade-in-up'
    : 'min-h-screen bg-[#030303] flex items-center justify-center px-4 font-inter';

  return (
    <div className={wrapperClass}>
      <div className="w-full max-w-sm bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-xl p-10 shadow-2xl relative">
        {overlay && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="absolute top-3 right-3 w-8 h-8 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-14 h-14 bg-[#22d3ee]/5 rounded-2xl flex items-center justify-center border border-[#22d3ee]/10 mb-6 group hover:border-[#22d3ee]/30 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" className="group-hover:scale-110 transition-transform">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L12 17.25l-4.5-4.5L15.5 7.5z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mb-2">
            {title || copy.title}
          </h1>
          <p className="text-white/40 text-[13px] leading-relaxed px-4">
            {subtitle || (
              <>{copy.subtitlePrefix} <a href={helpUrl} target="_blank" rel="noreferrer" className="text-[#22d3ee] hover:text-[#e5ff33] transition-colors">{provider?.name}</a> {copy.subtitleSuffix}</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {providers.length > 1 && (
            <div className="space-y-2">
              <label htmlFor="provider-select" className="block text-xs font-bold text-white/30 ml-1">
                {copy.provider}
              </label>
              <select
                id="provider-select"
                value={provider?.id}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full bg-white/5 border border-white/[0.03] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#22d3ee]/30 transition-all"
                suppressHydrationWarning
              >
                {providers.map((item) => (
                  <option key={item.id} value={item.id} className="bg-[#0a0a0a]">{item.name}</option>
                ))}
              </select>
            </div>
          )}

          {fields.map((field, index) => (
            <div key={`${provider.id}:${field.name}`} className="space-y-2">
              <label htmlFor={`credential-${field.name}`} className="block text-xs font-bold text-white/30 ml-1">
                {fields.length > 1 ? field.label : copy.label}
              </label>
              <input
                id={`credential-${field.name}`}
                type={field.secret ? 'password' : 'text'}
                value={values[field.name] || ''}
                onChange={(e) => { setValues((previous) => ({ ...previous, [field.name]: e.target.value })); setError(''); }}
                placeholder={copy.placeholder}
                autoFocus={index === 0}
                className="w-full bg-white/5 border border-white/[0.03] rounded-md px-5 py-3 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-[#22d3ee]/30 focus:bg-white/[0.07] transition-all"
                suppressHydrationWarning
              />
            </div>
          ))}
          {error && <p className="-mt-4 text-red-500/80 text-[11px] font-medium ml-1">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#22d3ee] text-black font-medium py-2.5 rounded-md hover:bg-[#e5ff33] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#22d3ee]/5"
            suppressHydrationWarning
          >
            {copy.submit}
          </button>

          {helpUrl && (
            <p className="text-center text-[12px] text-white/20 pt-2">
              {copy.needKey}{' '}
              <a href={helpUrl} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#22d3ee] transition-colors font-medium">
                {copy.getOneFree}
              </a>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
