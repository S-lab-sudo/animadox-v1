'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Bell, BookOpen, Check, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Notification {
  id: string;
  title: string;
  message: string;
  link_url: string;
  is_read: boolean;
  created_at: string;
  content?: {
    type: string;
    cover_image_url: string;
  };
}

export default function UpdatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      fetchNotifications();
    }
  }, [user, authLoading, router]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_notifications')
        .select(`
          *,
          content:content_id (
            type,
            cover_image_url
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching updates:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('user_notifications').update({ is_read: true }).eq('id', id);
    router.refresh(); 
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    router.refresh();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4 sm:p-8 flex justify-center items-start pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar searchQuery="" onSearchChange={() => {}} />
      <div className="p-4 sm:p-8 pt-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Bell className="text-orange-500" />
                Your Updates
              </h1>
              <p className="text-gray-400 mt-1">Stay up to date with your subscribed content</p>
            </div>
            
            {notifications.some(n => !n.is_read) && (
              <Button 
                onClick={markAllRead} 
                variant="outline" 
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10 cursor-pointer"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-300">No updates yet</h3>
              <p className="text-gray-500 mt-2">Subscribe to some content to see updates here!</p>
              <Link href="/browse" className="inline-block mt-4">
                 <Button className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">Browse Content</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`relative group flex gap-4 p-4 rounded-lg border transition-all duration-300 ${
                    notification.is_read 
                      ? 'bg-zinc-900/30 border-zinc-800/50 opacity-70 hover:opacity-100' 
                      : 'bg-zinc-900 border-orange-500/30 shadow-[0_0_15px_-5px_rgba(249,115,22,0.1)]'
                  }`}
                >
                  <div className="flex-shrink-0 w-16 h-24 sm:w-20 sm:h-28 bg-zinc-800 rounded overflow-hidden relative">
                     {notification.content?.cover_image_url ? (
                       <img 
                         src={notification.content.cover_image_url} 
                         alt="Access cover" 
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                       />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-zinc-600">
                         <BookOpen size={24} />
                       </div>
                     )}
                  </div>

                  <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {notification.content?.type && (
                           <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-gray-300 border border-zinc-700 uppercase tracking-wider">
                             {notification.content.type}
                           </span>
                        )}
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        )}
                        <span className="text-xs text-gray-500 ml-auto">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      <h3 className={`text-lg font-semibold truncate pr-4 ${!notification.is_read ? 'text-white' : 'text-gray-300'}`}>
                        {notification.title.replace('New Update: ', '')}
                      </h3>
                      
                      <p className="text-orange-400 font-medium text-sm mt-1 flex items-center gap-2">
                         {notification.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <Link href={notification.link_url} className="flex-1 sm:flex-none">
                         <Button 
                           size="sm" 
                           className="w-full sm:w-auto bg-white text-black hover:bg-gray-200 font-medium cursor-pointer"
                           onClick={() => markAsRead(notification.id)}
                         >
                           Read Now 
                           <ExternalLink className="w-3 h-3 ml-2" />
                         </Button>
                      </Link>
                      {!notification.is_read && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => markAsRead(notification.id)}
                            className="text-gray-400 hover:text-white cursor-pointer"
                          >
                            Mark as read
                          </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
