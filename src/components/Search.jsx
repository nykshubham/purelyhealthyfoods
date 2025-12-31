import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';

export default function Search() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/search-index.json')
            .then((res) => res.json())
            .then((data) => {
                setPosts(data);
                setLoading(false);
            })
            .catch((err) => console.error(err));
    }, []);

    useEffect(() => {
        if (posts.length === 0) return;

        const fuse = new Fuse(posts, {
            keys: ['title', 'description', 'category'],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 2,
        });

        if (query.length > 1) {
            setResults(fuse.search(query).map(result => result.item));
        } else {
            setResults([]);
        }
    }, [query, posts]);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for articles..."
                    className="w-full p-4 pl-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
                />
                <svg
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>

            <div className="mt-8 space-y-4">
                {results.map((post) => (
                    <a
                        key={post.path}
                        href={post.path}
                        className="block p-6 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="text-xs font-bold text-green-600 uppercase mb-1">
                            {post.category}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{post.title}</h3>
                        <p className="text-gray-500 text-sm">{post.description}</p>
                    </a>
                ))}
                {query.length > 1 && results.length === 0 && (
                    <p className="text-center text-gray-500">No results found.</p>
                )}
            </div>
        </div>
    );
}
