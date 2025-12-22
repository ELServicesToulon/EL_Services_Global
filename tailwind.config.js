/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./Projet_ELS/**/*.{html,js}"],
    theme: {
        extend: {
            colors: {
                primary: '#3b82f6', // Exemple, ajuster selon ta charte si besoin, mais Tailwind v3 marche par classes
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
        require('@tailwindcss/aspect-ratio'),
    ],
}
