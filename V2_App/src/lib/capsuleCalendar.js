
/**
 * Capsule Calendar Logic
 * Generates SVG progress ring for calendar cells
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const VIEWBOX = '0 0 100 100'
const PATH_LENGTH = 100

// Configuration for the capsule shape (rect with rounded corners)
const CAPSULE_RECT = {
    x: 3,
    y: 3,
    width: 94,
    height: 94,
    rx: 47,
    ry: 47
}

const GRADIENT_COLORS = ['#8e44ad', '#3498db', '#5dade2']
const EASING_EXPONENT = 1.6

let sequence = 0

// React compatible helper to generate SVG path props
export function getCapsuleProgressProps(availabilityRatio) {
    const clamped = Math.max(0, Math.min(1, availabilityRatio))
    const eased = Math.pow(clamped, EASING_EXPONENT)
    const offset = (PATH_LENGTH * (1 - eased)).toFixed(2)

    const gradientId = `capsule-gradient-${++sequence}`

    return {
        viewBox: VIEWBOX,
        pathLength: PATH_LENGTH,
        offset,
        gradientId,
        rectProps: CAPSULE_RECT,
        gradientColors: GRADIENT_COLORS
    }
}
