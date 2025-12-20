"use client"

import React, { useState, useRef, useEffect } from "react";
import { Divide, MoveHorizontal } from "lucide-react";

interface BeforeAfterCompareProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
}

export default function BeforeAfterCompare({ beforeImage, afterImage, className }: BeforeAfterCompareProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (event: MouseEvent | TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const position = ((clientX - containerRect.left) / containerRect.width) * 100;

    setSliderPosition(Math.min(Math.max(position, 0), 100));
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none cursor-ew-resize group ${className || ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
    >
      {/* After Image (Background) */}
      <img 
        src={afterImage} 
        alt="After" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
      />

      {/* Before Image (Clipped) */}
      <div 
        className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none border-r border-white/50"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
            src={beforeImage} 
            alt="Before" 
            className="absolute inset-0 w-full h-full object-contain max-w-none"
            style={{ width: containerRef.current?.getBoundingClientRect().width || '100%' }}
        />
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute inset-y-0 w-1 bg-white cursor-ew-resize flex items-center justify-center z-10 shadow-lg"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md">
            <MoveHorizontal className="w-4 h-4" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs pointer-events-none">Before</div>
      <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs pointer-events-none">After</div>
    </div>
  );
}
