import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, startIcon, endIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-zinc-300 mb-1.5 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute left-3 text-zinc-400 pointer-events-none flex items-center">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg bg-zinc-800/80 border ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                : 'border-zinc-700/80 focus:border-indigo-500 focus:ring-indigo-500/30'
            } px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 transition-colors ${
              startIcon ? 'pl-9' : ''
            } ${endIcon ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 text-zinc-400 flex items-center">
              {endIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-zinc-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
