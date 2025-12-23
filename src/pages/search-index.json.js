import { getCollection } from 'astro:content';

export async function GET() {
    const news = await getCollection('news');
    const editorials = await getCollection('editorials');
    const research = await getCollection('research');
    const posts = await getCollection('posts');

    const allPosts = [
        ...news.map(p => ({ ...p, collection: 'news' })),
        ...editorials.map(p => ({ ...p, collection: 'editorials' })),
        ...research.map(p => ({ ...p, collection: 'research' })),
        ...posts.map(p => ({ ...p, collection: 'blog' })) // Legacy 'posts' -> /blog/
    ];

    const searchList = allPosts.map((post) => ({
        title: post.data.title,
        description: post.data.description,
        slug: post.slug,
        category: post.data.category,
        date: post.data.pubDate,
        path: post.collection === 'blog' ? `/blog/${post.slug}/` : `/${post.collection}/${post.slug}/`
    }));

    return new Response(JSON.stringify(searchList), {
        headers: {
            'content-type': 'application/json',
        },
    });
}
