'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Content, fetchContents } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CachedData {
  [key: string]: Content[];
}

interface ContentDetailCache {
  [id: string]: {
    content: Content;
    chapters: Chapter[];
    timestamp: number;
  };
}

interface Chapter {
  id: string;
  content_id: string;
  number: number;
  title?: string;
}

interface ContentContextType {
  // State
  contents: Content[];
  loading: boolean;
  activeTab: string;
  searchQuery: string;
  
  // Cache
  cachedContents: CachedData;
  
  // Actions
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  loadContents: (tab: string, search: string) => Promise<void>;
  getCachedKey: (tab: string, search: string) => string;
  
  // Content Detail Cache
  getContentDetail: (id: string) => { content: Content; chapters: Chapter[] } | null;
  setContentDetail: (id: string, content: Content, chapters: Chapter[]) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

// Cache TTL for content details (5 minutes)
const DETAIL_CACHE_TTL = 5 * 60 * 1000;

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cachedContents, setCachedContents] = useState<CachedData>({});
  const { toast } = useToast();
  
  // Use ref for detail cache to avoid re-renders
  const contentDetailCache = useRef<ContentDetailCache>({});

  const getCachedKey = useCallback((tab: string, search: string): string => {
    try {
      return `${tab}::${search}`;
    } catch (error) {
      console.error("Error generating cache key:", error);
      return "error";
    }
  }, []);

  const loadContents = useCallback(async (tab: string, search: string) => {
    try {
      const cacheKey = getCachedKey(tab, search);

      // Check if data is already cached
      if (cachedContents[cacheKey]) {
        console.log('📦 [ContentContext] Using cached list data');
        setContents(cachedContents[cacheKey]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      const response = await fetchContents({
        contentType: tab,
        search: search,
        limit: 50
      });
      const data = response.data || [];
      
      // Store in cache
      setCachedContents(prev => ({
        ...prev,
        [cacheKey]: data
      }));
      
      setContents(data);
    } catch (error: unknown) {
      console.error("Error loading contents:", error);
      setContents([]);
      toast({
        title: "Error Loading Content",
        description: "Failed to load content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [cachedContents, getCachedKey, toast]);

  // Get cached content detail
  const getContentDetail = useCallback((id: string) => {
    const cached = contentDetailCache.current[id];
    if (cached && Date.now() - cached.timestamp < DETAIL_CACHE_TTL) {
      console.log('📦 [ContentContext] Using cached content detail for:', id);
      return { content: cached.content, chapters: cached.chapters };
    }
    return null;
  }, []);

  // Set content detail cache
  const setContentDetail = useCallback((id: string, content: Content, chapters: Chapter[]) => {
    contentDetailCache.current[id] = {
      content,
      chapters,
      timestamp: Date.now()
    };
    console.log('💾 [ContentContext] Cached content detail for:', id);
  }, []);

  const handleSetActiveTab = useCallback((tab: string) => {
    try {
      setActiveTab(tab);
    } catch (error) {
      console.error("Error setting active tab:", error);
    }
  }, []);

  const handleSetSearchQuery = useCallback((query: string) => {
    try {
      setSearchQuery(query);
    } catch (error) {
      console.error("Error setting search query:", error);
    }
  }, []);

  const value: ContentContextType = {
    contents,
    loading,
    activeTab,
    searchQuery,
    cachedContents,
    setActiveTab: handleSetActiveTab,
    setSearchQuery: handleSetSearchQuery,
    loadContents,
    getCachedKey,
    getContentDetail,
    setContentDetail,
  };

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContentContext = () => {
  try {
    const context = useContext(ContentContext);
    if (!context) {
      throw new Error('useContentContext must be used within ContentProvider');
    }
    return context;
  } catch (error) {
    console.error("Error in useContentContext:", error);
    throw error;
  }
};
