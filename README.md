# PurelyHealthyFoods.com

A complete, production-ready Astro website for health and nutrition news.

## Project Structure
- **src/content/posts/**: Drop your `.mdx` files here. They will automatically be added to the site.
- **src/pages/**: Contains all the routes.
    - `index.astro`: Homepage.
    - `[category]/index.astro`: Dynamic category pages (e.g., /nutrition).
    - `tools/`: Interactive calculators.
- **src/components/**: Reusable UI components.
- **src/layouts/**: `Layout.astro` (shell) and `BlogPost.astro` (article view).

## How to Add Content
1. Create a new `.mdx` file in `src/content/posts/`.
2. Add the required frontmatter:
   ```yaml
   ---
   title: 'My New Post'
   description: 'Description here'
   pubDate: '2025-12-25'
   author: 'You'
   category: 'Nutrition'
   tags: ['tag1', 'tag2']
   heroImage: 'https://example.com/image.jpg'
   ---
   ```
3. Write your content using Markdown and JSX components.

## Running Locally
```bash
npm install
npm run dev
```

## Deployment
This project is configured for **Netlify**.
1. Connect your repo to Netlify.
2. It will detect `netlify.toml` and set the build command to `astro build` and publish directory to `dist`.
