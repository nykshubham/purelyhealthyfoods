import { getCollection } from 'astro:content';

export async function GET() {
    const news = await getCollection('news');
    const posts = await getCollection('posts');

    const searchIndex = [
        ...news.map(p => ({ ...p, collection: 'news' })),
        ...posts.map(p => ({ ...p, collection: 'posts' })) // Legacy 'posts' -> /blog/
    ];

    const searchList = searchIndex.map((post) => ({
        title: post.data.title,
        description: post.data.description,
        slug: post.slug,
        category: post.data.category,
        date: post.data.pubDate,
        path: post.collection === 'blog' ? `/blog/${post.slug}/` : `/${post.collection}/${post.slug}/`
    }));

    return new Response(JSON.stringify(searchList), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}
