import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SVG_DIR = path.join(ROOT, 'svg');
const PREVIEW_FILE = path.join(ROOT, 'preview', 'index.html');
const PKG_PATH = path.join(ROOT, 'package.json');
const PORT = parseInt(process.env.PORT || '3333', 10);

const clients = new Set();
let building = false;

function readPkg() { return JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8')); }

function notifyClients() {
    for (const res of clients) { try { res.write('data: reload\n\n'); } catch {} }
}

function rebuild() {
    if (building) return Promise.resolve();
    building = true;
    return new Promise((resolve, reject) => {
        exec('node scripts/build.js', { cwd: ROOT }, (err, stdout, stderr) => {
            building = false;
            if (err) { console.error(stderr); reject(err); return; }
            if (stdout.trim()) console.log(stdout);
            notifyClients();
            resolve();
        });
    });
}

function parseBody(req, maxSize = 50 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = []; let size = 0;
        req.on('data', c => {
            size += c.length;
            if (size > maxSize) { req.destroy(); reject(new Error('Слишком большой запрос')); return; }
            chunks.push(c);
        });
        req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { reject(e); } });
        req.on('error', reject);
    });
}

function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
}

function safeName(name) {
    return name.toLowerCase().replace(/\.svg$/, '').replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function bumpVersion(ver, type) {
    const p = ver.split('.').map(Number);
    if (type === 'major') return `${p[0]+1}.0.0`;
    if (type === 'minor') return `${p[0]}.${p[1]+1}.0`;
    return `${p[0]}.${p[1]}.${p[2]+1}`;
}

function runCmd(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: ROOT, timeout: 120000 }, (err, stdout, stderr) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve(stdout.trim());
        });
    });
}

function checkGit() {
    try { execSync('git rev-parse --is-inside-work-tree', { cwd: ROOT, stdio: 'pipe' }); return true; }
    catch { return false; }
}

// Watcher
let watchTimeout;
function setupWatcher() {
    if (!fs.existsSync(SVG_DIR)) fs.mkdirSync(SVG_DIR, { recursive: true });
    try {
        fs.watch(SVG_DIR, (ev, fn) => {
            if (!fn || !fn.endsWith('.svg')) return;
            clearTimeout(watchTimeout);
            watchTimeout = setTimeout(() => { console.log(`📝 ${ev}: ${fn}`); rebuild().catch(console.error); }, 400);
        });
        console.log('👀 Наблюдаю за svg/...');
    } catch (err) { console.warn('⚠️  Не удалось запустить наблюдение:', err.message); }
}

// Server
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        return res.end();
    }

    if (url.pathname === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
        res.write('data: connected\n\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
    }

    if (url.pathname === '/api/upload' && req.method === 'POST') {
        try {
            const { files } = await parseBody(req);
            if (!Array.isArray(files) || !files.length) return json(res, 400, { error: 'Файлы не переданы' });
            if (!fs.existsSync(SVG_DIR)) fs.mkdirSync(SVG_DIR, { recursive: true });
            let saved = 0;
            for (const file of files) {
                const name = safeName(file.name);
                if (!name || !file.content || !file.content.includes('<svg')) continue;
                fs.writeFileSync(path.join(SVG_DIR, `${name}.svg`), file.content);
                saved++;
            }
            await rebuild();
            json(res, 200, { ok: true, saved });
        } catch (e) { json(res, 500, { error: e.message }); }
        return;
    }

    if (url.pathname.startsWith('/api/icons/') && req.method === 'DELETE') {
        const name = decodeURIComponent(url.pathname.slice('/api/icons/'.length));
        const fp = path.join(SVG_DIR, `${name}.svg`);
        if (!fs.existsSync(fp)) return json(res, 404, { error: 'Не найдено' });
        fs.unlinkSync(fp);
        await rebuild();
        return json(res, 200, { ok: true });
    }

    if (url.pathname.startsWith('/api/icons/') && req.method === 'PATCH') {
        try {
            const oldName = decodeURIComponent(url.pathname.slice('/api/icons/'.length));
            const { newName } = await parseBody(req);
            const oldPath = path.join(SVG_DIR, `${oldName}.svg`);
            const clean = safeName(newName);
            const newPath = path.join(SVG_DIR, `${clean}.svg`);
            if (!fs.existsSync(oldPath)) return json(res, 404, { error: 'Не найдено' });
            if (fs.existsSync(newPath) && oldPath !== newPath) return json(res, 409, { error: 'Такое имя уже существует' });
            fs.renameSync(oldPath, newPath);
            await rebuild();
            json(res, 200, { ok: true, name: clean });
        } catch (e) { json(res, 500, { error: e.message }); }
        return;
    }

    if (url.pathname === '/api/rebuild' && req.method === 'POST') {
        try { await rebuild(); json(res, 200, { ok: true }); }
        catch (e) { json(res, 500, { error: e.message }); }
        return;
    }

    if (url.pathname === '/api/icons' && req.method === 'GET') {
        const icons = fs.existsSync(SVG_DIR) ? fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg')).map(f => f.replace('.svg','')) : [];
        return json(res, 200, { icons });
    }

    if (url.pathname.startsWith('/api/svg/') && req.method === 'GET') {
        const name = decodeURIComponent(url.pathname.slice('/api/svg/'.length));
        const fp = path.join(SVG_DIR, `${name}.svg`);
        if (!fs.existsSync(fp)) return json(res, 404, { error: 'Не найдено' });
        res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Content-Disposition': `attachment; filename="${name}.svg"` });
        return res.end(fs.readFileSync(fp, 'utf-8'));
    }

    if (url.pathname === '/api/publish' && req.method === 'POST') {
        try {
            const { bump, message } = await parseBody(req);
            const p = readPkg();
            const newVersion = bumpVersion(p.version, bump || 'patch');
            const commitMsg = message || `Обновление иконок v${newVersion}`;

            console.log(`\n🚀 Публикация v${newVersion}...\n`);

            console.log('  📦 Сборка...');
            await runCmd('node scripts/build.js');

            p.version = newVersion;
            fs.writeFileSync(PKG_PATH, JSON.stringify(p, null, 2) + '\n');
            console.log(`  📝 Версия обновлена: ${newVersion}`);

            const hasGit = checkGit();
            if (hasGit) {
                try {
                    await runCmd('git add -A');
                    await runCmd(`git commit -m "${commitMsg}" --allow-empty`);
                    await runCmd(`git tag v${newVersion}`);
                    console.log('  📌 Git-коммит и тег созданы');
                    try { await runCmd('git push --follow-tags'); console.log('  ⬆️  Отправлено в удалённый репозиторий'); }
                    catch (e) { console.warn('  ⚠️  Не удалось отправить (нет remote?):', e.message); }
                } catch (e) { console.warn('  ⚠️  Git-ошибка:', e.message); }
            }

            console.log('  📤 Публикация в npm...');
            let publishOutput;
            try {
                publishOutput = await runCmd('npm publish --access public');
                console.log('  ✅ Опубликовано в npm!');
            } catch (npmErr) {
                try {
                    publishOutput = await runCmd('npm publish --registry=https://npm.pkg.github.com');
                    console.log('  ✅ Опубликовано в GitHub Packages!');
                } catch (ghErr) {
                    throw new Error(
                        'Публикация не удалась. Убедитесь, что вы авторизованы:\n' +
                        '  npm login\n' +
                        'или для GitHub Packages:\n' +
                        '  npm login --registry=https://npm.pkg.github.com\n\n' +
                        'Ошибка: ' + npmErr.message
                    );
                }
            }

            await rebuild();
            console.log(`\n✨ v${newVersion} опубликована!\n`);
            json(res, 200, { ok: true, version: newVersion, message: commitMsg });
        } catch (e) {
            console.error('Ошибка публикации:', e.message);
            json(res, 500, { error: e.message });
        }
        return;
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
        if (!fs.existsSync(PREVIEW_FILE)) await rebuild();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(PREVIEW_FILE, 'utf-8'));
    }

    res.writeHead(404);
    res.end('Не найдено');
});

rebuild()
    .then(() => { setupWatcher(); server.listen(PORT, () => console.log(`\n🌐  http://localhost:${PORT}\n`)); })
    .catch(err => { console.error('Сборка не удалась:', err); process.exit(1); });