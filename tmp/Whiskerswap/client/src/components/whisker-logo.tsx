interface WhiskerLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function WhiskerLogo({ size = 'md', showText = true, className = '' }: WhiskerLogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 40, text: 'text-2xl' },
    xl: { icon: 48, text: 'text-3xl' }
  };
  
  const { icon, text } = sizes[size];
  
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* WhiskerSwap Logo - Cat SVG */}
      <div className="relative">
        <svg 
          width={icon} 
          height={icon} 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="rounded-full"
        >
          {/* Cat face background */}
          <circle cx="24" cy="24" r="22" fill="url(#gradient)" stroke="#0d9488" strokeWidth="2"/>
          
          {/* Cat ears */}
          <path d="M12 18L18 8L24 18" fill="#0d9488"/>
          <path d="M24 18L30 8L36 18" fill="#0d9488"/>
          
          {/* Cat eyes */}
          <ellipse cx="18" cy="22" rx="2" ry="3" fill="#ffffff"/>
          <ellipse cx="30" cy="22" rx="2" ry="3" fill="#ffffff"/>
          <circle cx="18" cy="22" r="1" fill="#0d9488"/>
          <circle cx="30" cy="22" r="1" fill="#0d9488"/>
          
          {/* Cat nose */}
          <path d="M24 26L22 28L26 28Z" fill="#f59e0b"/>
          
          {/* Cat mouth */}
          <path d="M20 30Q24 34 28 30" stroke="#0d9488" strokeWidth="2" fill="none"/>
          
          {/* Whiskers */}
          <line x1="8" y1="24" x2="14" y2="24" stroke="#0d9488" strokeWidth="1"/>
          <line x1="8" y1="28" x2="14" y2="26" stroke="#0d9488" strokeWidth="1"/>
          <line x1="34" y1="24" x2="40" y2="24" stroke="#0d9488" strokeWidth="1"/>
          <line x1="34" y1="26" x2="40" y2="28" stroke="#0d9488" strokeWidth="1"/>
          
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0"/>
              <stop offset="100%" stopColor="#14b8a6"/>
            </linearGradient>
          </defs>
        </svg>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-teal-500/20 blur-md -z-10"></div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-black ${text} text-teal-600 dark:text-teal-400 leading-none`}>
            WhiskerSwap Aggregator
          </h1>
        </div>
      )}
    </div>
  );
}