'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, BookOpen, Tv, FileText, Sparkles, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search page with query
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };



  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-background to-orange-500/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-orange-500/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        
        {/* Header */}
        <header className="w-full py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-2xl sm:text-3xl font-black">
              <span className="text-white">Ani</span>
              <span className="text-orange-500">Ma</span>
              <span className="text-white">Dox</span>
            </Link>
            <Link href="/browse">
              <Button 
                variant="outline" 
                className="border-orange-500/50 hover:border-orange-500 hover:bg-orange-500/10 text-foreground cursor-pointer"
              >
                Browse All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto text-center">
            
            {/* Logo/Brand */}
            <div className="mb-8">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-4 tracking-tight">
                <span className="text-white">Ani</span>
                <span className="text-orange-500">Ma</span>
                <span className="text-white">Dox</span>
              </h1>
              
              {/* Tagline */}
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Your ultimate destination for 
                <span className="text-orange-500 font-semibold"> Manga</span>,
                <span className="text-blue-400 font-semibold"> Manhwa</span>,
                <span className="text-green-400 font-semibold"> Manhua</span>,
                <span className="text-purple-400 font-semibold"> Novels</span>
                <br className="hidden sm:block" />
                — all in one platform.
              </p>
            </div>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="mb-12">
              <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-2xl blur-xl" />
                <div className="relative flex items-center bg-card/80 backdrop-blur-sm border-2 border-border hover:border-orange-500/50 focus-within:border-orange-500 rounded-2xl transition-all duration-300 shadow-2xl shadow-orange-500/10">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground ml-4 sm:ml-6 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search for your favorite manga, manhwa, anime..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-base sm:text-lg py-3 sm:py-4 px-4 focus:outline-none focus:ring-0 border-0 placeholder:text-muted-foreground/70 text-foreground"
                  />
                  <Button 
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white mr-2 sm:mr-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:scale-105"
                  >
                    <span className="hidden sm:inline">Search</span>
                    <Search className="w-5 h-5 sm:hidden" />
                  </Button>
                </div>
              </div>
            </form>



            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/browse">
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 sm:px-12 py-6 sm:py-7 text-base sm:text-lg font-bold rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg shadow-orange-500/30"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Exploring
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 sm:mt-20 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-orange-500">1000+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Titles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-orange-500">Free</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Access</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-orange-500">Daily</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Updates</div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-4 sm:px-6 lg:px-8 border-t border-border/50">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-muted-foreground text-sm">
              © 2025 <span className="text-white font-semibold">Ani</span><span className="text-orange-500 font-semibold">Ma</span><span className="text-white font-semibold">Dox</span>. Discover • Read • Enjoy
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}