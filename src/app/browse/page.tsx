'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Content } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Search } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useContentContext } from '@/context/ContentContext';
import { supabase } from '@/lib/supabase';

const contentTypes = [
  { id: 'all', label: 'All' },
  { id: 'manga', label: 'Manga' },
  { id: 'manhwa', label: 'Manhwa' },
  { id: 'anime', label: 'Anime' },
  { id: 'novel', label: 'Novel' },
  { id: 'manhua', label: 'Manhua' },
];

function BrowseContent() {
  const searchParams = useSearchParams();
  const urlType = searchParams.get('type');
  
  const {
    contents,
    loading,
    activeTab,
    searchQuery,
    setActiveTab,
    setSearchQuery,
    loadContents,
  } = useContentContext();
  
  const [requestTitle, setRequestTitle] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestVariant, setRequestVariant] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  // Fix hydration by only rendering form after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set active tab from URL param
  useEffect(() => {
    if (urlType) {
      const validType = contentTypes.find(t => t.id === urlType.toLowerCase());
      if (validType) {
        setActiveTab(validType.id);
      }
    }
  }, [urlType, setActiveTab]);

  const handleSearchChange = (value: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      setSearchQuery(value);
    }, 500);
    setSearchTimeout(timeout);
  };

  useEffect(() => {
    loadContents(activeTab, searchQuery);
  }, [activeTab, searchQuery, loadContents]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      if (!requestTitle || !requestEmail || !requestVariant) {
        toast({
          title: "Missing Information",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }
      
      // Submit to Supabase
      const { error } = await supabase
        .from('content_requests')
        .insert({
          title: requestTitle,
          email: requestEmail,
          variant: requestVariant,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: `Your request for "${requestTitle}" has been submitted!`,
      });
      
      setRequestTitle('');
      setRequestEmail('');
      setRequestVariant('');
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar searchQuery={searchQuery} onSearchChange={handleSearchChange} />



      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Cover Image Skeleton */}
                <div className="relative aspect-[2/3] bg-muted overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                </div>
                {/* Content Info Skeleton */}
                <div className="p-2 sm:p-4 bg-gradient-to-b from-card to-card/80">
                  <div className="h-3 sm:h-4 w-3/4 bg-muted rounded mb-1 sm:mb-2 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                  </div>
                  <div className="h-3 sm:h-4 w-1/2 bg-muted rounded mb-2 sm:mb-3 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                  </div>
                  <div className="hidden sm:flex gap-1">
                    <div className="h-4 w-12 bg-muted rounded-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                    </div>
                    <div className="h-4 w-12 bg-muted rounded-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : contents.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4">
            {contents.map((content) => (
              <Link key={content.id} href={`/content/${content.id}`} prefetch={false}>
                <Card 
                  className="group overflow-hidden border-[1.5px] border-border hover:border-orange-500 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer rounded-xl"
                >
                {/* Cover Image */}
                <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                  {content.cover_image_url ? (
                    <Image
                      src={content.cover_image_url}
                      alt={content.title}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 14vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Top Badges Container - stacked on mobile */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-center gap-1">
                    {/* Type Badge - left */}
                    <Badge 
                      variant="secondary"
                      className="text-[7px] sm:text-xs font-bold uppercase bg-gray-900/90 text-white border-0 px-1.5 py-0.5 truncate max-w-[45%] text-center justify-center"
                    >
                      {content.type}
                    </Badge>

                    {/* Status Badge - right */}
                    <Badge 
                      className="text-[7px] sm:text-xs font-bold bg-orange-500 text-white border-0 px-1.5 py-0.5 truncate max-w-[50%] text-center justify-center"
                      variant={
                        content.status === 'ongoing' ? 'default' :
                        content.status === 'completed' ? 'secondary' :
                        'outline'
                      }
                    >
                      {content.status}
                    </Badge>
                  </div>

                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between items-end gap-1">
                    {/* Rating - left */}
                    {content.average_rating && content.average_rating > 0 && (
                      <div className="flex items-center gap-1 px-1.5 h-4 sm:h-6 rounded-full bg-black/80 backdrop-blur-sm border-0">
                        <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-orange-500 fill-orange-500" />
                        <span className="text-white text-[7px] sm:text-xs font-bold">
                          {content.average_rating.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Chapter Count - right */}
                    {(content.chapter_count || content.chapters) && (content.chapter_count || content.chapters || 0) > 0 && (
                      <div className="flex items-center justify-center px-1.5 h-4 sm:h-6 rounded-full bg-orange-500/90 backdrop-blur-sm border-0 ml-auto bg-opacity-100">
                        <span className="text-white text-[7px] sm:text-xs font-bold whitespace-nowrap leading-none drop-shadow-md">
                          CH {content.chapter_count || content.chapters}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Info */}
                <CardContent className="p-2 sm:p-4 bg-gradient-to-b from-card to-card/80">
                  <h3 className="font-bold text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2 text-foreground group-hover:text-orange-500 transition-colors duration-300">
                    {content.title}
                  </h3>
                  
                  {content.author && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-3 truncate">
                      {content.author}
                    </p>
                  )}
                  
                  {/* Genres - hidden on very small screens */}
                  {content.genres && content.genres.length > 0 && (
                    <div className="hidden sm:flex flex-wrap gap-1 sm:gap-2 items-center">
                      {content.genres.slice(0, 2).map((genre: string, idx: number) => (
                        <Badge 
                          key={idx}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0.5 whitespace-nowrap border-orange-500/50 text-foreground hover:bg-orange-500/10 transition-colors"
                        >
                          {genre}
                        </Badge>
                      ))}
                      {content.genres.length > 2 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 whitespace-nowrap border-orange-500/50 text-foreground">
                          +{content.genres.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="mb-4">
              <Search className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              No content found
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchQuery 
                ? `We couldn't find any results for "${searchQuery}". Try adjusting your search.`
                : 'No content available in this category yet. Check back soon!'}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20 bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {mounted && (
            <div className="mb-6">
              <div className="text-center mb-4">
                <h4 className="text-lg font-semibold text-foreground">
                  Request Content
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-orange-500/80">
                  (We can deliver what you request within 1 hour minimum)
                </p>
              </div>
              <form onSubmit={handleRequestSubmit} className="space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      id="title"
                      type="text"
                      placeholder="Enter content title..."
                      value={requestTitle}
                      onChange={(e) => setRequestTitle(e.target.value)}
                      className="focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email..."
                      value={requestEmail}
                      onChange={(e) => setRequestEmail(e.target.value)}
                      className="focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex-1">
                    <Select value={requestVariant} onValueChange={setRequestVariant}>
                      <SelectTrigger className="focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all">
                        <SelectValue placeholder="Select variant..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="manga">Manga</SelectItem>
                        <SelectItem value="manhwa">Manhwa</SelectItem>
                        <SelectItem value="manhua">Manhua</SelectItem>
                        <SelectItem value="novel">Novel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full cursor-pointer bg-orange-500 hover:bg-orange-600 text-white" size="lg">
                  Submit Request
                </Button>
              </form>
            </div>
          )}
          
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              <span className="text-white">Ani</span><span className="text-orange-500">Ma</span><span className="text-white">Dox</span>
            </h3>
            <p className="text-muted-foreground text-sm">
              Discover • Read • Enjoy
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
