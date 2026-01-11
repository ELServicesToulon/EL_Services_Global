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
                    bg: '#050510', // Deep Space Dark
                    dark: '#0a0a1f',
                    neon: {
                        blue: '#00f3ff',
                        pink: '#ff00ff',
                        purple: '#bc13fe',
                        green: '#0aff0a'
                    }
                },
                primary: {
                    DEFAULT: '#00f3ff', // Neon Blue default
                    hover: '#00c3cc'
                }
            },
            fontFamily: {
                sans: ['Montserrat', 'system-ui', 'sans-serif'],
                mono: ['Fira Code', 'Courier New', 'monospace'], // For that code look
            },
            boxShadow: {
                'neon-blue': '0 0 5px #00f3ff, 0 0 10px #00f3ff, 0 0 20px #00f3ff',
                'neon-pink': '0 0 5px #ff00ff, 0 0 10px #ff00ff, 0 0 20px #ff00ff',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            },
            animation: {
                blob: "blob 7s infinite",
                "fade-in-up": "fadeInUp 0.8s ease-out forwards",
                dash: "dash 5s linear infinite",
                "hologram": "hologram 2s infinite",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
                },
                hologram: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.8" },
                    "90%": { opacity: "0.9" },
                    "92%": { opacity: "0.5", transform: "skewX(10deg)" },
                    "94%": { opacity: "0.9", transform: "skewX(-10deg)" },
                }
            }
        }
    },
    plugins: [],
}
