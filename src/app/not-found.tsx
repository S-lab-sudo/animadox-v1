import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">Page not found</p>
        <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/">
          <Button className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
