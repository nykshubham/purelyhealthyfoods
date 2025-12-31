
import { schedule } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Parser from 'rss-parser';
import slugify from 'slugify';
// JSDOM and Readability removed for Netlify compatibility

// --- Configuration ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PUBLIC_REPO_OWNER = process.env.PUBLIC_REPO_OWNER; // e.g., 'nykshubham'
const PUBLIC_REPO_NAME = process.env.PUBLIC_REPO_NAME;   // e.g., 'purelyhealthyfoods'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const parser = new Parser();

// Topics Configuration (Same as local script)
const TOPICS = [
    {
        query: 'food safety news',
        collection: 'news',
        category: 'Food Safety',
        promptExtra: 'Focus on recent regulatory changes, recalls, or scientific discoveries. Keep it journalistic.',
        weight: 0.3
    },
    {
        query: 'nutrition science research',
        collection: 'news',
        category: 'Nutrition',
        promptExtra: 'Summarize recent study findings. Focus on facts and methodology. Avoid hype.',
        weight: 0.3
    },
    {
        query: 'weight loss science tips',
        collection: 'posts',
        category: 'Weight Management',
        promptExtra: 'Focus on sustainable, science-backed weight management strategies. Debunk myths if relevant. strict-no-fad-diets.',
        weight: 0.14
    },
    {
        query: 'healthy dinner recipes trends',
        collection: 'posts',
        category: 'Recipes',
        type: 'recipe',
        promptExtra: 'Include a delicious, healthy recipe. MUST include a detailed Ingredients list and Step-by-Step Instructions.',
        weight: 0.13
    },
    {
        query: 'healthy eating tips blog',
        collection: 'posts',
        category: 'Blog',
        promptExtra: 'Write a helpful, engaging blog post about healthy eating habits. Use a friendly but authoritative tone.',
        weight: 0.13
    }
];

const CATEGORY_IMAGES: Record<string, string[]> = {
    'Food Safety': [
        'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070',
        'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=2070',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070',
        'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=2070',
    ],
    'Nutrition': [
        'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2070',
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070',
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070',
        'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=2070',
    ],
    'Weight Management': [
        'https://images.unsplash.com/photo-1511690656952-34342d5c2895?q=80&w=2070',
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070',
        'https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=2070',
        'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=2070',
    ],
    'Recipes': [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2070',
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070',
        'https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=2070',
        'https://images.unsplash.com/photo-1493770348161-369560ae357d?q=80&w=2070',
    ],
    'Blog': [
        'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070',
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=2070',
        'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=2070',
        'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=2070',
    ]
};

// --- Helpers ---

// Weighted Random Selection
function selectTopic() {
    const r = Math.random();
    let accumulatedWeight = 0;
    for (const topic of TOPICS) {
        accumulatedWeight += topic.weight;
        if (r <= accumulatedWeight) return topic;
    }
    return TOPICS[0];
}

// fetchArticleContent removed - JSDOM not supported in Netlify execution environment

async function getUnsplashImage(query: string, category: string): Promise<string> {
    if (UNSPLASH_ACCESS_KEY) {
        try {
            const response = await fetch(`${UNSPLASH_API_URL}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
                headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
            });
            const data = await response.json();
            if (data.results?.[0]?.urls?.regular) {
                return data.results[0].urls.regular;
            }
        } catch (e) { console.warn('Unsplash fail', e); }
    }
    const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Blog'];
    let hash = 0;
    for (let i = 0; i < query.length; i++) hash = query.charCodeAt(i) + ((hash << 5) - hash);
    return images[Math.abs(hash) % images.length];
}

// Check if file exists in Repo via GitHub API
async function fileExistsInRepo(path: string): Promise<boolean> {
    if (!GITHUB_TOKEN || !PUBLIC_REPO_OWNER || !PUBLIC_REPO_NAME) return false; // Fail open (generate duplicate potentially, but safer than crashing)

    try {
        const url = `https://api.github.com/repos/${PUBLIC_REPO_OWNER}/${PUBLIC_REPO_NAME}/contents/${path}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'User-Agent': 'PurelyHealthyFoods-Bot'
            }
        });
        return res.status === 200;
    } catch {
        return false;
    }
}

// Commit file to GitHub
async function commitFileToRepo(path: string, content: string, message: string) {
    if (!GITHUB_TOKEN || !PUBLIC_REPO_OWNER || !PUBLIC_REPO_NAME) {
        throw new Error('Missing GitHub Credentials');
    }

    const url = `https://api.github.com/repos/${PUBLIC_REPO_OWNER}/${PUBLIC_REPO_NAME}/contents/${path}`;
    const base64Content = Buffer.from(content).toString('base64');

    const body = {
        message: message,
        content: base64Content,
        branch: 'main' // or 'master'
    };

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'User-Agent': 'PurelyHealthyFoods-Bot',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`GitHub Commit Failed: ${res.status} ${errorText}`);
    }
}

// --- Main Handler ---

const myHandler = async (event: any) => {
    console.log('[Scheduled Function] Starting content generation...');

    // Check Env
    if (!GEMINI_API_KEY) {
        console.error('Missing GEMINI_API_KEY');
        return { statusCode: 500 };
    }

    const topic = selectTopic();
    console.log(`Selected Topic: ${topic.category}`);

    // Fetch Feed
    const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic.query)}&hl=en-GB&gl=GB&ceid=GB:en`;
    const feed = await parser.parseURL(feedUrl);

    // Find NEW item
    let selectedItem = null;
    let filename = '';

    for (const item of feed.items.slice(0, 10)) {
        const slug = slugify(item.title || '', { lower: true, strict: true });
        const filePath = `src/content/${topic.collection}/${slug}.mdx`;

        const exists = await fileExistsInRepo(filePath);
        if (!exists) {
            selectedItem = item;
            filename = filePath; // e.g. src/content/news/title.mdx
            break;
        }
    }

    if (!selectedItem) {
        console.log('No new items found.');
        return { statusCode: 200 };
    }

    // Generate Content
    console.log(`Generating: ${selectedItem.title}`);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    // Use content snippet from feed instead of fetching full article
    const contextContent = selectedItem.contentSnippet || selectedItem.content || '';

    const prompt = `
        You are an expert content creator for 'Purely Healthy Foods'.
        Task: Create a blog post based on the provided context.
        
        Category: ${topic.category}
        Title (Source): ${selectedItem.title}
        Context: ${contextContent}
        Instructions: ${topic.promptExtra}
        
        OUTPUT FORMAT: JSON ONLY.
        Structure:
        {
            "title": "Engaging title for the post",
            "description": "SEO optimized description (max 160 chars)",
            "tags": ["tag1", "tag2", "tag3"],
            "markdownBody": "The full content of the post in Markdown format. Use headers, lists, etc. Do NOT include frontmatter here."
        }
    `;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
    });

    let generatedData;
    try {
        const text = result.response.text();
        generatedData = JSON.parse(text);
    } catch (e) {
        console.error('Failed to parse Gemini JSON:', e);
        return { statusCode: 500, body: 'JSON Parse Error' };
    }

    // Image
    const heroImage = await getUnsplashImage(`${topic.category} ${selectedItem.title}`, topic.category);

    // Construct Valid MDX
    const finalContent = `---
title: "${generatedData.title.replace(/"/g, '\\"')}"
description: "${generatedData.description.replace(/"/g, '\\"')}"
pubDate: "${new Date().toISOString()}"
category: "${topic.category}"
tags: ${JSON.stringify(generatedData.tags)}
heroImage: "${heroImage}"
---

${generatedData.markdownBody}
`;

    // Persist
    console.log(`Committing to GitHub: ${filename}`);
    await commitFileToRepo(filename, finalContent, `chore: auto-generate ${topic.category} - ${selectedItem.title}`);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Content Generated', file: filename })
    };
};

// Hourly Schedule (Cron: 0 * * * *)
export const handler = schedule('*/10 * * * *', myHandler);
