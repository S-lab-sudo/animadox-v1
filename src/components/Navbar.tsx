'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useSearch } from '@/hooks/useSearch';
import { SearchResultsPopup } from '@/components/SearchResultsPopup';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showOnScroll?: boolean;
}

export const Navbar = ({ searchQuery, onSearchChange, showOnScroll = true }: NavbarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showDesktopSearch, setShowDesktopSearch] = useState(false);
  const desktopSearchRef = useRef<HTMLFormElement>(null);

  const { 
    query: searchQuery2, 
    results, 
    loading, 
    error, 
    handleSearch: handleSearch2, 
    clearSearch 
  } = useSearch();

  useEffect(() => {
    if (mobileSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  // Close search popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node)) {
        setShowDesktopSearch(false);
        clearSearch();
      }
    };

    if (showDesktopSearch) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDesktopSearch, clearSearch]);

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery2.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery2.trim())}`);
      setShowDesktopSearch(false);
      setMobileSearchOpen(false);
      clearSearch();
    }
  };

  const isActive = (path: string) => pathname === path;

  if (mobileSearchOpen) {
    return (
      <nav className={`sticky top-0 z-50 bg-black backdrop-blur-sm transition-all duration-300 flex flex-col ${
        showOnScroll ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Search Input - Full Width */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative" ref={desktopSearchRef}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery2}
                  onChange={(e) => handleSearch2(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:border-orange-500 transition-all text-foreground placeholder:text-muted-foreground"
                />
              </div>
              {/* Mobile Search Results Popup */}
              {searchQuery2.trim() && (
                <SearchResultsPopup
                  results={results}
                  loading={loading}
                  error={error}
                  query={searchQuery2}
                />
              )}
            </form>
            {/* Close Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setMobileSearchOpen(false);
                clearSearch();
              }}
              className="flex-shrink-0 border border-border rounded hover:border-orange-500"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={`sticky top-0 z-50 bg-black backdrop-blur-sm transition-all duration-300 ${
      showOnScroll ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-black text-foreground">
            <span className="text-white">Ani</span><span className="text-orange-500">Ma</span><span className="text-white">Dox</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Link 
              href="/browse" 
              prefetch={false} 
              className={`px-4 py-2 transition-all duration-300 rounded cursor-pointer ${
                isActive('/browse')
                  ? 'bg-orange-500 text-white border border-orange-500 shadow-lg shadow-orange-500/30'
                  : 'text-foreground hover:text-orange-500 border border-border hover:border-orange-500'
              }`}
            >
              Browse
            </Link>
            <Link 
              href="/updates" 
              prefetch={false} 
              className={`px-4 py-2 transition-all duration-300 rounded cursor-pointer ${
                isActive('/updates')
                  ? 'bg-orange-500 text-white border border-orange-500 shadow-lg shadow-orange-500/30'
                  : 'text-foreground hover:text-orange-500 border border-border hover:border-orange-500'
              }`}
            >
              Updates
            </Link>
          </div>

          {/* Desktop Search */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-8 relative" ref={desktopSearchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery2}
                onChange={(e) => {
                  handleSearch2(e.target.value);
                  setShowDesktopSearch(true);
                }}
                onFocus={() => setShowDesktopSearch(true)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:border-orange-500 transition-all text-foreground placeholder:text-muted-foreground"
              />
              {showDesktopSearch && (
                <SearchResultsPopup
                  results={results}
                  loading={loading}
                  error={error}
                  query={searchQuery2}
                />
              )}
            </div>
          </form>

          {/* Desktop Login */}
          <div className="hidden md:block">
            <Button variant="default" className="bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 rounded cursor-pointer">
              Login
            </Button>
          </div>

          {/* Mobile: Search Button + Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search className="w-5 h-5" />
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="border border-border rounded hover:border-orange-500">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full bg-black p-0 border-0 [&>button]:hidden">
                <SheetTitle>
                  <VisuallyHidden>Navigation Menu</VisuallyHidden>
                </SheetTitle>
                
                {/* Outer container */}
                <div className="flex flex-col h-full bg-black p-6 space-y-8">
                  
                  {/* First Section: Close button + Menu items */}
                  <div className="flex flex-col space-y-6">
                    {/* Close button positioned on right */}
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setMobileOpen(false)}
                        className="h-10 w-10 border border-border rounded hover:border-orange-500 flex-shrink-0"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    {/* Menu Items stacked */}
                    <div className="flex flex-col gap-0">
                      <Link 
                        href="/browse" 
                        prefetch={false}
                        className={`text-lg transition-colors border-b border-border px-4 py-4 ${
                          isActive('/browse')
                            ? 'bg-orange-500/20 text-orange-500'
                            : 'text-foreground hover:text-orange-500 hover:bg-orange-500/10'
                        }`}
                        onClick={() => setMobileOpen(false)}
                      >
                        Browse
                      </Link>
                      <Link 
                        href="/updates" 
                        prefetch={false}
                        className={`text-lg transition-colors border-b border-border px-4 py-4 ${
                          isActive('/updates')
                            ? 'bg-orange-500/20 text-orange-500'
                            : 'text-foreground hover:text-orange-500 hover:bg-orange-500/10'
                        }`}
                        onClick={() => setMobileOpen(false)}
                      >
                        Updates
                      </Link>
                    </div>
                  </div>
                  
                  {/* Second Section: Login Button */}
                  <div className="flex-shrink-0">
                    <Button variant="default" className="w-full bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 rounded cursor-pointer">
                      Login
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
