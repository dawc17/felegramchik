/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#8b5cf6',
                    dark: '#7c3aed',
                },
                secondary: {
                    DEFAULT: '#a855f7',
                    variant: '#a855f7/10',
                },
                accent: '#c084fc',
                background: '#f8fafc',
                surface: {
                    DEFAULT: '#ffffff',
                    variant: '#f1f5f9',
                },
                'on-primary': '#ffffff',
                'on-secondary': '#ffffff',
                'on-surface': '#1e293b',
                border: '#e2e8f0',
                outline: '#64748b',
                error: '#ef4444',
            }
        },
    },
    plugins: [],
}