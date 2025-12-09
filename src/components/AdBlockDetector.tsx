'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function AdBlockDetector() {
  const [isAdBlockActive, setIsAdBlockActive] = useState(false);

  useEffect(() => {
    // 1. Try to fetch the specific ad script we use
    const checkAdScript = async () => {
      try {
        await fetch('//pl28225883.effectivegatecpm.com/14f2871f9878b2714af48d0ba9d0af6e/invoke.js', { 
            method: 'HEAD', 
            mode: 'no-cors' // We expect opaque response, failure means network block
        });
      } catch (e) {
        // If fetch throws (e.g. ERR_BLOCKED_BY_CLIENT), it's likely an ad blocker
        console.log('Ad script blocked, detecting AdBlocker', e);
        setIsAdBlockActive(true);
        return;
      }

      // 2. Bait check - create an element that adblockers usually hide
      const bait = document.createElement('div');
      bait.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
      bait.setAttribute('style', 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;');
      document.body.appendChild(bait);

      // Check if it was blocked/hidden
      setTimeout(() => {
        if (
            window.getComputedStyle(bait).display === 'none' || 
            window.getComputedStyle(bait).visibility === 'hidden' ||
            bait.offsetParent === null
        ) {
          setIsAdBlockActive(true);
        }
        document.body.removeChild(bait);
      }, 100);
    };

    checkAdScript();
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  if (!isAdBlockActive) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/95 flex flex-col items-center justify-center p-4 text-center backdrop-blur-md">
      <div className="max-w-md w-full bg-zinc-900 border border-orange-500/20 rounded-xl p-8 shadow-2xl relative overflow-hidden">
        {/* Animated Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
        
        <ShieldAlert className="w-16 h-16 text-orange-500 mx-auto mb-6 animate-pulse" />
        
        <h2 className="text-2xl font-bold text-white mb-4">AdBlocker Detected</h2>
        
        <p className="text-gray-400 mb-8 leading-relaxed">
          We noticed you're using an ad blocker. We rely on ads to keep our servers running and provide free content.
          <br /><br />
          <span className="text-orange-400 font-medium">Please disable your ad blocker to continue.</span>
        </p>

        <Button 
          onClick={handleReload}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20"
        >
          I've Unblocked It
        </Button>
        
        <p className="text-xs text-zinc-600 mt-4">
          Clicking checking will reload the page
        </p>
      </div>
    </div>
  );
}
