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
                }
            },
            fontFamily: {
                sans: ['Montserrat', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
