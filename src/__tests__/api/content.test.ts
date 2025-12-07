import { NextRequest } from 'next/server';
import { GET } from '@/app/api/content/route';
import { supabase } from '@/lib/supabase';

// Type the mocked supabase
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('GET /api/content', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return contents with pagination', async () => {
        const mockContents = [
            { id: '1', title: 'Test Content 1', type: 'manhwa' },
            { id: '2', title: 'Test Content 2', type: 'manga' },
        ];

        // Mock the chained Supabase calls
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
                data: mockContents,
                error: null,
                count: 2,
            }),
        };

        // Mock chapter count query
        const mockChapterQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
        };

        (mockSupabase.from as jest.Mock)
            .mockReturnValueOnce(mockQuery)
            .mockReturnValue(mockChapterQuery);

        const request = new NextRequest('http://localhost:8000/api/content?page=1&limit=20');
        const response = await GET(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data).toHaveLength(2);
        expect(json.pagination).toBeDefined();
        expect(json.pagination.page).toBe(1);
        expect(json.pagination.limit).toBe(20);
    });

    it('should filter by content type', async () => {
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
                data: [{ id: '1', title: 'Manhwa Content', type: 'manhwa' }],
                error: null,
                count: 1,
            }),
        };

        const mockChapterQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ count: 3, error: null }),
        };

        (mockSupabase.from as jest.Mock)
            .mockReturnValueOnce(mockQuery)
            .mockReturnValue(mockChapterQuery);

        const request = new NextRequest('http://localhost:8000/api/content?contentType=manhwa');
        const response = await GET(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(mockQuery.eq).toHaveBeenCalledWith('type', 'manhwa');
    });

    it('should handle database errors gracefully', async () => {
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
                count: 0,
            }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/content');
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.success).toBe(false);
        expect(json.error).toBe('Unable to load content. Please try again later.');
    });

    it('should search content by title', async () => {
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
                data: [{ id: '1', title: 'Solo Leveling', type: 'manhwa' }],
                error: null,
                count: 1,
            }),
        };

        const mockChapterQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ count: 100, error: null }),
        };

        (mockSupabase.from as jest.Mock)
            .mockReturnValueOnce(mockQuery)
            .mockReturnValue(mockChapterQuery);

        const request = new NextRequest('http://localhost:8000/api/content?search=solo');
        const response = await GET(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(mockQuery.or).toHaveBeenCalled();
    });
});
