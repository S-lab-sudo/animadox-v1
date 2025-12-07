import { NextRequest } from 'next/server';
import { POST as createSession } from '@/app/api/tracking/create-session/route';
import { POST as saveProgress } from '@/app/api/tracking/save-progress/route';
import { POST as addChapterVisit } from '@/app/api/tracking/add-chapter-visit/route';
import { GET as getReadingProgress } from '@/app/api/tracking/reading-progress/route';
import { GET as getVisitedChapters } from '@/app/api/tracking/visited-chapters/route';
import { GET as getReadingHistory } from '@/app/api/tracking/reading-history/route';
import { supabase } from '@/lib/supabase';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('POST /api/tracking/create-session', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a session successfully', async () => {
        const mockQuery = {
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: [{ session_token: 'test-token' }], error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/tracking/create-session', {
            method: 'POST',
            body: JSON.stringify({ sessionToken: 'test-token' }),
        });

        const response = await createSession(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions');
    });

    it('should return 400 if session token is missing', async () => {
        const request = new NextRequest('http://localhost:8000/api/tracking/create-session', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const response = await createSession(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Session token is required');
    });
});

describe('POST /api/tracking/save-progress', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should save reading progress', async () => {
        const mockQuery = {
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/tracking/save-progress', {
            method: 'POST',
            body: JSON.stringify({
                sessionToken: 'test-token',
                contentId: 'content1',
                lastReadChapterId: 'ch1',
                lastReadChapterNumber: 5,
                progressPercentage: 50,
            }),
        });

        const response = await saveProgress(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('reading_progress');
    });

    it('should return 400 if required fields are missing', async () => {
        const request = new NextRequest('http://localhost:8000/api/tracking/save-progress', {
            method: 'POST',
            body: JSON.stringify({ sessionToken: 'test' }),
        });

        const response = await saveProgress(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Session token and content ID are required');
    });
});

describe('POST /api/tracking/add-chapter-visit', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should add chapter visit', async () => {
        const mockQuery = {
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/tracking/add-chapter-visit', {
            method: 'POST',
            body: JSON.stringify({
                sessionToken: 'test-token',
                chapterId: 'ch1',
                contentId: 'content1',
                timeSpentSeconds: 120,
            }),
        });

        const response = await addChapterVisit(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('chapter_history');
    });
});

describe('GET /api/tracking/reading-progress', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should get reading progress', async () => {
        const mockProgress = {
            session_token: 'test',
            content_id: 'c1',
            last_read_chapter_number: 5,
        };

        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/tracking/reading-progress?sessionToken=test&contentId=c1');
        const response = await getReadingProgress(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data.last_read_chapter_number).toBe(5);
    });

    it('should return null if no progress found', async () => {
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/tracking/reading-progress?sessionToken=test&contentId=c1');
        const response = await getReadingProgress(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data).toBeNull();
    });
});

describe('GET /api/tracking/visited-chapters', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return visited chapter IDs', async () => {
        const mockData = [{ chapter_id: 'ch1' }, { chapter_id: 'ch2' }];

        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
        };
        // Mock the second eq to return the data
        mockQuery.eq.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({ data: mockData, error: null });

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/tracking/visited-chapters?sessionToken=test&contentId=c1');
        const response = await getVisitedChapters(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data).toEqual(['ch1', 'ch2']);
    });
});

describe('GET /api/tracking/reading-history', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return reading history', async () => {
        const mockHistory = [
            { content_id: 'c1', last_read_at: '2024-01-01' },
            { content_id: 'c2', last_read_at: '2024-01-02' },
        ];

        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockHistory, error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/tracking/reading-history?sessionToken=test');
        const response = await getReadingHistory(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data).toHaveLength(2);
    });
});
