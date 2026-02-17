import chokidar from 'chokidar';
import { exec } from 'child_process';

console.log('👀 Watching for SVG changes...\n');

let timeout;

chokidar.watch('./svg/*.svg').on('all', (event, filePath) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        console.log(`${event}: ${filePath}`);
        exec('node scripts/build.js', (err, stdout, stderr) => {
            if (err) console.error(stderr);
            else console.log(stdout);
        });
    }, 300);
});