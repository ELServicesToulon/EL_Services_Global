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
                    purple: '#6B46C1', // Approximate from screenshot
                    blue: '#3182CE',   // Approximate
                    light: '#F7FAFC',
                    dark: '#2D3748'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // Assuming a clean sans-serif
            }
        },
    },
    plugins: [],
}
