/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    purple: '#8e44ad',
                    blue: '#3498db',
                    light: '#5dade2',
                    bg: '#f7f9fc',
                    dark: '#2D3748'
                },
                primary: {
                    DEFAULT: '#3b82f6',
                    hover: '#2563eb'
                }
            },
            fontFamily: {
                sans: ['Montserrat', 'system-ui', 'sans-serif'],
            }
        }
    },
    plugins: [],
}
