'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown, Volume2, VolumeX, BookOpen } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ZoomControls } from '@/components/ZoomControls';
import { GoToTopButton } from '@/components/GoToTopButton';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getOrCreateSessionToken,
  saveReadingProgress,
  addChapterToHistory,
  isChapterVisited,
  getReadingProgress,
} from '@/lib/userTracking';

// Dynamic API URL - serverless API routes
const getApiBaseUrl = (): string => {
  // Serverless routes at same origin
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

interface ChapterPage {
  id: string;
  chapter_id: string;
  page_number: number;
  image_url: string;
}

interface Chapter {
  id: string;
  content_id: string;
  number: number;
  title: string;
  pages?: ChapterPage[];
}

interface ActiveChapter {
  chapter: Chapter;
  pages: ChapterPage[];
  isLocked: boolean;
  startIndex: number; // Global index where this chapter starts (for sequential loading)
}

export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contentId = params.id as string;
  const initialChapterId = searchParams.get('chapter');
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 [ReaderPage] Component Mounted');
    return () => console.log('🛑 [ReaderPage] Component Unmounted');
  }, []);

  // State management
  const [activeChapters, setActiveChapters] = useState<ActiveChapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [contentTitle, setContentTitle] = useState<string>('');

  // Load zoom from local storage
  useEffect(() => {
    const savedZoom = localStorage.getItem('reader-zoom');
    if (savedZoom) {
      setZoom(Number(savedZoom));
    }
  }, []);

  // Save zoom to local storage
  useEffect(() => {
    localStorage.setItem('reader-zoom', zoom.toString());
  }, [zoom]);
  
  // Sequential Loading State (Waterfall) - MangaFlow approach
  // This number represents the highest GLOBAL image index allowed to load.
  // It increments only when the previous image loads.
  const [maxAllowedIndex, setMaxAllowedIndex] = useState<number>(0);

  // --- SEQUENTIAL LOADER ---
  const handleImageLoad = useCallback((globalIndex: number) => {
    try {
      // When image N loads, allow N+1 to load
      setMaxAllowedIndex(prev => {
          if (globalIndex >= prev) {
              return globalIndex + 1;
          }
          return prev;
      });
    } catch (error) {
      console.error("Error in handleImageLoad:", error);
    }
  }, []);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const allChaptersRef = useRef<Chapter[]>([]);
  // Track which chapters have had their progress saved in this session
  // Track which chapters have had their progress saved in this session
  // Initialize synchronously from sessionStorage to prevent race conditions with fast image loads
  const trackedChaptersRef = useRef<Set<string>>(null as any);
  if (trackedChaptersRef.current === null) {
      // Lazy initialization logic that runs once synchronously
      let initialSet = new Set<string>();
      if (typeof sessionStorage !== 'undefined') {
        try {
          const stored = sessionStorage.getItem(`tracked_chapters_${contentId}`);
          if (stored) {
             const parsed = JSON.parse(stored);
             if (Array.isArray(parsed)) {
               initialSet = new Set(parsed);
               console.log(`♻️ [Reader] Synchronously restored ${parsed.length} tracked chapters`);
             }
          }
        } catch (e) {
          console.error('Failed to restore tracked chapters:', e);
        }
      }
      trackedChaptersRef.current = initialSet;
  }

  // Fetch all chapters for the content
  const fetchAllChapters = useCallback(async () => {
    try {
      console.time('fetch_all_chapters');
      const response = await fetch(`${API_BASE_URL}/chapters/${contentId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch chapters`);
      }
      const data = await response.json();
      console.timeEnd('fetch_all_chapters');
      return data.data || [];
    } catch (err: any) {
      toast({
        title: 'Error Loading Chapters',
        description: err?.message || 'Failed to load chapters',
        variant: 'destructive',
      });
      return [];
    }
  }, [contentId, toast]);

  // Fetch pages for a specific chapter
  const fetchChapterPages = useCallback(async (chapterId: string) => {
    try {
      // Removed fetchedChaptersRef check to ensure we always get pages
      // This fixes the issue where re-initialization would return null/empty pages
      console.time(`fetch_chapter_pages_${chapterId}`);
            
      const response = await fetch(`${API_BASE_URL}/chapter/${chapterId}/pages`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch pages`);
      }
      
      const data = await response.json();
      console.timeEnd(`fetch_chapter_pages_${chapterId}`);
      
      // Return pages in correct format
      return data.data?.pages || [];
    } catch (err: any) {
      toast({
        title: 'Error Loading Pages',
        description: err?.message || `Failed to load pages for chapter ${chapterId}`,
        variant: 'destructive',
      });
      return [];
    }
  }, [toast]);

  // Initialize with starting chapter - Load up to 4 chapters
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        console.time('total_init_time');
        
        // Fetch content title
        try {
          const contentResponse = await fetch(`${API_BASE_URL}/content/${contentId}`);
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            setContentTitle(contentData.data?.title || '');
          }
        } catch (err) {
          console.error('Failed to fetch content title:', err);
        }

        const allChapters = await fetchAllChapters();

        if (allChapters.length === 0) {
          setError('No chapters found');
          toast({
            title: 'No Chapters Available',
            description: 'This content has no chapters yet',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Store all chapters in ref for later preloading
        allChaptersRef.current = allChapters;

        // Find starting chapter index
        let startIndex = 0;
        if (initialChapterId) {
          const idx = allChapters.findIndex((ch: Chapter) => ch.id === initialChapterId);
          startIndex = idx !== -1 ? idx : 0;
        }

        // Load first chapter
        const firstChapter = allChapters[startIndex];
        const pages = await fetchChapterPages(firstChapter.id);

        // Initialize with current chapter
        const initialActive: ActiveChapter[] = [
          {
            chapter: firstChapter,
            pages: pages || [],
            isLocked: false,
            startIndex: 0,
          },
        ];

        // Preload up to 4 more chapters (total 5 chapters)
        let currentStartIndex = pages?.length || 0;
        
        for (let i = 1; i <= 4; i++) {
          if (startIndex + i < allChapters.length) {
            const nextChapter = allChapters[startIndex + i];
            const nextPages = await fetchChapterPages(nextChapter.id);

            initialActive.push({
              chapter: nextChapter,
              pages: nextPages || [],
              isLocked: true,
              startIndex: currentStartIndex,
            });

            currentStartIndex += (nextPages?.length || 0);
          }
        }

        setActiveChapters(initialActive);
        setCurrentChapterIndex(0); // Always start at index 0 of activeChapters
        setError(null);

        // Removed immediate tracking here. 
        // Tracking is now handled by the image load progress monitor (useEffect)
        // to prioritize image loading bandwidth.
      } catch (err: any) {
        setError('Failed to load chapters');
        toast({
          title: 'Initialization Error',
          description: err?.message || 'Failed to initialize reader',
          variant: 'destructive',
        });
      } finally {
        console.timeEnd('total_init_time');
        setLoading(false);
      }
    };

    initialize();
  }, [contentId, initialChapterId, fetchAllChapters, fetchChapterPages, toast]);



  // Handle scroll for hiding/showing header
  useEffect(() => {
    const handleScroll = () => {
      try {
        const currentScrollY = window.scrollY;
        const scrollDifference = Math.abs(currentScrollY - lastScrollY);
        const scrollThreshold = window.innerHeight * 0.05; // 5% of viewport height

        if (scrollDifference > scrollThreshold) {
          // Scrolling down
          if (currentScrollY > lastScrollY) {
            setShowHeader(false);
          } 
          // Scrolling up
          else {
            setShowHeader(true);
          }
          setLastScrollY(currentScrollY);
        }
      } catch (error) {
        console.error("Error in handleScroll:", error);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Handle chapter navigation without scroll
  const handleReadNextChapterNoScroll = useCallback(async () => {
    try {
      const nextIdx = currentChapterIndex + 1;
      
      // Check if next chapter exists
      if (nextIdx >= activeChapters.length) {
        console.log('⚠️ [Reader] No more chapters available');
        return;
      }

      console.log(`➡️ [Reader] Moving to chapter index ${nextIdx}`);
      
        // Removed immediate tracking here.
        // Tracking is deferred until 25% of images load.
      
      // Update current chapter index first
      setCurrentChapterIndex(nextIdx);
      
      // Unlock the chapter and cleanup old DOM if needed
      setActiveChapters((prev) => {
        let updated = [...prev];
        
        if (updated[nextIdx]) {
          console.log(`🔓 [Reader] Unlocking chapter: ${updated[nextIdx].chapter.title || updated[nextIdx].chapter.number}`);
          updated[nextIdx].isLocked = false;
        }

        // DOM Cleanup: Remove old chapters to prevent DOM bloat
        // When reaching chapter 5 (index 4), remove chapters 0-4 (indices 0-4)
        // When reaching chapter 10 (index 9), remove chapters 5-9 (indices 5-9)
        // Pattern: Remove 5 chapters at a time in batches
        if (nextIdx >= 4) {
          const chapterBatch = Math.floor(nextIdx / 5);
          const deleteUpToIdx = chapterBatch * 5;
          
          if (deleteUpToIdx > 0 && deleteUpToIdx < nextIdx) {
            console.log(`🗑️ [Reader] Cleaning up old chapters (removing up to index ${deleteUpToIdx})`);
            updated = updated.slice(deleteUpToIdx);
            
            // Adjust currentChapterIndex and recalculate startIndex
            const adjustment = deleteUpToIdx;
            let newStartIndex = 0;
            
            updated = updated.map((chapter, idx) => {
              const newChapter = { ...chapter, startIndex: newStartIndex };
              newStartIndex += (chapter.pages?.length || 0);
              return newChapter;
            });
          }
        }
        
        return updated;
      });

      // Preload next chapters dynamically (always keep 4 chapters ahead loaded for smooth experience)
      // Find current chapter in all chapters
      const currentActiveChapter = activeChapters[nextIdx];
      if (!currentActiveChapter) return;
      
      const currentChapterInAll = allChaptersRef.current.findIndex(
        (ch) => ch.id === currentActiveChapter.chapter.id
      );
      
      if (currentChapterInAll !== -1) {
        const chaptersToLoad = [];
        
        // Load next 4 chapters if they don't exist in activeChapters
        for (let i = 1; i <= 4; i++) {
          const nextChapterIdx = currentChapterInAll + i;
          if (nextChapterIdx < allChaptersRef.current.length) {
            const chapterExists = activeChapters.some(
              ac => ac.chapter.id === allChaptersRef.current[nextChapterIdx].id
            );
            
            if (!chapterExists) {
              chaptersToLoad.push(allChaptersRef.current[nextChapterIdx]);
            }
          }
        }
        
        // Load chapters in parallel
        if (chaptersToLoad.length > 0) {
          console.log(`📚 [Reader] Preloading ${chaptersToLoad.length} upcoming chapters`);
          
          const newChaptersData = await Promise.all(
            chaptersToLoad.map(async (chapter) => {
              const pages = await fetchChapterPages(chapter.id);
              return { chapter, pages: pages || [] };
            })
          );
          
          setActiveChapters((prev) => {
            const lastChapter = prev[prev.length - 1];
            let currentStartIndex = lastChapter.startIndex + (lastChapter.pages?.length || 0);
            
            const newActiveChapters = newChaptersData.map(data => {
              const chapter: ActiveChapter = {
                chapter: data.chapter,
                pages: data.pages,
                isLocked: true,
                startIndex: currentStartIndex
              };
              currentStartIndex += (data.pages?.length || 0);
              return chapter;
            });

            return [...prev, ...newActiveChapters];
          });
        }
      }
    } catch (err: any) {
      console.error('❌ [Reader] Error moving to next chapter:', err);
      toast({
        title: 'Error',
        description: 'Failed to load next chapter',
        variant: 'destructive',
      });
    }
  }, [currentChapterIndex, activeChapters, fetchChapterPages, toast, contentId]);



  // Monitor Image Loading Progress for Tracking
  // Defer tracking until 25% of images are loaded to prioritize bandwidth
  useEffect(() => {
    if (activeChapters.length === 0) return;

    const currentChapter = activeChapters[currentChapterIndex];
    if (!currentChapter || !currentChapter.pages || currentChapter.pages.length === 0) return;

    const chapterId = currentChapter.chapter.id;
    
    // Skip if already tracked in this session instance
    if (trackedChaptersRef.current.has(chapterId)) return;

    // Calculate progress
    // maxAllowedIndex is 0-based global index.
    // startIndex is the global index where this chapter starts.
    const imagesLoadedCount = Math.max(0, maxAllowedIndex - currentChapter.startIndex);
    const totalImages = currentChapter.pages.length;
    const progressRatio = imagesLoadedCount / totalImages;

    // Trigger at 25% loaded (or if total images is small, say < 4, maybe trigger on 1st?)
    // Let's stick to strict 25% or if it's the last image of a short chapter
    const threshold = 0.25;

    if (progressRatio >= threshold || (totalImages < 4 && imagesLoadedCount >= 1)) {
      // Mark as tracked immediately to prevent re-entry
      trackedChaptersRef.current.add(chapterId);
      // Persist to sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          `tracked_chapters_${contentId}`, 
          JSON.stringify(Array.from(trackedChaptersRef.current))
        );
      }
      
      console.log(`📊 [Reader] Threshold met (${(progressRatio*100).toFixed(1)}%). Tracking progress for Ch ${currentChapter.chapter.number}`);


      const track = async () => {
        try {
            // 1. Save Reading Progress (Last Read Pointer)
            // Deduplication: Check if we are proactively updating to the SAME chapter
            const currentProgress = getReadingProgress(contentId);
            const isSameChapter = currentProgress?.lastReadChapterId === chapterId;

            if (!isSameChapter) {
                saveReadingProgress(contentId, chapterId, currentChapter.chapter.number);
            } else {
                console.log(`⏭️ [Reader] Skipping save-progress (current chapter is already Last Read)`);
            }

            // 2. Add to History - Conditional Check
            // "Check if that's already visited from local storage"
            const alreadyVisited = isChapterVisited(contentId, chapterId);
            
            if (!alreadyVisited) {
                console.log(`📜 [Reader] Adding new chapter visit to history`);
                addChapterToHistory(chapterId, contentId);
            } else {
                console.log(`⏭️ [Reader] Skipping add-chapter-visit (already in LocalStorage)`);
            }

        } catch (err) {
            console.error('Failed to track progress:', err);
        }
      };

      // Execute tracking with low priority
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => track());
      } else {
        setTimeout(track, 1000);
      }
    }
  }, [maxAllowedIndex, currentChapterIndex, activeChapters, contentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar searchQuery="" onSearchChange={() => {}} showOnScroll={true} />
        
        {/* Header Skeleton */}
        <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-sm border-b border-border h-14 w-full">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted rounded-full animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="mx-auto px-4 py-8 max-w-[615px]">
          {/* Chapter Title Skeleton */}
          <div className="text-center mb-8 py-6 border-t border-border">
             <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto mb-2" />
             <div className="h-4 w-32 bg-muted rounded animate-pulse mx-auto opacity-70" />
          </div>

          {/* Pages Skeleton - Simulate 3 pages loading */}
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[2/3] bg-muted w-full relative overflow-hidden mb-0">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-muted-foreground/20 border-t-muted-foreground/50 animate-spin" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || activeChapters.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar searchQuery="" onSearchChange={() => {}} showOnScroll={showHeader} />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] gap-4">
          <p className="text-destructive text-lg">{error || 'No chapters available'}</p>
          <Link href={`/content/${contentId}`}>
            <Button variant="outline" className="gap-2 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Back to Content
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar searchQuery="" onSearchChange={() => {}} showOnScroll={showHeader} />

      {/* Reader Header - hides on scroll */}
      <div className={`sticky top-16 z-40 bg-card/95 backdrop-blur-sm border-b border-border transition-all duration-300 ${
        showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title with Back Arrow */}
            <Link href={`/content/${contentId}`} className="flex items-center gap-2 hover:text-orange-500 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              {contentTitle && (
                <h2 className="text-sm font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                  {contentTitle}
                </h2>
              )}
            </Link>

            {/* Right: Chapter Navigation */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 cursor-pointer hover:text-orange-500">
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      Chapter {activeChapters[currentChapterIndex]?.chapter.number}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="max-h-96 overflow-y-auto">
                  {/* Sort chapters by number to ensure correct order */}
                  {[...allChaptersRef.current]
                    .sort((a, b) => a.number - b.number)
                    .map((chapter) => {
                      const isActive = activeChapters[currentChapterIndex]?.chapter.id === chapter.id;
                      return (
                        <DropdownMenuItem
                          key={chapter.id}
                          onClick={() => {
                            // Simply navigate to the chapter URL
                            window.location.href = `/read/${contentId}?chapter=${chapter.id}`;
                          }}
                          className={`cursor-pointer ${isActive ? 'bg-orange-500/20 text-orange-500' : ''}`}
                        >
                          <span>
                            Chapter {chapter.number}{chapter.title ? ` : ${chapter.title}` : ''}
                          </span>
                          {isActive && <span className="ml-2">✓</span>}
                        </DropdownMenuItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Reader Container */}
      <div 
        ref={containerRef} 
        className="mx-auto px-4 py-8 transition-all duration-300"
        style={{ 
          maxWidth: `${(zoom / 100) * 615}px` // Base width reduced to ~60% of original (was 1024px)
        }}
      >
        {activeChapters.map((activeChapter, chapterIdx) => {
          return (
          <div key={activeChapter.chapter.id} className="mb-2" data-chapter-id={activeChapter.chapter.id}>
            {/* Chapter Header */}
            {chapterIdx > 0 && (
              <div className="text-center mb-8 py-6 border-t border-border">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Chapter {activeChapter.chapter.number}
                </h3>
                <p className="text-muted-foreground">{activeChapter.chapter.title}</p>
              </div>
            )}

            {/* Chapter Images */}
            <div
              className={`${
                activeChapter.isLocked ? 'relative' : ''
              }`}
            >
              {/* Compact ad-like button for locked chapters */}
              {activeChapter.isLocked && (
                <div className="my-6 py-4 px-6 bg-card border-2 border-orange-500/30 rounded-lg flex items-center justify-between gap-4" id={`locked-chapter-${activeChapter.chapter.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🔒</div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground">Chapter {activeChapter.chapter.number}</h3>
                      <p className="text-sm text-muted-foreground">Click to read</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleReadNextChapterNoScroll}
                    className="gap-2 bg-orange-500 hover:bg-orange-600 text-white cursor-pointer flex-shrink-0"
                    size="sm"
                  >
                    Read
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Images */}
              {activeChapter.pages && activeChapter.pages.length > 0 ? (
                activeChapter.pages.map((page, pageIdx) => {
                  try {
                    const globalIndex = activeChapter.startIndex + pageIdx;
                    
                    // Sequential Waterfall Logic:
                    // Only render/fetch if previous images have finished loading
                    // AND if the chapter is unlocked
                    const shouldRender = !activeChapter.isLocked && globalIndex <= maxAllowedIndex;
                    const isCurrentLoading = globalIndex === maxAllowedIndex;
                    
                    return (
                      <div
                        key={page.id}
                        className="relative bg-muted overflow-hidden mb-0"
                      >
                        {shouldRender && page.image_url ? (
                          <img
                            src={page.image_url}
                            alt={`Page ${page.page_number}`}
                            className={`w-full h-auto transition-opacity duration-500 ${isCurrentLoading ? 'opacity-0' : 'opacity-100'}`}
                            onLoad={(e) => {
                              e.currentTarget.classList.remove('opacity-0');
                              handleImageLoad(globalIndex);
                            }}
                            onError={() => {
                              toast({
                                title: 'Image Load Error',
                                description: `Failed to load page ${page.page_number}`,
                                variant: 'destructive',
                              });
                              // Still increment to continue loading next images
                              handleImageLoad(globalIndex);
                            }}
                          />
                        ) : (
                          <div className="aspect-[2/3] bg-card flex items-center justify-center border border-border rounded-lg">
                            <div className="text-center space-y-2">
                              <div className="animate-pulse">
                                <div className="w-8 h-8 bg-muted rounded-full mx-auto mb-2"></div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {activeChapter.isLocked ? 'Locked' : 'Loading...'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } catch (err) {
                    console.error(`❌ [Reader] Error rendering page ${pageIdx}:`, err);
                    return (
                      <div key={page.id} className="text-center py-8 text-destructive">
                        Failed to load page {page.page_number}
                      </div>
                    );
                  }
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  ⚠️ No pages found for this chapter
                </div>
              )}
            </div>

            {/* Advertisement between chapters */}
            {chapterIdx < activeChapters.length - 1 && (
              <div className="my-4 py-4 border-y border-border">
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <div className="text-xs text-muted-foreground mb-4 uppercase tracking-wide">
                    Advertisement
                  </div>
                  <div className="bg-muted rounded aspect-video flex items-center justify-center">
                    <p className="text-muted-foreground">Ad Space</p>
                  </div>
                </div>
              </div>
            )}

            {/* Next Chapter Button - only show at end of chapter */}
            {chapterIdx === currentChapterIndex && (
              <div className="mt-8 text-center py-8 hidden">
                <p className="text-muted-foreground">End of chapter. Use header buttons to navigate.</p>
              </div>
            )}
          </div>
          );
        })}

        {/* End of content */}
        <div className="mt-12 py-8 text-center border-t border-border">
          <p className="text-muted-foreground mb-4">You've reached the end of available chapters</p>
          <Link href={`/content/${contentId}`}>
            <Button variant="outline" className="gap-2 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Back to Content
            </Button>
          </Link>
        </div>
      </div>

      {/* Floating Controls */}
      <ZoomControls zoom={zoom} onZoomChange={setZoom} />
      <GoToTopButton />
    </div>
  );
}
