import logoImage from '@assets/IMG_3906_1752586079724.png';

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
          src={logoImage}
          alt="WhiskerSwap Logo"
          className="object-contain rounded-full"
          style={{ width: icon, height: icon }}
          onLoad={() => console.log('✅ WhiskerSwap logo loaded successfully')}
          onError={(e) => {
            console.log('❌ WhiskerSwap logo failed to load, trying fallback');
            e.currentTarget.src = '/whisker-cat.png';
          }}
        />
        
        {/* Enhanced glow effect for the 3D logo */}
        <div className="absolute inset-0 rounded-full bg-teal-400/30 blur-lg -z-10"></div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-black ${text} text-[#7FFFD4] leading-none`}>
            WhiskerSwap Aggregator
          </h1>
        </div>
      )}
    </div>
  );
}
