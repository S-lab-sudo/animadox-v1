import { useState, useCallback, useRef, useEffect } from 'react';

export interface SearchResult {
  id: string;
  title: string;
  cover_image: string;
  rating: number;
  published_date: string | number;
}

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get token fresh on each search - use correct localStorage key
        const token = typeof window !== 'undefined' ? localStorage.getItem('aniverse_session_token') : null;

        if (!token) {
          console.error('No session token found');
          setError('Session expired. Please refresh the page.');
          setLoading(false);
          return;
        }

        // Use serverless API route
        const url = `/api/search?query=${encodeURIComponent(searchQuery)}`;

        console.log('Searching:', { url, token: token?.substring(0, 10) });

        const response = await fetch(url, {
          headers: {
            'x-session-token': token,
          },
        });

        console.log('Search response status:', response.status);

        if (response.status === 429) {
          setError('Rate limit exceeded. Please wait before searching again.');
          setResults([]);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('Search results:', data);
        setResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSearch = (value: string) => {
    setQuery(value);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!value.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Show loading immediately
    setLoading(true);

    // Debounce: wait 500ms after user stops typing
    debounceTimer.current = setTimeout(() => {
      performSearch(value);
    }, 500);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setLoading(false);
    setError(null);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  };

  return {
    query,
    results,
    loading,
    error,
    handleSearch,
    clearSearch,
  };
};
