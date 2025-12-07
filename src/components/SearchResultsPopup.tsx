import Link from 'next/link';
import { SearchResult } from '@/hooks/useSearch';
import { Star, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  query: string;
}

export const SearchResultsPopup = ({ results, loading, error, query }: SearchResultsProps) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (id: string) => {
    setImageErrors(prev => new Set(prev).add(id));
  };

  if (!query.trim()) return null;

  return (
    <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 bg-black border border-border rounded-md shadow-lg z-50 w-[calc(100vw-2rem)] md:w-[420px] max-h-[500px] overflow-y-auto">
      {/* Loading State */}
      {loading && (
        <div className="p-4 text-center text-muted-foreground">
          <div className="inline-block animate-spin">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
          <p className="mt-2 text-sm">Searching...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 text-center text-red-500">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results State */}
      {!loading && !error && results.length > 0 && (
        <div className="divide-y divide-border">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/content/${result.id}`}
              className="flex gap-3 p-3 md:p-4 hover:bg-orange-500/10 transition-colors block"
            >
              {/* Image */}
              <div className="flex-shrink-0 w-16 h-24 md:w-20 md:h-[120px] bg-gray-800 rounded flex items-center justify-center">
                {imageErrors.has(result.id) ? (
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <img
                    src={result.cover_image || '/placeholder.png'}
                    alt={result.title}
                    className="w-full h-full object-cover rounded"
                    onError={() => handleImageError(result.id)}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-foreground truncate">
                  {result.title}
                </h3>

                {/* Rating */}
                {result.rating && (
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <span className="text-sm text-muted-foreground">
                      {result.rating.toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Published Date */}
                {result.published_date && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {typeof result.published_date === 'string' && result.published_date.length === 4 
                      ? result.published_date 
                      : typeof result.published_date === 'number'
                      ? result.published_date
                      : new Date(result.published_date).getFullYear()}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No Results State */}
      {!loading && !error && results.length === 0 && query.trim() && (
        <div className="p-4 text-center text-muted-foreground">
          <p className="text-sm">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
};
