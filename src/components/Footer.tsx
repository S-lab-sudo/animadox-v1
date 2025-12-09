'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function Footer() {
  const { toast } = useToast();
  const [requestVariant, setRequestVariant] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const email = formData.get('email') as string;
    
    if (!title || !requestVariant) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Request Submitted",
      description: `Your request for "${title}" has been submitted!`,
    });
    
    e.currentTarget.reset();
    setRequestVariant('');
  };

  return (
    <footer className="border-t border-border mt-6 bg-card w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <div className="text-center mb-4">
            <h4 className="text-base md:text-xl font-semibold text-foreground inline-block mr-2">
              Request Content
            </h4>
            <span className="text-xs md:text-sm text-muted-foreground">
              (Get what you want within 1 hour of request)
            </span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Enter content title..."
                  className="h-9 text-sm md:text-base focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all px-3"
                  autoComplete="off"
                />
              </div>
              <div className="flex-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email..."
                  className="h-9 text-sm md:text-base focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all px-3"
                  autoComplete="off"
                />
              </div>
              <div className="flex-1">
                <Select value={requestVariant} onValueChange={setRequestVariant}>
                  <SelectTrigger className="h-9 text-sm md:text-base cursor-pointer bg-background border-input text-foreground">
                    <SelectValue placeholder="Select variant..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="manga">Manga</SelectItem>
                    <SelectItem value="manhwa">Manhwa</SelectItem>
                    <SelectItem value="manhua">Manhua</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="novel">Novel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full h-9 cursor-pointer bg-orange-500 hover:bg-orange-600 text-white text-sm md:text-base font-medium" size="lg">
              Submit Request
            </Button>
          </form>
        </div>
        
        <div className="text-center mb-6">
          <h3 className="text-lg md:text-2xl font-bold text-foreground mb-2">
            <span className="text-white">Ani</span><span className="text-orange-500">Ma</span><span className="text-white">Dox</span>
          </h3>
          <p className="text-muted-foreground text-[10px] md:text-sm">
            Discover • Read • Enjoy
          </p>
        </div>
      </div>
    </footer>
  );
}
