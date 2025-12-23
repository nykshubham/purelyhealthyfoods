import { defineCollection, z } from 'astro:content';

const commonSchema = z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    author: z.string().default('Editorial Team'),
    category: z.string().optional(), // Make optional as collection defines type mostly
    tags: z.array(z.string()).default([]),
});

const posts = defineCollection({
    type: 'content',
    schema: commonSchema,
});

const news = defineCollection({
    type: 'content',
    schema: commonSchema,
});

const editorials = defineCollection({
    type: 'content',
    schema: commonSchema,
});

const research = defineCollection({
    type: 'content',
    schema: commonSchema,
});

export const collections = { posts, news, editorials, research };
