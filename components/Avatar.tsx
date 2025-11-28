import React from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar: React.FC<AvatarProps> = ({ 
  name, 
  src, 
  className = "", 
  size = "md" 
}) => {
  // Size mappings
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-24 h-24 text-3xl"
  };

  const baseClasses = `inline-flex items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-black text-white font-semibold select-none shadow-md ${sizeClasses[size]} ${className}`;

  if (src) {
    return (
      <img 
        src={src} 
        alt={name} 
        className={`object-cover rounded-full border border-gray-100 shadow-sm ${sizeClasses[size]} ${className}`}
      />
    );
  }

  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={baseClasses} title={name}>
      {initial}
    </div>
  );
};