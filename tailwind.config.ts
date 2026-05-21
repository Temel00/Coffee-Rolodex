import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    // Replace core color palette with CSS-variable-backed tokens
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--color-bg)',
      surface: 'var(--color-surface)',
      'surface-elevated': 'var(--color-surface-elevated)',
      'surface-hover': 'var(--color-surface-hover)',
      primary: 'var(--color-primary)',
      'primary-hover': 'var(--color-primary-hover)',
      'primary-text': 'var(--color-primary-text)',
      text: 'var(--color-text)',
      'text-muted': 'var(--color-text-muted)',
      'text-faint': 'var(--color-text-faint)',
      border: 'var(--color-border)',
      'border-subtle': 'var(--color-border-subtle)',
      success: 'var(--color-success)',
      danger: 'var(--color-danger)',
      warning: 'var(--color-warning)',
      inactive: 'var(--color-inactive)',
      white: '#ffffff',
      black: '#000000',
    },
    // Replace font sizes with CSS-variable-backed tokens
    fontSize: {
      sm:   ['var(--font-sm)',   { lineHeight: '1.5' }],
      base: ['var(--font-base)', { lineHeight: '1.6' }],
      lg:   ['var(--font-lg)',   { lineHeight: '1.5' }],
      xl:   ['var(--font-xl)',   { lineHeight: '1.4' }],
      '2xl':['var(--font-2xl)', { lineHeight: '1.3' }],
      '3xl':['var(--font-3xl)', { lineHeight: '1.2' }],
    },
    // Replace border radius with CSS-variable-backed tokens
    borderRadius: {
      none: '0',
      sm:   'var(--radius-sm)',
      DEFAULT: 'var(--radius-md)',
      md:   'var(--radius-md)',
      lg:   'var(--radius-lg)',
      xl:   'var(--radius-xl)',
      full: '9999px',
    },
    extend: {
      minHeight: {
        touch: '48px',
        screen: '100vh',
      },
      minWidth: {
        touch: '48px',
      },
      height: {
        screen: '100vh',
      },
      spacing: {
        // Named spacing tokens that map to CSS variables
        'token-1': 'var(--space-1)',
        'token-2': 'var(--space-2)',
        'token-3': 'var(--space-3)',
        'token-4': 'var(--space-4)',
        'token-6': 'var(--space-6)',
        'token-8': 'var(--space-8)',
        'token-10': 'var(--space-10)',
        'token-12': 'var(--space-12)',
      },
    },
  },
  plugins: [],
}

export default config
