const fs = require('fs');
const path = require('path');

const inputFile = '/home/ubuntu/Documents/EL_Services_Global/actual_logo_base64.txt';
// We will decide output based on content

try {
    const base64Data = fs.readFileSync(inputFile, 'utf8').trim();

    if (base64Data.startsWith('data:image/svg+xml;base64,')) {
        console.log('Detected SVG data.');
        const svgContent = Buffer.from(base64Data.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf-8');
        fs.writeFileSync('/home/ubuntu/Documents/EL_Services_Global/V2_App/src/assets/logo.svg', svgContent);
        console.log('Saved as logo.svg');
    } else if (base64Data.startsWith('data:image/png;base64,')) {
        console.log('Detected PNG data.');
        const pngContent = Buffer.from(base64Data.replace('data:image/png;base64,', ''), 'base64');
        fs.writeFileSync('/home/ubuntu/Documents/EL_Services_Global/V2_App/src/assets/logo.png', pngContent);
        console.log('Saved as logo.png');
    } else {
        console.log('Unknown format:', base64Data.substring(0, 50));
    }
} catch (e) {
    console.error(e);
}
