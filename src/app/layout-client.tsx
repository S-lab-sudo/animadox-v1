'use client';

import { ContentProvider } from '@/context/ContentContext';

export const RootLayoutClient: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ContentProvider>
      {children}
    </ContentProvider>
  );
};
