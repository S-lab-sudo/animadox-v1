/**
 * User Tracking System
 * Handles unique user identification and reading progress tracking
 */

import { v4 as uuidv4 } from 'uuid';

const SESSION_TOKEN_KEY = 'aniverse_session_token';
const READING_PROGRESS_KEY = 'aniverse_reading_progress';
const CHAPTER_HISTORY_KEY = 'aniverse_chapter_history';
// Session storage key to track if we've already synced the session in this browser session
const SESSION_SYNCED_KEY = 'aniverse_session_synced';

// Types
export interface ReadingProgress {
  contentId: string;
  lastReadChapterId: string;
  lastReadChapterNumber: number;
  progressPercentage: number;
  lastReadAt: string;
}

export interface ChapterVisit {
  chapterId: string;
  visitedAt: string;
  timeSpentSeconds: number;
  progressPercentage: number;
}

// Get or create unique session token
export function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let token: string | null = localStorage.getItem(SESSION_TOKEN_KEY);

  if (!token) {
    token = uuidv4();
    localStorage.setItem(SESSION_TOKEN_KEY, token);

    // Sync to database on first creation (fire and forget, but will complete)
    void syncSessionTokenToDatabase(token);
  }

  return token as string;
}

// Get current session token
export function getSessionToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem(SESSION_TOKEN_KEY) || '';
}

// Sync session token to database
async function syncSessionTokenToDatabase(token: string) {
  try {
    const response = await fetch('/api/tracking/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: token }),
    });

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to sync session token to database');
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error syncing session token:', error);
    }
  }
}

// Save reading progress for a content item
export function saveReadingProgress(
  contentId: string,
  chapterId: string,
  chapterNumber: number,
  progressPercentage: number = 0
): ReadingProgress {
  if (typeof window === 'undefined') {
    return {} as ReadingProgress;
  }

  const sessionToken = getOrCreateSessionToken();
  const progress: ReadingProgress = {
    contentId,
    lastReadChapterId: chapterId,
    lastReadChapterNumber: chapterNumber,
    progressPercentage,
    lastReadAt: new Date().toISOString(),
  };

  // Get existing progress
  const progressMap = getReadingProgressMap();
  progressMap[contentId] = progress;

  // Save to localStorage
  localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(progressMap));

  // Sync to database (fire-and-forget, errors handled internally)
  void syncReadingProgressToDatabase(sessionToken, contentId, progress);

  return progress;
}

// Get reading progress for a specific content
export function getReadingProgress(contentId: string): ReadingProgress | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const progressMap = getReadingProgressMap();
  return progressMap[contentId] || null;
}

// Get all reading progress
export function getReadingProgressMap(): Record<string, ReadingProgress> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const data = localStorage.getItem(READING_PROGRESS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error parsing reading progress:', error);
    }
    return {};
  }
}

// Add chapter to history
export function addChapterToHistory(
  chapterId: string,
  contentId: string,
  timeSpentSeconds: number = 0,
  progressPercentage: number = 0
): ChapterVisit {
  if (typeof window === 'undefined') {
    return {} as ChapterVisit;
  }

  const sessionToken = getOrCreateSessionToken();
  const visit: ChapterVisit = {
    chapterId,
    visitedAt: new Date().toISOString(),
    timeSpentSeconds,
    progressPercentage,
  };

  // Get existing history
  const historyMap = getChapterHistoryMap();
  const key = `${contentId}:${chapterId}`;
  historyMap[key] = visit;

  // Save to localStorage
  localStorage.setItem(CHAPTER_HISTORY_KEY, JSON.stringify(historyMap));

  // Sync to database (fire-and-forget, errors handled internally)
  void syncChapterVisitToDatabase(sessionToken, chapterId, contentId, visit);

  return visit;
}

// Get all visited chapters for a content
export function getVisitedChaptersForContent(contentId: string): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  const historyMap = getChapterHistoryMap();
  const visited = new Set<string>();

  for (const key in historyMap) {
    if (key.startsWith(`${contentId}:`)) {
      const chapterId = key.split(':')[1];
      visited.add(chapterId);
    }
  }

  return visited;
}

// Get chapter history map
export function getChapterHistoryMap(): Record<string, ChapterVisit> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const data = localStorage.getItem(CHAPTER_HISTORY_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error parsing chapter history:', error);
    }
    return {};
  }
}

// Check if chapter has been visited
export function isChapterVisited(contentId: string, chapterId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const historyMap = getChapterHistoryMap();
  const key = `${contentId}:${chapterId}`;
  return key in historyMap;
}

// Sync reading progress to database
async function syncReadingProgressToDatabase(
  sessionToken: string,
  contentId: string,
  progress: ReadingProgress
) {
  try {
    // Ensure session exists in database before syncing progress
    await ensureSessionExists(sessionToken);

    const response = await fetch('/api/tracking/save-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken,
        contentId,
        lastReadChapterId: progress.lastReadChapterId,
        lastReadChapterNumber: progress.lastReadChapterNumber,
        progressPercentage: progress.progressPercentage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to sync reading progress:', error);
      }
    }
  } catch (error) {
    console.error('Error syncing reading progress:', error);
  }
}

// Sync chapter visit to database
async function syncChapterVisitToDatabase(
  sessionToken: string,
  chapterId: string,
  contentId: string,
  visit: ChapterVisit
) {
  try {
    // Ensure session exists in database before syncing chapter visit
    await ensureSessionExists(sessionToken);

    const response = await fetch('/api/tracking/add-chapter-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken,
        chapterId,
        contentId,
        timeSpentSeconds: visit.timeSpentSeconds,
        progressPercentage: visit.progressPercentage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to sync chapter visit:', error);
      }
    }
  } catch (error) {
    console.error('Error syncing chapter visit:', error);
  }
}

// Ensure session token is created in database
async function ensureSessionExists(sessionToken: string): Promise<void> {
  // Optimization: Check if we've already synced this session in the current browser session
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_SYNCED_KEY) === 'true') {
    return;
  }

  try {
    const response = await fetch('/api/tracking/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken }),
    });

    if (!response.ok) {
      console.error('Failed to ensure session exists in database');
    } else {
      // Mark as synced so we don't call this again during this session
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SESSION_SYNCED_KEY, 'true');
      }
    }
  } catch (error) {
    console.error('Error ensuring session exists:', error);
  }
}

// Initialize tracking on app load
export function initializeTracking() {
  if (typeof window === 'undefined') {
    return;
  }

  // Ensure session token exists
  getOrCreateSessionToken();
}
