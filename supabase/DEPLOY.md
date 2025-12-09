# Supabase Edge Functions Setup

This document provides instructions for deploying the Supabase Edge Functions created to improve cold start times for the browse page and notifications.

## Prerequisites

1. **Install Supabase CLI**:
   ```powershell
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```powershell
   supabase login
   ```

3. **Link your project**:
   ```powershell
   cd c:\Users\sjugj\AniVerseHub\client-webpage\frontend
   supabase link --project-ref dujvlcrbrusntcafoxqw
   ```

## Edge Functions Created

### 1. `get-browse-content`
- **Path**: `supabase/functions/get-browse-content/index.ts`
- **Purpose**: Fetches content list with caching (5 min CDN cache)
- **Query Parameters**:
  - `type` - Content type filter (manga, manhwa, etc.)
  - `search` - Search term for title
  - `limit` - Max results (default 50)

### 2. `get-notifications`
- **Path**: `supabase/functions/get-notifications/index.ts`
- **Purpose**: Fetches unread notifications for a user (30 sec cache)
- **Query Parameters**:
  - `user_id` - Required. The user's UUID

## Deploying the Functions

Run these commands from the `client-webpage/frontend` directory:

```powershell
# Deploy both functions
supabase functions deploy get-browse-content
supabase functions deploy get-notifications
```

## Environment Variables

The Edge Functions automatically have access to these Supabase secrets:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_ANON_KEY` - Public anon key

No additional secrets needed!

## Frontend Updates

The following files were updated to use the Edge Functions:
- `src/lib/api.ts` - `fetchContents` now calls `get-browse-content` Edge Function
- `src/components/Navbar.tsx` - Notification count uses `get-notifications` Edge Function

Both implementations include fallback to direct Supabase queries if Edge Functions fail.

## Testing Locally

To test Edge Functions locally:

```powershell
supabase functions serve
```

This starts a local server at `http://localhost:54321/functions/v1/`

## Expected Performance Improvement

- **Before**: 10-12 seconds cold start (Node.js backend)
- **After**: ~50ms cold start (Deno Deploy edge)
- **Cached**: 0ms (served from CDN cache)
