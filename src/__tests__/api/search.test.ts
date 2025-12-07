import { NextRequest } from 'next/server';
import { GET } from '@/app/api/search/route';
import { supabase } from '@/lib/supabase';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('GET /api/search', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return search results', async () => {
        const mockResults = [
            { id: '1', title: 'Solo Leveling', cover_image_url: 'http://img.jpg', average_rating: 4.5, year_published: 2020, created_at: '2020-01-01' },
            { id: '2', title: 'Solo Max-Level Newbie', cover_image_url: 'http://img2.jpg', average_rating: 4.2, year_published: 2021, created_at: '2021-01-01' },
        ];

        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: mockResults, error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/search?query=solo', {
            headers: { 'x-session-token': 'test-token' },
        });

        const response = await GET(request);
        const json = await response.json();

        expect(json.results).toHaveLength(2);
        expect(json.count).toBe(2);
        expect(json.results[0].title).toBe('Solo Leveling');
    });

    it('should return 400 if query is missing', async () => {
        const request = new NextRequest('http://localhost:8000/api/search', {
            headers: { 'x-session-token': 'test-token' },
        });

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Query parameter required');
    });

    it('should return 401 if session token is missing', async () => {
        const request = new NextRequest('http://localhost:8000/api/search?query=test');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
    });

    it('should handle database errors', async () => {
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/search?query=test', {
            headers: { 'x-session-token': 'test-token' },
        });

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.error).toBe('Search failed');
    });

    it('should map results correctly', async () => {
        const mockResults = [
            { id: '1', title: 'Test', cover_image_url: null, average_rating: null, year_published: null, created_at: '2020-05-15' },
        ];

        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: mockResults, error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/search?query=test', {
            headers: { 'x-session-token': 'test-token' },
        });

        const response = await GET(request);
        const json = await response.json();

        expect(json.results[0].cover_image).toBe('/placeholder.png');
        expect(json.results[0].rating).toBe(0);
        expect(json.results[0].published_date).toBe('2020');
    });
});
