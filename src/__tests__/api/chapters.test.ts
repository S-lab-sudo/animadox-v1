import { NextRequest } from 'next/server';
import { GET as getChapters } from '@/app/api/chapters/[contentId]/route';
import { GET as getChapter } from '@/app/api/chapter/[chapterId]/route';
import { supabase } from '@/lib/supabase';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('GET /api/chapters/[contentId]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return chapters for a content', async () => {
        const mockChapters = [
            { id: 'ch1', content_id: 'content1', number: 1, title: 'Chapter 1' },
            { id: 'ch2', content_id: 'content1', number: 2, title: 'Chapter 2' },
        ];

        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockChapters, error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/chapters/content1');
        const response = await getChapters(request, { params: Promise.resolve({ contentId: 'content1' }) });
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data).toHaveLength(2);
        expect(json.data[0].number).toBe(1);
    });

    it('should return 400 if contentId is missing', async () => {
        const request = new NextRequest('http://localhost:8000/api/chapters/');
        const response = await getChapters(request, { params: Promise.resolve({ contentId: '' }) });
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Content ID is required');
    });
});

describe('GET /api/chapter/[chapterId]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return chapter with pages from manifest', async () => {
        const mockChapter = { id: 'ch1', content_id: 'c1', number: 1, title: 'Test Chapter' };
        const mockManifest = {
            manifest: {
                pages: [
                    { page_number: 1, image_url: 'http://img1.jpg' },
                    { page_number: 2, image_url: 'http://img2.jpg' },
                ],
                page_count: 2,
            },
        };

        const mockChapterQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [mockChapter], error: null }),
        };

        const mockManifestQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockManifest, error: null }),
        };

        (mockSupabase.from as jest.Mock)
            .mockReturnValueOnce(mockChapterQuery)
            .mockReturnValueOnce(mockManifestQuery);

        const request = new NextRequest('http://localhost:8000/api/chapter/ch1');
        const response = await getChapter(request, { params: Promise.resolve({ chapterId: 'ch1' }) });
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data.pages).toHaveLength(2);
    });

    it('should return 404 if chapter not found', async () => {
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        };

        (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery);

        const request = new NextRequest('http://localhost:8000/api/chapter/nonexistent');
        const response = await getChapter(request, { params: Promise.resolve({ chapterId: 'nonexistent' }) });
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.error).toBe('Chapter not found');
    });

    it('should fallback to chapter_pages if manifest not found', async () => {
        const mockChapter = { id: 'ch1', content_id: 'c1', number: 1, title: 'Test' };
        const mockPages = [
            { id: 'p1', chapter_id: 'ch1', page_number: 1, image_url: 'http://img.jpg' },
        ];

        const mockChapterQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [mockChapter], error: null }),
        };

        const mockManifestQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        };

        const mockPagesQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockPages, error: null }),
        };

        (mockSupabase.from as jest.Mock)
            .mockReturnValueOnce(mockChapterQuery)
            .mockReturnValueOnce(mockManifestQuery)
            .mockReturnValueOnce(mockPagesQuery);

        const request = new NextRequest('http://localhost:8000/api/chapter/ch1');
        const response = await getChapter(request, { params: Promise.resolve({ chapterId: 'ch1' }) });
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data.pages).toHaveLength(1);
    });
});
