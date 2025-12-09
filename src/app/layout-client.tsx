'use client';

import { ContentProvider } from '@/context/ContentContext';
import AdBlockDetector from '@/components/AdBlockDetector';
import { useAntiDebug } from '@/hooks/useAntiDebug';

export const RootLayoutClient: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Activate anti-debugging protection (production only)
  useAntiDebug();

  return (
    <ContentProvider>
      <AdBlockDetector />
      {children}
    </ContentProvider>
  );
};
