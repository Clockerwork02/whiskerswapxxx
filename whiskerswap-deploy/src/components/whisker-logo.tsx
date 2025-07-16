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
      {/* WhiskerSwap Logo - Beautiful 3D Cat */}
      <div className="relative">
        <img 
          src="/whisker-logo.png"
          alt="WhiskerSwap Logo"
          className="object-contain"
          style={{ width: icon, height: icon }}
        />
        
        {/* Enhanced glow effect for the 3D logo */}
        <div className="absolute inset-0 rounded-full bg-teal-400/30 blur-lg -z-10"></div>
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
