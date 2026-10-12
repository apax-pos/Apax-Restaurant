const fs = require('fs');
const path = require('path');

const servicesDir = 'e:/Apex/codecanyon-52806377-restropro-saas-pos-software-for-restaurant-cafe-hotel-food-truck/main_files/code/Backend/src/services';

const replacements = [
    { from: /CURDATE\(\)/g, to: "date('now')" },
    { from: /NOW\(\)/g, to: "datetime('now')" },
    { from: /YEAR\((.*?)\)/g, to: "strftime('%Y', $1)" },
    { from: /MONTH\((.*?)\)/g, to: "strftime('%m', $1)" },
    // Handle DATE_SUB(date, INTERVAL value unit)
    { from: /DATE_SUB\((.*?), INTERVAL (\d+) (DAY|MONTH|YEAR)\)/gi, to: (match, date, val, unit) => `date(${date.trim()}, '-${val} ${unit.toLowerCase()}${val > 1 ? 's' : ''}')` },
    { from: /DATE_ADD\((.*?), INTERVAL (\d+) (DAY|MONTH|YEAR)\)/gi, to: (match, date, val, unit) => `date(${date.trim()}, '+${val} ${unit.toLowerCase()}${val > 1 ? 's' : ''}')` },
    // Handle negative intervals in DATE_ADD
    { from: /DATE_ADD\((.*?), INTERVAL -(\d+) (DAY|MONTH|YEAR)\)/gi, to: (match, date, val, unit) => `date(${date.trim()}, '-${val} ${unit.toLowerCase()}${val > 1 ? 's' : ''}')` },
];

const files = fs.readdirSync(servicesDir);

files.forEach(file => {
    if (file.endsWith('.js')) {
        const filePath = path.join(servicesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        replacements.forEach(r => {
            content = content.replace(r.from, r.to);
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            console.log(`Updated ${file}`);
        }
    }
});

console.log('All services updated with SQLite-compatible date functions.');
