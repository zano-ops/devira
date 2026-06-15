interface IconProps {
  size?: number
  className?: string
}

export function DeviraIcon({ size = 40, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Document shape — navy background with top-right corner fold */}
      <path d="M6 6 L75 6 L94 25 L94 94 L6 94 Z" fill="#1E3A5F" />
      {/* White D letterform (outer + inner cutout via evenodd) */}
      <path
        d="M19 25 L50 25 Q75 25 75 52 Q75 80 50 80 L19 80 Z M30 37 L30 67 L48 67 Q63 67 63 52 Q63 37 48 37 Z"
        fill="white"
        fillRule="evenodd"
      />
      {/* Amber lightning bolt */}
      <polygon points="57,18 43,54 53,54 40,84 67,46 57,46" fill="#F4A435" />
    </svg>
  )
}

interface LogoProps {
  size?: number
  variant?: 'dark' | 'white'
  className?: string
}

export function DeviraLogo({ size = 36, variant = 'dark', className = '' }: LogoProps) {
  const textColor = variant === 'white' ? 'white' : '#1E3A5F'
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <DeviraIcon size={size} />
      <span
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: size * 0.58,
          color: textColor,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        devira
      </span>
    </div>
  )
}
