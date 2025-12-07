'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Content } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Search, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';

import { fetchContents } from '@/lib/api';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchContent = async () => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchContents({ 
          search: query,
          limit: 50
        });
        setResults(response.data || []);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    searchContent();
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar searchQuery="" onSearchChange={() => {}} />

      {/* Search Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="border border-border rounded hover:border-orange-500">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Search Results
              </h1>
              {query && (
                <p className="text-sm text-muted-foreground">
                  Showing results for "<span className="text-orange-500 font-medium">{query}</span>"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="relative aspect-[2/3] bg-muted overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                </div>
                <div className="p-2 sm:p-4 bg-gradient-to-b from-card to-card/80">
                  <div className="h-3 sm:h-4 w-3/4 bg-muted rounded mb-1 sm:mb-2 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                  </div>
                  <div className="h-3 sm:h-4 w-1/2 bg-muted rounded mb-2 sm:mb-3 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">{error}</p>
            <Link href="/">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                Back to Home
              </Button>
            </Link>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-4">
            {results.map((content) => (
              <Link key={content.id} href={`/content/${content.id}`} prefetch={false}>
                <Card 
                  className="group overflow-hidden border-[1.5px] border-border hover:border-orange-500 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer rounded-xl"
                >
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
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Top Badges Container */}
                    <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-start gap-1">
                      <Badge 
                        variant="secondary"
                        className="text-[9px] sm:text-[10px] font-bold uppercase bg-gray-900/90 text-white border-0 px-1.5 py-0.5 sm:px-2 sm:py-1 truncate max-w-[45%]"
                      >
                        {content.type}
                      </Badge>
                      <Badge 
                        className="text-[9px] sm:text-[10px] font-bold bg-orange-500 text-white border-0 px-1.5 py-0.5 sm:px-2 sm:py-1 truncate max-w-[50%]"
                        variant={
                          content.status === 'ongoing' ? 'default' :
                          content.status === 'completed' ? 'secondary' :
                          'outline'
                        }
                      >
                        {content.status}
                      </Badge>
                    </div>

                    {/* Bottom Badges Container */}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between items-end">
                      {content.average_rating && content.average_rating > 0 && (
                        <div className="flex items-center gap-0.5 px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-full bg-black/80 backdrop-blur-sm border-0">
                          <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-orange-500 fill-orange-500" />
                          <span className="text-white text-[9px] sm:text-xs font-bold">
                            {content.average_rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {content.chapter_count && content.chapter_count > 0 && (
                        <div className="flex items-center justify-center px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-full bg-orange-500/90 backdrop-blur-sm border-0 ml-auto">
                          <span className="text-white text-[9px] sm:text-[10px] font-bold whitespace-nowrap leading-none">
                            CH {content.chapter_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-2 sm:p-4 bg-gradient-to-b from-card to-card/80">
                    <h3 className="font-bold text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2 text-foreground group-hover:text-orange-500 transition-colors duration-300">
                      {content.title}
                    </h3>
                    {content.author && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-3 truncate">
                        {content.author}
                      </p>
                    )}
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
              No results found
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {query 
                ? `We couldn't find any results for "${query}". Try a different search term.`
                : 'Enter a search term to find content.'}
            </p>
            <Link href="/browse">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">
                Browse All Content
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
