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
            },
            animation: {
                blob: "blob 7s infinite",
                "fade-in-up": "fadeInUp 0.8s ease-out forwards",
                dash: "dash 5s linear infinite",
            },
            keyframes: {
                blob: {
                    "0%": { transform: "translate(0px, 0px) scale(1)" },
                    "33%": { transform: "translate(30px, -50px) scale(1.1)" },
                    "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
                    "100%": { transform: "translate(0px, 0px) scale(1)" },
                },
                fadeInUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                dash: {
                    "to": { strokeDashoffset: "-40" }
                }
            }
        }
    },
    plugins: [],
}
