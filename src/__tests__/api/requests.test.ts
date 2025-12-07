import { NextRequest } from 'next/server';
import { POST as createRequest } from '@/app/api/request-content/route';
import { GET as getRequests } from '@/app/api/content-requests/route';
import { supabase } from '@/lib/supabase';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('POST /api/request-content', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a content request successfully', async () => {
        const mockQuery = {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'req1' }, error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/request-content', {
            method: 'POST',
            body: JSON.stringify({
                title: 'Solo Leveling',
                type: 'manhwa',
                description: 'Please add this manhwa',
                email: 'test@example.com',
            }),
        });

        const response = await createRequest(request);
        const json = await response.json();

        expect(response.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.message).toContain("You'll get your content in short time");
        expect(json.data.id).toBe('req1');
    });

    it('should return 400 if title is missing', async () => {
        const request = new NextRequest('http://localhost:8000/api/request-content', {
            method: 'POST',
            body: JSON.stringify({
                type: 'manhwa',
            }),
        });

        const response = await createRequest(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Title is required');
    });

    it('should return 400 if title is empty string', async () => {
        const request = new NextRequest('http://localhost:8000/api/request-content', {
            method: 'POST',
            body: JSON.stringify({
                title: '   ',
                type: 'manhwa',
            }),
        });

        const response = await createRequest(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Title is required');
    });

    it('should handle database errors', async () => {
        const mockQuery = {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/request-content', {
            method: 'POST',
            body: JSON.stringify({
                title: 'Test Content',
            }),
        });

        const response = await createRequest(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.error).toBe('Failed to submit request');
    });

    it('should use default type if not provided', async () => {
        const mockQuery = {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'req1' }, error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/request-content', {
            method: 'POST',
            body: JSON.stringify({
                title: 'Test Content',
            }),
        });

        await createRequest(request);

        expect(mockQuery.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'manhwa',
            })
        );
    });
});

describe('GET /api/content-requests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return all content requests', async () => {
        const mockRequests = [
            { id: '1', title: 'Request 1', status: 'pending' },
            { id: '2', title: 'Request 2', status: 'approved' },
        ];

        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockRequests, error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/content-requests');
        const response = await getRequests(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data).toHaveLength(2);
        expect(json.count).toBe(2);
    });

    it('should filter by status', async () => {
        const mockRequests = [{ id: '1', title: 'Request 1', status: 'pending' }];

        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockRequests, error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/content-requests?status=pending');
        const response = await getRequests(request);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data).toHaveLength(1);
        expect(mockQuery.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('should handle database errors', async () => {
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/content-requests');
        const response = await getRequests(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.error).toBe('Failed to fetch requests');
    });
});
