'use client';

import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  maxZoom?: number; // Optional dynamic max limit
}

export const ZoomControls = ({ zoom, onZoomChange, maxZoom = 190 }: ZoomControlsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const isZoomingRef = useRef(false); // Local lock for instant reaction

  useEffect(() => {
    const handleScroll = () => {
      // 1. If currently zooming (locked), update lastScrollY but DO NOT hide
      if (isZoomingRef.current) {
        setLastScrollY(window.scrollY);
        return;
      }
      
      const currentScrollY = window.scrollY;
      
      // 2. Tolerance check (ignore tiny scrolls like < 10px which might be rounding errors)
      if (Math.abs(currentScrollY - lastScrollY) < 10) return;

      // 3. Show/Hide Logic
      // Show when scrolling UP or at very top
      // Hide when scrolling DOWN
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setIsOpen(false); 
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleZoomInteraction = (newZoom: number) => {
    // LOCK visibility immediately
    isZoomingRef.current = true;
    setIsVisible(true); // Force show
    
    onZoomChange(newZoom);

    // Release lock after enough time for scroll adjustment to settle
    setTimeout(() => {
      isZoomingRef.current = false;
      // Update lastScrollY to current to prevent immediate hide on next small move
      setLastScrollY(window.scrollY); 
    }, 600);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 10, maxZoom);
    handleZoomInteraction(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 10, 40);
    handleZoomInteraction(newZoom);
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
              disabled={Number(zoom.toFixed(1)) >= Number(maxZoom.toFixed(1))}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>

            <div className="text-center text-xs font-mono text-muted-foreground w-full py-1 border-t border-b border-white/10 select-none">
              {Math.round(zoom)}%
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
