'use client';

export const CatMascot = ({ className = 'w-10 h-10' }) => (
  <img
    src="https://i.postimg.cc/cHR6mh41/Chat-cravate.png"
    alt="Mascotte IAMONJOB"
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const BrandArrow = ({ className = 'w-6 h-4' }) => (
  <svg className={className} viewBox="0 0 60 38" xmlns="http://www.w3.org/2000/svg" fill="none">
    <defs>
      <clipPath id="arrowShape">
        <path d="M0,7 L7,0 L7,11 L38,11 L38,0 L60,19 L38,38 L38,27 L7,27 L7,38 Z" />
      </clipPath>
    </defs>
    <path d="M0,7 L7,0 L7,11 L38,11 L38,0 L60,19 L38,38 L38,27 L7,27 L7,38 Z" fill="#E4197F" />
    <g clipPath="url(#arrowShape)" opacity="0.3">
      <line x1="-4" y1="34" x2="22" y2="4" stroke="white" strokeWidth="8" />
      <line x1="10" y1="34" x2="36" y2="4" stroke="white" strokeWidth="8" />
      <line x1="24" y1="34" x2="50" y2="4" stroke="white" strokeWidth="8" />
      <line x1="38" y1="34" x2="64" y2="4" stroke="white" strokeWidth="8" />
    </g>
  </svg>
);

/**
 * Logo IAMONJOB — image officielle.
 */
export const BrandLogo = ({ size = 'md', className = '' }) => {
  const heights = { sm: 'h-7', md: 'h-9', lg: 'h-12' };
  return (
    <img
      src="https://i.postimg.cc/FRy1Zps1/IAMONJOB.png"
      alt="IAMONJOB"
      className={`${heights[size] || heights.md} w-auto ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
};

export const SectionTitle = ({ icon: Icon, children, className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <BrandArrow className="w-7 h-5 shrink-0" />
    {Icon && <Icon className="w-5 h-5 text-teal-600 shrink-0" />}
    <span className="font-bold text-xl text-teal-700">{children}</span>
  </div>
);
