import React from 'react';

interface DomainAvatarProps {
  domain: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLOR_PAIRS = [
  { bg: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' },
  { bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' },
  { bg: 'bg-amber-600/20 text-amber-400 border-amber-500/30' },
  { bg: 'bg-rose-600/20 text-rose-400 border-rose-500/30' },
  { bg: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30' },
  { bg: 'bg-purple-600/20 text-purple-400 border-purple-500/30' },
  { bg: 'bg-teal-600/20 text-teal-400 border-teal-500/30' },
  { bg: 'bg-orange-600/20 text-orange-400 border-orange-500/30' },
];

export const DomainAvatar: React.FC<DomainAvatarProps> = ({
  domain,
  size = 'md',
  className = '',
}) => {
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
  const initial = (cleanDomain.charAt(0) || '?').toUpperCase();

  // Deterministic color hash based on domain
  let hash = 0;
  for (let i = 0; i < cleanDomain.length; i++) {
    hash = cleanDomain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % COLOR_PAIRS.length;
  const colorStyle = COLOR_PAIRS[colorIndex];

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg border font-mono font-medium shrink-0 select-none ${colorStyle.bg} ${sizeClasses[size]} ${className}`}
      title={cleanDomain}
    >
      {initial}
    </div>
  );
};
