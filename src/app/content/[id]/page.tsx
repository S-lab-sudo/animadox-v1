'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Content } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Star, BookOpen, ChevronRight, RotateCcw, Bell, BellRing } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { registerServiceWorker, subscribeToPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { useContentContext } from '@/context/ContentContext';
import {
  getOrCreateSessionToken,
  getReadingProgress,
  saveReadingProgress,
  addChapterToHistory,
  getVisitedChaptersForContent,
  isChapterVisited,
  initializeTracking,
} from '@/lib/userTracking';

// Chapter interface for type safety
interface Chapter {
  id: string;
  content_id: string;
  number: number;
  title?: string;
}

// Reading progress interface
interface ReadingProgressData {
  contentId: string;
  lastReadChapterId: string;
  lastReadChapterNumber: number;
  progressPercentage: number;
  lastReadAt: string;
}

export default function ContentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { toast } = useToast();
  const [content, setContent] = useState<Content | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterSearchTimeout, setChapterSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);

  
  // User tracking states
  const [sessionToken, setSessionToken] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState<ReadingProgressData | null>(null);
  const [visitedChapters, setVisitedChapters] = useState<Set<string>>(new Set());
  
  // Notification states
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const lastSubCheck = useRef<number>(0);
  const SUB_CHECK_TTL = 30000; // 30 seconds

  // Check subscription status (throttled)
  useEffect(() => {
    if (user && id) {
      const now = Date.now();
      // Skip if checked within TTL
      if (now - lastSubCheck.current < SUB_CHECK_TTL) {
        console.log('[ContentPage] Subscription check throttled');
        return;
      }
      lastSubCheck.current = now;

      const checkSub = async () => {
        const { data } = await supabase
          .from('content_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_id', id)
          .maybeSingle();
        setIsSubscribed(!!data);
      };
      checkSub();
    }
  }, [user, id]);

  const handleNotifyToggle = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "You must be logged in to receive notifications.", variant: "destructive" });
      return;
    }

    setSubLoading(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from('content_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', id);
        
        if (error) throw error;
        setIsSubscribed(false);
        toast({ title: "Unsubscribed", description: "You will no longer receive updates for this content." });
      } else {
        // Subscribe
        // 1. Ensure SW is ready
        await registerServiceWorker();
        // 2. Request Permission
        const permission = await Notification.requestPermission();
        if (permission === 'denied') {
          toast({ title: "Permission Denied", description: "Please enable notifications in your browser settings.", variant: "destructive" });
          setSubLoading(false);
          return;
        }
        
        // 3. Save subscription to DB
        // Note: content_subscriptions has FK to users table which is for admins/editors only
        // If you get a 23503 error, the FK constraint needs to be removed via migration
        const { error } = await supabase
          .from('content_subscriptions')
          .insert({ user_id: user.id, content_id: id });

        if (error) {
          // Handle specific error cases
          if (error.code === '23505' || error.message?.includes('duplicate')) {
            // Already subscribed - this is fine
            console.log('Subscription already exists, continuing...');
          } else if (error.code === '23503') {
            // Foreign key error - database constraint issue
            console.error('Foreign key constraint error:', error);
            toast({ 
              title: "Database Configuration Issue", 
              description: "Subscriptions feature requires a database migration. Please contact admin.",
              variant: "destructive" 
            });
            setSubLoading(false);
            return;
          } else {
            throw error;
          }
        }
        
        // 5. Actually subscribe to push
        try {
          await subscribeToPush();
          toast({ title: "Subscribed!", description: "You will be notified when new chapters are released." });
        } catch (pushError) {
          console.error("Push subscription failed:", pushError);
          toast({ 
            title: "Subscribed (Site Only)", 
            description: "Push notifications failed (browser blocked?), but you'll still see red badge updates here.",
            variant: "default"
          });
        }

        setIsSubscribed(true);
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update subscription.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setSubLoading(false);
    }
  };

  // Use useMemo to create API URL - serverless API routes
  const API_BASE_URL = useMemo(() => {
    // Serverless routes at same origin
    return '/api';
  }, []);

  // Initialize tracking on mount
  useEffect(() => {
    initializeTracking();
    const token = getOrCreateSessionToken();
    setSessionToken(token);
  }, []);

  // Get context for client-side caching
  const { getContentDetail, setContentDetail } = useContentContext();

  useEffect(() => {
    const fetchContent = async () => {
      if (!id) {
        return;
      }

      try {
        // Show cached data immediately for instant UX (if available)
        const cached = getContentDetail(id);
        if (cached) {
          console.log('⚡ [ContentPage] Showing cached data while fetching fresh...');
          setContent(cached.content);
          setChapters(cached.chapters);
          setLoading(false);
          
          // Load reading progress from localStorage
          const progress = getReadingProgress(id);
          setReadingProgress(progress);
          const visited = getVisitedChaptersForContent(id);
          setVisitedChapters(visited);
        } else {
          setLoading(true);
        }

        setError(null);

        // ALWAYS fetch fresh data from API (even if we showed cache)
        const [contentResponse, chaptersResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/content/${id}`),
          fetch(`${API_BASE_URL}/chapters/${id}`)
        ]);
        
        if (!contentResponse.ok) {
          throw new Error(`HTTP ${contentResponse.status}: Failed to fetch content`);
        }
        
        const contentData = await contentResponse.json();
        const fetchedContent = contentData.data;
        setContent(fetchedContent);

        // Process chapters response
        let fetchedChapters: Chapter[] = [];
        if (chaptersResponse.ok) {
          const chaptersData = await chaptersResponse.json();
          fetchedChapters = chaptersData.data || [];
          setChapters(fetchedChapters);
          
          // Load reading progress for this content (from localStorage - instant)
          const progress = getReadingProgress(id);
          setReadingProgress(progress);
          
          // Load visited chapters (from localStorage - instant)
          const visited = getVisitedChaptersForContent(id);
          setVisitedChapters(visited);
        } else {
          setChapters([]);
        }

        // Update cache with fresh data
        if (fetchedContent) {
          setContentDetail(id, fetchedContent, fetchedChapters);
          console.log('✅ [ContentPage] Cache updated with fresh data');
        }
        
      } catch (err: unknown) {
        // Don't expose internal error details to user
        console.error('Error loading content:', err);
        setError('Unable to load content. Please try again later.');
        
        toast({
          title: 'Error',
          description: 'Unable to load content. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, API_BASE_URL, toast, getContentDetail, setContentDetail]);

  // Filter chapters based on search query - memoized to prevent re-computation
  const filteredChapters = useMemo(() => {
    return chapters.filter((chapter) => {
      try {
        if (!chapterSearchQuery) return true;
        const searchLower = chapterSearchQuery.toLowerCase();
        return (
          chapter.number.toString().includes(searchLower) ||
          (chapter.title && chapter.title.toLowerCase().includes(searchLower))
        );
      } catch (error) {
        console.error("Error filtering chapter:", error);
        return false;
      }
    });
  }, [chapters, chapterSearchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        
        {/* Header skeleton */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="h-10 w-20 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Main Content Skeleton - YouTube style shimmer */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="grid grid-cols-[auto_1fr] md:grid-cols-3 gap-4 md:gap-8 mb-6 md:mb-12">
            {/* Cover Image Skeleton */}
            <div className="w-28 sm:w-36 md:col-span-1 md:w-auto flex-shrink-0">
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg md:rounded-xl bg-muted mb-4 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
              </div>
              <div className="hidden md:flex gap-2">
                <div className="flex-1 h-10 bg-muted rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                </div>
                <div className="flex-1 h-10 bg-muted rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                </div>
              </div>
            </div>

            {/* Right Column Wrapper Skeleton */}
            <div className="contents md:flex md:flex-col md:gap-6 md:col-span-2">
              
              {/* Info Skeleton */}
              <div className="flex flex-col gap-3 justify-center">
                
                {/* Title and Meta */}
                <div>
                  <div className="h-6 sm:h-8 md:h-10 w-full sm:w-3/4 bg-muted rounded-lg mb-2 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                  </div>
                  <div className="h-4 sm:h-5 md:h-6 w-24 sm:w-32 bg-muted rounded mb-2 sm:mb-4 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                  </div>
                  
                  {/* Badges skeleton */}
                  <div className="flex flex-wrap gap-1.5 md:gap-3 mb-2 sm:mb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 sm:h-5 md:h-6 w-12 sm:w-16 bg-muted rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                      </div>
                    ))}
                  </div>

                  {/* Mobile Action Buttons Skeleton */}
                  <div className="flex gap-2 md:hidden mt-2">
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                    </div>
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Synopsis and Chapters Skeleton - Below Info on Desktop */}
              <div className="col-span-2 md:col-span-auto space-y-4">
            {/* Synopsis skeleton */}
            <div className="p-3 sm:p-4 bg-card border border-border/50 rounded-lg">
              <div className="h-4 sm:h-5 w-20 sm:w-24 bg-muted rounded mb-3 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
              </div>
              <div className="space-y-2">
                <div className="h-3 sm:h-4 w-full bg-muted rounded overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                </div>
                <div className="h-3 sm:h-4 w-5/6 bg-muted rounded overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                </div>
                <div className="h-3 sm:h-4 w-4/6 bg-muted rounded overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                </div>
              </div>
            </div>

            {/* Chapters skeleton */}
            <div className="p-3 sm:p-4 bg-card border border-border/50 rounded-lg">
              <div className="h-4 sm:h-5 w-24 sm:w-28 bg-muted rounded mb-4 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 sm:h-12 bg-muted rounded-lg overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>
        </main>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="text-center">
            <p className="text-red-500 mb-2 text-lg font-semibold">{error || 'Content not found'}</p>
            <p className="text-muted-foreground text-sm mb-4">The content you're looking for may have been deleted or doesn't exist.</p>
          </div>
          <Link href="/">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 rounded cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      {/* Header with Back Button and Start Reading */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar scroll-smooth">
            <Link href="/browse">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg h-8 sm:h-9 px-3 cursor-pointer transition-all duration-300 flex items-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">Back</span>
              </Button>
            </Link>
            
            {/* Start Reading / Continue Reading Button */}
            {readingProgress ? (
              <Link href={`/read/${id}?chapter=${readingProgress.lastReadChapterId}`}>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg h-8 sm:h-9 px-3 cursor-pointer transition-all duration-300 flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Continue Chapter {readingProgress.lastReadChapterNumber}</span>
                </Button>
              </Link>
            ) : chapters.length > 0 ? (
              <Link href={`/read/${id}?chapter=${chapters[0].id}`}>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg h-8 sm:h-9 px-3 cursor-pointer transition-all duration-300 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Read Now</span>
                </Button>
              </Link>
            ) : null}
            
            {/* Notify Me Button */}
             <Button 
               onClick={handleNotifyToggle} 
               disabled={subLoading}
               variant="outline" 
               className={`rounded-lg h-8 sm:h-9 px-3 cursor-pointer transition-all duration-300 flex items-center gap-2 border-orange-500 ${isSubscribed ? 'bg-orange-500/10 text-orange-500' : 'text-foreground hover:bg-orange-500/10 hover:text-orange-500'}`}
             >
               {subLoading ? (
                 <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
               ) : isSubscribed ? (
                 <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               ) : (
                 <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               )}
               <span className="text-xs sm:text-sm font-medium">{isSubscribed ? 'Subscribed' : 'Notify Me'}</span>
             </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        
        {/* Unified Grid Layout for Mobile and Desktop */}
        <div className="grid grid-cols-[auto_1fr] md:grid-cols-3 gap-4 md:gap-8 mb-6 md:mb-12">
          
          {/* Cover Image - Left Column */}
          <div className="w-28 sm:w-36 md:w-auto md:col-span-1">
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg md:rounded-xl bg-muted shadow-lg">
              {content.cover_image_url ? (
                <Image
                  src={content.cover_image_url}
                  alt={content.title}
                  fill
                  sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 300px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-12 h-12 md:w-20 md:h-20 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </div>

          {/* Right Column Wrapper - Contents on mobile, Flex Col on Desktop */}
          <div className="contents md:flex md:flex-col md:gap-6 md:col-span-2">
            
            {/* Info Section - Row 1 Col 2 on Mobile */}
            <div className="flex flex-col gap-3 md:gap-6 justify-center">
                {/* Title and Meta Info */}
                <div>
                  <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1 md:mb-2 line-clamp-2">{content.title}</h1>
                  {content.author && (
                    <p className="text-sm md:text-lg text-muted-foreground mb-2 md:mb-4">by {content.author}</p>
                  )}
                  
                  {/* Quick Stats - Smaller on mobile */}
                  <div className="flex flex-wrap gap-1.5 md:gap-3 items-center">
                    {content.average_rating && content.average_rating > 0 && (
                      <div className="flex items-center gap-1 md:gap-2">
                        <Star className="w-4 h-4 md:w-5 md:h-5 text-orange-500 fill-orange-500" />
                        <span className="font-semibold text-sm md:text-base text-foreground">{content.average_rating.toFixed(1)}</span>
                      </div>
                    )}
                    
                    {content.type && (
                      <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 uppercase text-[10px] md:text-xs px-1.5 py-0.5">
                        {content.type}
                      </Badge>
                    )}

                    {content.year_published && (
                      <Badge variant="outline" className="uppercase text-[10px] md:text-xs px-1.5 py-0.5">
                        {content.year_published}
                      </Badge>
                    )}

                    {content.status && (
                      <Badge variant={content.status === 'ongoing' ? 'default' : 'secondary'} className="uppercase text-[10px] md:text-xs px-1.5 py-0.5">
                        {content.status}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Mobile Quick Access Buttons */}
                <div className="flex flex-row gap-2 md:hidden">
                  {chapters.length > 0 ? (
                    <>
                      <Link href={`/read/${id}?chapter=${chapters[0]?.id}`} className="flex-1">
                        <Button variant="outline" className="w-full cursor-pointer rounded-lg text-xs h-8 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/5 border-orange-500">
                          Read First
                        </Button>
                      </Link>
                      <Link href={`/read/${id}?chapter=${chapters[chapters.length - 1]?.id}`} className="flex-1">
                        <Button variant="outline" className="w-full cursor-pointer rounded-lg text-xs h-8 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/5 border-orange-500">
                          Read Last
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Button disabled variant="outline" className="flex-1 opacity-50 rounded-lg text-xs h-8 cursor-not-allowed border-orange-500">Read First</Button>
                      <Button disabled variant="outline" className="flex-1 opacity-50 rounded-lg text-xs h-8 cursor-not-allowed border-orange-500">Read Last</Button>
                    </>
                  )}
                </div>

                {/* Desktop Quick Access Buttons - Moved inside here for better flow, or keep separate? 
                    If we keep separate inside the wrapper, fine. 
                */}
                 <div className="hidden md:flex flex-row gap-2">
                  {chapters.length > 0 ? (
                    <>
                      <Link href={`/read/${id}?chapter=${chapters[0]?.id}`}>
                        <Button variant="outline" className="cursor-pointer rounded-lg text-sm h-10 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/5 border-orange-500">
                          Read First Chapter
                        </Button>
                      </Link>
                      <Link href={`/read/${id}?chapter=${chapters[chapters.length - 1]?.id}`}>
                        <Button variant="outline" className="cursor-pointer rounded-lg text-sm h-10 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/5 border-orange-500">
                          Read Last Chapter
                        </Button>
                      </Link>
                    </>
                  ) : null}
                </div>
            </div>

            {/* Synopsis and Chapters - Row 2 Col 1-2 on Mobile, Inside Wrapper on Desktop */}
            <div className="col-span-2 md:col-span-auto space-y-4">
          {/* Synopsis */}
          {content.description && (
            <div className="p-3 sm:p-4 bg-card border border-border/50 rounded-lg">
              <h3 className="text-sm font-bold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
                <div className="w-1 h-4 sm:h-5 bg-orange-500 rounded-full" />
                Synopsis
              </h3>
              <p className={`text-xs sm:text-sm text-muted-foreground leading-relaxed ${showFullDescription ? '' : 'line-clamp-3'}`}>
                {content.description}
              </p>
              {content.description.length > 150 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-2 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  {showFullDescription ? 'Read Less' : 'Read More'}
                </button>
              )}
            </div>
          )}

          {/* Genres */}
          {content.genres && content.genres.length > 0 && (
            <div className="p-3 sm:p-4 bg-card border border-border/50 rounded-lg">
              <h3 className="text-sm font-bold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
                <div className="w-1 h-4 sm:h-5 bg-orange-500 rounded-full" />
                Genres
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {showAllGenres ? (
                  <>
                    {content.genres.map((genre: string, idx: number) => (
                      <Badge 
                        key={idx}
                        variant="outline"
                        className="px-1.5 py-0.5 sm:px-2 text-[10px] sm:text-xs font-medium border-orange-500/40 text-foreground hover:bg-orange-500/10"
                      >
                        {genre}
                      </Badge>
                    ))}
                    <button
                      onClick={() => setShowAllGenres(false)}
                      className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors ml-1"
                    >
                      Less
                    </button>
                  </>
                ) : (
                  <>
                    {content.genres.slice(0, 4).map((genre: string, idx: number) => (
                      <Badge 
                        key={idx}
                        variant="outline"
                        className="px-1.5 py-0.5 sm:px-2 text-[10px] sm:text-xs font-medium border-orange-500/40 text-foreground hover:bg-orange-500/10"
                      >
                        {genre}
                      </Badge>
                    ))}
                    {content.genres.length > 4 && (
                      <button
                        onClick={() => setShowAllGenres(true)}
                        className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors ml-1"
                      >
                        +{content.genres.length - 4}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Chapters Section */}
          <div className="p-3 sm:p-4 bg-card border border-border/50 rounded-lg">
            <h2 className="text-sm font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
              <div className="w-1 h-4 sm:h-5 bg-orange-500 rounded-full" />
              Chapters ({filteredChapters.length})
            </h2>
            
            {/* Chapter Search */}
            {chapters.length > 0 && (
              <div className="mb-3 sm:mb-4">
                <Input
                  type="text"
                  placeholder="Search chapters..."
                  value={chapterSearchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setChapterSearchQuery(value);
                    if (chapterSearchTimeout) {
                      clearTimeout(chapterSearchTimeout);
                    }
                  }}
                  className="rounded-lg text-xs sm:text-sm h-9 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}

            {/* Chapters List */}
            {filteredChapters.length > 0 ? (
              <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto pr-2 custom-scrollbar flex flex-col">
                {[...filteredChapters].reverse().map((chapter) => (
                  <Link 
                    key={chapter.id} 
                    href={`/read/${content.id}?chapter=${chapter.id}`}
                    onClick={() => {
                      saveReadingProgress(id, chapter.id, chapter.number);
                      addChapterToHistory(chapter.id, id);
                    }}
                  >
                    <div 
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg transition-all duration-200 cursor-pointer border group ${
                      isChapterVisited(id, chapter.id)
                        ? 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10'
                        : 'border-transparent hover:border-orange-500/50 hover:bg-orange-500/10'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-xs sm:text-sm truncate group-hover:text-orange-500 transition-colors ${
                          isChapterVisited(id, chapter.id) ? 'text-orange-500' : 'text-foreground'
                        }`}>
                          Chapter {chapter.number}{chapter.title ? ` - ${chapter.title}` : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-orange-500/60 flex-shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : chapters.length > 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-muted-foreground text-xs sm:text-sm">
                  No chapters match your search.
                </p>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-xs sm:text-sm">
                  No chapters available yet.
                </p>
              </div>
            )}
          </div>
        </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f97316;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ea580c;
        }
      `}</style>
    </div>
  );
}
