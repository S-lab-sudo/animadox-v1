'use client';

import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const ZoomControls = ({ zoom, onZoomChange }: ZoomControlsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show button only when scrolling UP or at the very top
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setIsOpen(false); // Close panel when hiding
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 10, 190);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 10, 40);
    onZoomChange(newZoom);
  };

  return (
    <div className={`fixed bottom-6 left-6 z-50 transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
    }`}>
      {/* Main Zoom Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-transparent border-2 border-orange-500 text-orange-500 hover:bg-orange-500/10 shadow-lg cursor-pointer"
        aria-label="Zoom controls"
      >
        <Maximize2 className="h-4 w-4 md:h-5 md:w-5" />
      </Button>

      {/* Zoom Controls Panel */}
      {isOpen && (
        <div className="absolute bottom-16 left-0 bg-black/90 backdrop-blur-md border border-orange-500/50 rounded-lg shadow-xl p-2 min-w-[60px] text-white">
          <div className="flex flex-col gap-2 items-center">
            <style jsx>{`
                /* Ensure no scroll bars appear in potential edge cases */
                .zoom-panel { scrollbar-width: none; }
            `}</style>
            <Button
              onClick={handleZoomIn}
              size="icon"
              variant="outline"
              className="h-10 w-10 cursor-pointer bg-transparent border-orange-500/30 hover:bg-orange-500 hover:text-white transition-colors"
              disabled={zoom >= 190}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>

            <div className="text-center text-xs font-mono text-muted-foreground w-full py-1 border-t border-b border-white/10 select-none">
              {zoom}%
            </div>

            <Button
              onClick={handleZoomOut}
              size="icon"
              variant="outline"
              className="h-10 w-10 cursor-pointer bg-transparent border-orange-500/30 hover:bg-orange-500 hover:text-white transition-colors"
              disabled={zoom <= 40}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
