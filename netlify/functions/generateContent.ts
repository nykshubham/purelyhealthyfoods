
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import slugify from 'slugify';

// --- Configuration ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PUBLIC_REPO_OWNER = process.env.PUBLIC_REPO_OWNER;
const PUBLIC_REPO_NAME = process.env.PUBLIC_REPO_NAME;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';

if (!GEMINI_API_KEY) {
    console.warn('Warning: GEMINI_API_KEY is not defined.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const parser = new Parser();

// Topics Configuration
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

// Check if file exists in Repo via GitHub API
async function fileExistsInRepo(path: string): Promise<boolean> {
    if (!GITHUB_TOKEN || !PUBLIC_REPO_OWNER || !PUBLIC_REPO_NAME) {
        console.warn('Missing GitHub configuration, skipping existence check');
        return false;
    }

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
        branch: 'main'
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
        } catch (e) {
            console.warn('Unsplash API search failed, falling back to static list:', e);
        }
    }

    // Fallback
    const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Blog'];
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
        hash = query.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % images.length;
    return images[index];
}

async function generateArticle(item: any, topic: typeof TOPICS[0]) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Use RSS contentSnippet or truncate raw content
    // Truncate to ~2500 chars to avoid token limits
    const rawContext = item.contentSnippet || item.content || '';
    const contextContent = rawContext.slice(0, 2500);

    const prompt = `
You are generating content for a fully automated publishing system.

This content will be published without human review.
Failure to follow instructions will break the build.

━━━━━━━━━━━━━━━━━━━━━━
HARD CONSTRAINTS (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━
- Output MUST be valid JSON only.
- Do NOT include markdown code fences.
- Do NOT include YAML frontmatter.
- Do NOT include HTML.
- Do NOT include emojis.
- Do NOT include dates.
- Do NOT include explanations, apologies, or commentary.
- Do NOT reference schemas, formats, or instructions.
- Do NOT invent URLs.

If you cannot comply exactly, return: {}

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT)
━━━━━━━━━━━━━━━━━━━━━━
{
  "title": string,
  "description": string,
  "tags": string[],
  "body": string
}

━━━━━━━━━━━━━━━━━━━━━━
FIELD RULES
━━━━━━━━━━━━━━━━━━━━━━
title:
- 60–120 characters
- Sentence case
- Clear, factual
- No quotation marks

description:
- 120–180 characters
- Neutral summary
- No promotional language

tags:
- Array of 3–5 lowercase keywords
- Relevant, specific, non-generic

body:
- Markdown only
- Minimum 700 words
- Start directly with content (no intro headings)
- Use ## for section headings
- Natural paragraph flow
- No bullet spam
- No fluff

━━━━━━━━━━━━━━━━━━━━━━
INTERNAL LINKING (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━
Include 2–4 internal links using Markdown syntax.

Rules:
- Only link to pages that plausibly exist on a health-focused site.
- Use descriptive anchor text (not “click here”).
- Links must be contextually relevant.
- Do NOT invent deep URLs.

Allowed internal URL patterns:
- /news/
- /blog/
- /recipes/
- /weight-management/
- /nutrition/

Example:
[understanding food hygiene ratings](/news/)
[science-backed weight loss strategies](/weight-management/)

━━━━━━━━━━━━━━━━━━━━━━
EXTERNAL LINKING (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━
Include 1–2 external links to authoritative sources.

Rules:
- Use ONLY well-known, trustworthy domains.
- No affiliate, marketing, or commercial blogs.
- Link naturally within the content.
- Do NOT over-link.

Allowed domains include:
- who.int
- nhs.uk
- fda.gov
- cdc.gov
- pubmed.ncbi.nlm.nih.gov
- gov.uk
- nature.com
- bmj.com

Use Markdown links.

━━━━━━━━━━━━━━━━━━━━━━
CONTENT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━
Topic category: ${topic.category}
Headline: "${item.title}"

Context (may be incomplete or partial):
${contextContent}

Additional instructions:
${topic.promptExtra}

━━━━━━━━━━━━━━━━━━━━━━
STYLE & SEO GUIDANCE
━━━━━━━━━━━━━━━━━━━━━━
- Prioritize clarity and factual accuracy.
- Write for humans first, search engines second.
- Use natural keyword variations.
- Avoid keyword stuffing.
- Avoid exaggerated claims.
- Avoid calls to action.
- Avoid sensational or emotional framing.

━━━━━━━━━━━━━━━━━━━━━━
FINAL REMINDER
━━━━━━━━━━━━━━━━━━━━━━
Return ONLY the JSON object.
Any deviation will cause build failure.
`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });
        const response = await result.response;
        const text = response.text();

        let generatedData;
        try {
            generatedData = JSON.parse(text);
        } catch (e) {
            console.warn('Gemini JSON parse failed');
            return null;
        }

        // VALIDATION: Schema Guard
        if (
            !generatedData?.title ||
            !generatedData?.description ||
            !generatedData?.body ||
            !Array.isArray(generatedData.tags)
        ) {
            console.warn('Invalid Gemini response shape, skipping article');
            return null;
        }

        // SEO Link Validation
        if (!generatedData.body.includes('](/') || !generatedData.body.includes('](https://')) {
            console.warn('SEO links missing, skipping article');
            return null;
        }

        // Get Dynamic Image
        const searchCtx = `${topic.category} ${item.title}`;
        const heroImage = await getUnsplashImage(searchCtx, topic.category);

        // Construct Valid MDX
        const finalContent = `---
title: "${generatedData.title.replace(/"/g, '\\"')}"
description: "${generatedData.description.replace(/"/g, '\\"')}"
pubDate: "${new Date().toISOString()}"
category: "${topic.category}"
tags: ${JSON.stringify(generatedData.tags || [])}
heroImage: "${heroImage}"
---

${generatedData.body}
`;

        return finalContent;
    } catch (error: any) {
        if (error?.status === 429) {
            console.log('Gemini quota exceeded, skipping this run');
            return null;
        }
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
        if (r <= accumulatedWeight) return topic;
    }
    return TOPICS[0];
}

async function main() {
    // Kill Switch
    if (process.env.CONTENT_AUTOMATION_ENABLED !== 'true') {
        console.log('Automation disabled (CONTENT_AUTOMATION_ENABLED != true)');
        return;
    }

    console.log(`[${new Date().toISOString()}] Starting SINGLE content generation task (Serverless Mode)...`);

    const selectedTopic = selectTopic();
    console.log(`Selected Topic Category: ${selectedTopic.category}`);

    const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(selectedTopic.query)}&hl=en-GB&gl=GB&ceid=GB:en`;
    console.log(`Fetching feed: ${feedUrl}`);

    const feed = await parser.parseURL(feedUrl);

    const checked = new Set<string>();

    // Process top 10 items to find a NEW one
    for (const item of feed.items.slice(0, 10)) {
        let slug = slugify(item.title || '', { lower: true, strict: true });

        // Enforce max slug length
        if (slug.length > 120) slug = slug.slice(0, 120);

        // Deduplication: In-memory check
        if (checked.has(slug)) {
            console.log(`Skipping duplicate slug in run: ${slug}`);
            continue;
        }
        checked.add(slug);

        const filePath = `src/content/${selectedTopic.collection}/${slug}.mdx`;

        // Check if exists in GitHub Repo
        const exists = await fileExistsInRepo(filePath);
        if (exists) {
            console.log(`Skipping existing article (GitHub check): ${filePath}`);
            continue;
        }

        console.log(`Generating NEW article: ${item.title}`);
        const content = await generateArticle(item, selectedTopic);

        if (content) {
            console.log(`Committing to GitHub: ${filePath}`);
            await commitFileToRepo(filePath, content, `chore: auto-generate ${selectedTopic.category} - ${item.title}`);
            console.log(`SUCCESS: Created ${filePath}`);
            return; // EXIT after generating 1 article
        }
    }

    console.log('No new articles found in feed for this topic.');
}

export { main };
