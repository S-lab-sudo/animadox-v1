/**
 * Zod validation schemas for all API routes
 * Provides runtime type validation to prevent injection attacks and ensure data integrity
 */

import { z } from 'zod';

// ============ Common Schemas ============

// UUID validation for IDs
export const UUIDSchema = z.string().uuid('Invalid ID format');

// Session token schema (UUID format)
export const SessionTokenSchema = z.string().uuid('Invalid session token format');

// Pagination schema
export const PaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============ Content Schemas ============

export const ContentTypeEnum = z.enum(['all', 'manga', 'manhwa', 'anime', 'novel', 'manhua']);

export const ContentListQuerySchema = z.object({
    contentType: ContentTypeEnum.optional().default('all'),
    search: z.string().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ContentIdParamSchema = z.object({
    id: UUIDSchema,
});

// ============ Search Schemas ============

export const SearchQuerySchema = z.object({
    q: z.string()
        .min(1, 'Search query cannot be empty')
        .max(100, 'Search query too long')
        .transform(val => val.trim().toLowerCase()),
});

export const SearchHeadersSchema = z.object({
    'x-session-token': SessionTokenSchema,
});

// ============ Tracking Schemas ============

export const CreateSessionSchema = z.object({
    sessionToken: SessionTokenSchema,
});

export const SaveProgressSchema = z.object({
    sessionToken: SessionTokenSchema,
    contentId: UUIDSchema,
    lastReadChapterId: UUIDSchema.optional(),
    lastReadChapterNumber: z.number().int().min(0).optional(),
    progressPercentage: z.number().min(0).max(100).default(0),
});

export const AddChapterVisitSchema = z.object({
    sessionToken: SessionTokenSchema,
    chapterId: UUIDSchema,
    contentId: UUIDSchema,
    timeSpentSeconds: z.number().int().min(0).default(0),
    progressPercentage: z.number().min(0).max(100).default(0),
});

export const ReadingProgressQuerySchema = z.object({
    sessionToken: SessionTokenSchema,
    contentId: UUIDSchema,
});

export const VisitedChaptersQuerySchema = z.object({
    sessionToken: SessionTokenSchema,
    contentId: UUIDSchema,
});

export const ReadingHistoryQuerySchema = z.object({
    sessionToken: SessionTokenSchema,
});

// ============ Chapter Schemas ============

export const ChapterIdParamSchema = z.object({
    chapterId: UUIDSchema,
});

export const ChaptersQuerySchema = z.object({
    contentId: UUIDSchema,
});

// ============ Request Content Schemas ============

export const RequestContentSchema = z.object({
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title too long')
        .transform(val => val.trim()),
    type: ContentTypeEnum.optional().default('manhwa'),
    description: z.string().max(1000).optional().transform(val => val?.trim() || null),
    email: z.string().email('Invalid email format').optional().transform(val => val?.trim() || null),
});

// ============ Content Requests Query Schema ============

export const ContentRequestsQuerySchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ============ Helper function to validate and extract ============

export function validateBody<T extends z.ZodSchema>(
    schema: T,
    data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
    const result = schema.safeParse(data);
    if (!result.success) {
        const firstError = result.error.issues[0];
        return {
            success: false,
            error: firstError?.message || 'Validation failed',
        };
    }
    return { success: true, data: result.data };
}

export function validateQuery<T extends z.ZodSchema>(
    schema: T,
    searchParams: URLSearchParams
): { success: true; data: z.infer<T> } | { success: false; error: string } {
    const params = Object.fromEntries(searchParams.entries());
    return validateBody(schema, params);
}
