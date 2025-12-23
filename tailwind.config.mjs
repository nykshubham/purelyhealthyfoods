/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                primary: '#FF5420', // Vibrant Orange
                secondary: '#1A4D2E', // Deep Green
                accent: '#FFD700', // Sunny Yellow
                beige: '#FFF9F0', // Light Cream Background
                'surface-100': '#FFF9F0',
                'surface-200': '#FFE4C4', // Bisque
                'surface-300': '#FFD180',
            },
            fontFamily: {
                sans: ['"DM Sans"', 'sans-serif'],
                serif: ['"DM Serif Display"', 'serif'],
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
        require('@tailwindcss/aspect-ratio'),
    ],
}
