import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SVG_DIR = path.join(ROOT, 'svg');
const PREVIEW_FILE = path.join(ROOT, 'preview', 'index.html');
const PORT = 3333;

// SSE-клиенты для live reload
const clients = new Set();

function notifyClients() {
    for (const res of clients) {
        res.write('data: reload\n\n');
    }
}

function rebuild() {
    return new Promise((resolve, reject) => {
        exec('node scripts/build.js', { cwd: ROOT }, (err, stdout, stderr) => {
            if (err) {
                console.error(stderr);
                reject(err);
                return;
            }
            console.log(stdout);
            notifyClients();
            resolve();
        });
    });
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString()));
            } catch (e) {
                reject(e);
            }
        });
    });
}

function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // ── SSE ──
    if (url.pathname === '/api/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        res.write('data: connected\n\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
    }

    // ── Upload SVG ──
    if (url.pathname === '/api/upload' && req.method === 'POST') {
        try {
            const { files } = await parseBody(req);
            if (!Array.isArray(files) || files.length === 0) {
                return json(res, 400, { error: 'No files' });
            }

            if (!fs.existsSync(SVG_DIR)) {
                fs.mkdirSync(SVG_DIR, { recursive: true });
            }

            let saved = 0;
            for (const file of files) {
                // Чистим имя, оставляем только безопасные символы
                const safeName = file.name
                    .toLowerCase()
                    .replace(/[^a-z0-9._-]/g, '-')
                    .replace(/-+/g, '-');

                if (!safeName.endsWith('.svg')) continue;
                if (!file.content.includes('<svg')) continue;

                fs.writeFileSync(path.join(SVG_DIR, safeName), file.content);
                saved++;
            }

            await rebuild();
            json(res, 200, { ok: true, saved });
        } catch (e) {
            json(res, 500, { error: e.message });
        }
        return;
    }

    // ── Delete icon ──
    if (url.pathname.startsWith('/api/icons/') && req.method === 'DELETE') {
        const name = decodeURIComponent(url.pathname.replace('/api/icons/', ''));
        const filePath = path.join(SVG_DIR, `${name}.svg`);

        if (!fs.existsSync(filePath)) {
            return json(res, 404, { error: 'Not found' });
        }

        fs.unlinkSync(filePath);
        await rebuild();
        json(res, 200, { ok: true });
        return;
    }

    // ── Rename icon ──
    if (url.pathname.startsWith('/api/icons/') && req.method === 'PATCH') {
        const oldName = decodeURIComponent(url.pathname.replace('/api/icons/', ''));
        const { newName } = await parseBody(req);
        const oldPath = path.join(SVG_DIR, `${oldName}.svg`);
        const safeName = newName.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
        const newPath = path.join(SVG_DIR, `${safeName}.svg`);

        if (!fs.existsSync(oldPath)) {
            return json(res, 404, { error: 'Not found' });
        }

        fs.renameSync(oldPath, newPath);
        await rebuild();
        json(res, 200, { ok: true, name: safeName.replace('.svg', '') });
        return;
    }

    // ── Serve preview ──
    if (url.pathname === '/' || url.pathname === '/index.html') {
        if (!fs.existsSync(PREVIEW_FILE)) {
            await rebuild();
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(PREVIEW_FILE, 'utf-8'));
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

// Первый билд → запуск сервера
rebuild()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`\n🌐  http://localhost:${PORT}\n`);
        });
    })
    .catch((err) => {
        console.error('Build failed:', err);
        process.exit(1);
    });