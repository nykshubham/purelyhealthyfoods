
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';

if (!GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not defined in .env file.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const parser = new Parser();

// Configuration for different content types with WEIGHTS for selection
const TOPICS = [
    {
        query: 'food safety news',
        collection: 'news',
        category: 'Food Safety',
        promptExtra: 'Focus on recent regulatory changes, recalls, or scientific discoveries. Keep it journalistic.',
        weight: 0.3 // 30%
    },
    {
        query: 'nutrition science research',
        collection: 'news',
        category: 'Nutrition',
        promptExtra: 'Summarize recent study findings. Focus on facts and methodology. Avoid hype.',
        weight: 0.3 // 30% (Total News = 60%)
    },
    {
        query: 'weight loss science tips',
        collection: 'posts',
        category: 'Weight Management',
        promptExtra: 'Focus on sustainable, science-backed weight management strategies. Debunk myths if relevant. strict-no-fad-diets.',
        weight: 0.14 // ~14%
    },
    {
        query: 'healthy dinner recipes trends',
        collection: 'posts',
        category: 'Recipes',
        type: 'recipe',
        promptExtra: 'Include a delicious, healthy recipe. MUST include a detailed Ingredients list and Step-by-Step Instructions.',
        weight: 0.13 // ~13%
    },
    {
        query: 'healthy eating tips blog',
        collection: 'posts',
        category: 'Blog',
        promptExtra: 'Write a helpful, engaging blog post about healthy eating habits. Use a friendly but authoritative tone.',
        weight: 0.13 // ~13%
    }
];

const CONTENT_DIR = path.join(process.cwd(), 'src/content');

async function fetchArticleContent(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const dom = new JSDOM(html);
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        return article ? article.textContent : null;
    } catch (error) {
        console.warn(`Failed to fetch content from ${url}:`, error);
        return null; // Fallback to snippet if fetch fails
    }
}

// Curated Image Library to prevent duplicates and ensure quality (Fallback)
const CATEGORY_IMAGES: Record<string, string[]> = {
    'Food Safety': [
        'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070', // Inspection/Kitchen
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070', // Hygiene/Gloves
        'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=2070', // Food crates
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070', // Fancy plating (contrast)
        'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=2070', // Chef hands
    ],
    'Nutrition': [
        'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2070', // Nutrition label concept
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070', // Healthy spread
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070', // Science lab
        'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=2070', // Doctor/Health
    ],
    'Weight Management': [
        'https://images.unsplash.com/photo-1511690656952-34342d5c2895?q=80&w=2070', // Yoga/Fitness
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070', // Workout gym
        'https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=2070', // Healthy Salad
        'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=2070', // Measuring/Apple
    ],
    'Recipes': [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2070', // Salad bowl
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070', // Healthy Bowl
        'https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=2070', // Cooking vegetables
        'https://images.unsplash.com/photo-1493770348161-369560ae357d?q=80&w=2070', // Breakfast
    ],
    'Blog': [
        'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070', // Friends eating
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=2070', // Meditation/Relax
        'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=2070', // Walking/Lifestyle
        'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=2070', // Yoga Sunrise
    ]
};

async function getUnsplashImage(query: string, category: string): Promise<string> {
    // 1. Try Unsplash API if Key is present
    if (UNSPLASH_ACCESS_KEY) {
        try {
            const response = await fetch(`${UNSPLASH_API_URL}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
                headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
            });
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].urls.regular;
            }
        } catch (error) {
            console.warn('Unsplash API search failed, falling back to static list:', error);
        }
    } else {
        console.warn('No UNSPLASH_ACCESS_KEY found. Using static image list.');
    }

    // 2. Fallback to Static List
    const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Blog'];
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
        hash = query.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % images.length;
    return images[index];
}

async function generateArticle(item: any, topic: typeof TOPICS[0]) {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    // Try to fetch full content, fall back to snippet
    const fullContent = await fetchArticleContent(item.link);
    const contextContent = fullContent ? fullContent.slice(0, 8000) : item.contentSnippet || item.content || '';

    const prompt = `
    You are an expert content creator for 'Purely Healthy Foods'.
    Create a high-quality content piece based on the following input.
    
    Topic Category: ${topic.category}
    Source Title: ${item.title}
    Source Context: ${contextContent}
    
    Specific Instructions:
    ${topic.promptExtra}
    
    SEO & Quality Guidelines:
    - **SEO Optimization**: Use natural keywords. Ensure the title is catchy but accurate (50-60 chars). Write a meta-description (150-160 chars).
    - **Structure**: H1 for Title, H2/H3 for subsections. Short paragraphs (2-3 sentences).
    - **Internal Linking**: Suggest relevant internal links (e.g., [Link to Weight Management](/weight-management) or [Link to Recipes](/recipes)) where appropriate naturally in the text.
    - **External Linking**: Cite reputable sources (like CDC, WHO, Harvard Health) if relevant facts are mentioned. Format: [Source Name](URL).
    - **Tone**: Professional, authoritative, yet accessible. Avoid fluff.
    - **Formatting**: Use Markdown. Bold key terms. Use bullet points for readability.
    
    Technical Constraints:
    - DO NOT double-hash the title (it will be in frontmatter). Start with the content.
    - The output MUST be a valid MDX file content with Frontmatter.
    - DO NOT include heroImage in your frontmatter, it will be added automatically.
    
    Frontmatter Format:
    ---
    title: '...'
    description: '...'
    pubDate: '${new Date().toISOString().split('T')[0]}'
    author: 'Auto'
    category: '${topic.category}'
    tags: ['tag1', 'tag2']
    ---

    (Article Content Here)
    
    Note: Generate 3-5 relevant tags.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```markdown/g, '').replace(/```/g, '').trim();

        // Get Dynamic Image (via Unsplash API or Fallback)
        // Use title + category for better search context
        const searchCtx = `${topic.category} ${item.title}`;
        const heroImage = await getUnsplashImage(searchCtx, topic.category);

        // Force current date
        const today = new Date().toISOString().split('T')[0];
        let finalContent = cleanedText.replace(/pubDate: '.*'/, `pubDate: '${today}'`);

        // Inject heroImage into frontmatter safely
        if (finalContent.includes('---')) {
            const parts = finalContent.split('---');
            if (parts.length >= 3) {
                // Insert into the first frontmatter block
                // Ensure we start with a newline so it doesn't merge with the opening ---
                parts[1] = `\n${parts[1].trim()}\nheroImage: '${heroImage}'\n`;
                finalContent = parts.join('---');
            }
        }

        return finalContent;
    } catch (error) {
        console.error('Gemini content generation failed:', error);
        return null;
    }
}

// Weighted Random Selection
function selectTopic() {
    const r = Math.random();
    let accumulatedWeight = 0;

    for (const topic of TOPICS) {
        accumulatedWeight += topic.weight;
        if (r <= accumulatedWeight) {
            return topic;
        }
    }
    return TOPICS[0]; // Fallback
}

async function main() {
    console.log(`[${new Date().toISOString()}] Starting SINGLE content generation task...`);

    const selectedTopic = selectTopic();
    console.log(`Selected Topic Category: ${selectedTopic.category} (Weight: ${selectedTopic.weight})`);

    const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(selectedTopic.query)}&hl=en-GB&gl=GB&ceid=GB:en`;
    console.log(`Fetching feed: ${feedUrl}`);

    const outputDir = path.join(CONTENT_DIR, selectedTopic.collection);
    await fs.mkdir(outputDir, { recursive: true });

    const feed = await parser.parseURL(feedUrl);
    const existingFiles = await fs.readdir(outputDir);

    // Process top 10 items to find a NEW one
    for (const item of feed.items.slice(0, 10)) {
        const slug = slugify(item.title || '', { lower: true, strict: true });
        const filename = `${slug}.mdx`;

        if (existingFiles.includes(filename)) {
            console.log(`Skipping existing article: ${selectedTopic.collection}/${filename}`);
            continue;
        }

        console.log(`Generating NEW article: ${item.title}`);
        const content = await generateArticle(item, selectedTopic);

        if (content) {
            await fs.writeFile(path.join(outputDir, filename), content);
            console.log(`SUCCESS: Saved ${selectedTopic.collection}/${filename}`);
            return; // EXIT after generating 1 article
        }
    }

    console.log('No new articles found in feed for this topic.');
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

// Export for scheduler if needed (though we'll likely just exec it)
export { main };
