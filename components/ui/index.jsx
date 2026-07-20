'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, HelpCircle, Lock, X, FileText, CheckCircle2 } from 'lucide-react';

/* ─────────────────────────────────────── Button ─────────────────────────────────────── */
export const Button = ({
  children,
  onClick,
  disabled,
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  type = 'button',
}) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-7 py-3.5 text-base rounded-xl gap-2',
  };
  const base = `inline-flex items-center justify-center font-semibold transition-all shadow-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 focus:ring-offset-cream-100 ${sizes[size]}`;
  const variants = {
    primary:
      'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 disabled:bg-teal-200 disabled:cursor-not-allowed',
    secondary:
      'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50 hover:border-teal-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
    outline:
      'bg-transparent text-teal-700 border border-cream-300 hover:border-teal-500 hover:bg-cream-50',
    accent:
      'bg-pink-500 text-white hover:bg-pink-600 disabled:bg-pink-200 disabled:cursor-not-allowed',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
    ghost: 'bg-transparent text-teal-700 hover:bg-cream-200/70 shadow-none',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        Icon && <Icon className="w-4 h-4 shrink-0" />
      )}
      {children}
    </button>
  );
};

/* ─────────────────────────────────────── Card ─────────────────────────────────────── */
export const Card = ({ children, className = '', tone = 'default', ...rest }) => {
  const tones = {
    default: 'bg-white border-cream-200',
    cream:   'bg-cream-50 border-cream-200',
    teal:    'bg-teal-50/60 border-teal-100',
  };
  return (
    <div
      className={`hc-card rounded-2xl border shadow-card overflow-hidden ${tones[tone] || tones.default} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

/* ─────────────────────────────────────── Badge ─────────────────────────────────────── */
export const Badge = ({ children, variant = 'gray', className = '' }) => {
  const variants = {
    teal:    'bg-teal-50 text-teal-700 border-teal-200',
    blue:    'bg-teal-50 text-teal-700 border-teal-200',
    indigo:  'bg-teal-50 text-teal-700 border-teal-200',
    pink:    'bg-pink-50 text-pink-600 border-pink-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200',
    cream:   'bg-cream-100 text-cream-700 border-cream-300',
    gray:    'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${variants[variant] || variants.gray} ${className}`}
    >
      {children}
    </span>
  );
};

export const getScoreColor = (score) => {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
};

export const DifficultyBadge = ({ difficulty }) => {
  const map = {
    facile:   { color: 'emerald', label: 'Transfert Facile' },
    moyenne:  { color: 'amber',   label: 'Transfert Moyen' },
    difficile:{ color: 'rose',    label: 'Transfert Défi' },
  };
  const style = map[difficulty?.toLowerCase()] || map['moyenne'];
  return <Badge variant={style.color}>{style.label}</Badge>;
};

/* ─────────────────────────────────────── Tooltip d'aide « ? » ─────────────────────────────────────── */
/**
 * Bouton « ? » accessible qui affiche une bulle d'aide pédagogique.
 * Usage : <HelpTip label="Pistes de reconversion" description="Suggestions de métiers..." />
 */
export const HelpTip = ({ label, description, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={`Aide : ${label}`}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-cream-700 bg-cream-200 hover:bg-teal-100 hover:text-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-30 left-6 top-1/2 -translate-y-1/2 w-72 p-3 bg-white border border-cream-200 rounded-xl shadow-card text-left animate-fade-in"
        >
          <span className="block text-xs font-bold text-teal-700 mb-1">{label}</span>
          <span className="block text-xs text-teal-800/80 leading-relaxed">{description}</span>
        </span>
      )}
    </span>
  );
};

/* ─────────────────────────────────────── Bandeau RGPD ─────────────────────────────────────── */
export const PrivacyBanner = ({ children, className = '' }) => (
  <div className={`flex items-start gap-3 p-4 bg-cream-50 border border-cream-200 rounded-xl ${className}`}>
    <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
      <Lock className="w-4 h-4 text-white" />
    </div>
    <div className="text-sm text-teal-800 leading-relaxed">
      {children}
    </div>
  </div>
);

/* ─────────────────────────────────────── Aperçu fichier PDF ─────────────────────────────────────── */
export const FilePreview = ({ fileName, fileSize, pages, onChange, status = 'ok' }) => (
  <div className="flex items-center gap-4 p-4 bg-white border border-cream-200 rounded-xl">
    <div className="w-12 h-14 rounded-md bg-pink-50 border border-pink-200 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-bold text-pink-600">PDF</span>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-teal-800 truncate">{fileName}</span>
      </div>
      <div className="flex items-center gap-2 mt-1 text-xs text-teal-700/70">
        {status === 'ok' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Bien lu
          </span>
        )}
        {pages != null && <span>· {pages} {pages > 1 ? 'pages' : 'page'}</span>}
        {fileSize && <span>· {fileSize}</span>}
      </div>
    </div>
    {onChange && (
      <Button variant="secondary" size="sm" onClick={onChange}>Changer</Button>
    )}
  </div>
);

/* ─────────────────────────────────────── Bandeau étape – footer CTA ─────────────────────────────────────── */
export const StepFooter = ({ nextLabel, onAction, actionLabel, actionDisabled, secondary }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
    <p className="text-sm text-teal-800/80">
      {nextLabel && (
        <>
          <span className="text-teal-700/60">Prochaine étape :</span>{' '}
          <strong className="text-teal-700">{nextLabel}</strong>
        </>
      )}
    </p>
    <div className="flex items-center gap-3">
      {secondary}
      {actionLabel && (
        <Button onClick={onAction} disabled={actionDisabled} size="lg">
          {actionLabel}
        </Button>
      )}
    </div>
  </div>
);

/* ─────────────────────────────────────── Carte « IAMONJOB vous accompagne » ─────────────────────────────────────── */
export const GuidedIntro = ({ title = 'IAMONJOB VOUS ACCOMPAGNE', children, mascot }) => (
  <Card className="p-5 flex items-start gap-4" tone="default">
    {mascot}
    <div>
      <p className="text-xs font-bold tracking-wider text-teal-600 mb-1">{title}</p>
      <div className="text-teal-800 text-sm md:text-base leading-relaxed">{children}</div>
    </div>
  </Card>
);

/* ─────────────────────────────────────── Erreur globale ─────────────────────────────────────── */
export const ErrorBanner = ({ message, onClose }) => (
  <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 animate-fade-in">
    <div className="shrink-0 w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center mt-0.5">!</div>
    <div className="flex-1">
      <h3 className="font-semibold">Une erreur est survenue</h3>
      <p className="text-sm">{message}</p>
    </div>
    {onClose && (
      <button onClick={onClose} className="text-rose-400 hover:text-rose-700" aria-label="Fermer">
        <X className="w-5 h-5" />
      </button>
    )}
  </div>
);
