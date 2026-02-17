import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SVG_DIR = path.join(ROOT, 'svg');
const ICONS_DIR = path.join(ROOT, 'src/icons');
const SRC_DIR = path.join(ROOT, 'src');
const PREVIEW_DIR = path.join(ROOT, 'preview');

// ─── Утилиты ───

function toPascalCase(str) {
    return str
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

function getAttr(svgTag, name) {
    const m = svgTag.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : null;
}

// Извлекаем ключевые атрибуты корневого <svg>
function extractRootAttrs(content) {
    const svgMatch = content.match(/<svg([^>]*)>/);
    if (!svgMatch) return { viewBox: '0 0 24 24' };

    const tag = svgMatch[1];
    return {
        viewBox: getAttr(tag, 'viewBox') || '0 0 24 24',
        fill: getAttr(tag, 'fill'),
        stroke: getAttr(tag, 'stroke'),
        strokeWidth: getAttr(tag, 'stroke-width'),
        strokeLinecap: getAttr(tag, 'stroke-linecap'),
        strokeLinejoin: getAttr(tag, 'stroke-linejoin'),
        fillRule: getAttr(tag, 'fill-rule'),
        clipRule: getAttr(tag, 'clip-rule'),
    };
}

// Очистка SVG — заменяем цвета на {color}, убираем мусор
function cleanSvg(content) {
    return content
        .replace(/<\?xml[^>]*\?>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s*xmlns="[^"]*"/g, '')
        .replace(/\s*xmlns:xlink="[^"]*"/g, '')
        .replace(/\s*width="[^"]*"/g, '')
        .replace(/\s*height="[^"]*"/g, '')
        // Заменяем цвета на {color}, но сохраняем none
        .replace(/fill="(?!none)[^"]*"/g, 'fill={color}')
        .replace(/stroke="(?!none)[^"]*"/g, 'stroke={color}')
        .trim();
}

// Извлекаем содержимое <svg>...</svg>
function extractInner(content) {
    const m = content.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    return m ? m[1].trim() : '';
}

// ─── Генерация компонентов ───

function generateComponent(svgContent, name) {
    const root = extractRootAttrs(svgContent);
    const cleaned = cleanSvg(svgContent);
    const inner = extractInner(cleaned);

    // Собираем атрибуты корневого <svg>
    const attrs = [
        'width={size}',
        'height={size}',
        `viewBox="${root.viewBox}"`,
    ];

    // Fill: сохраняем none, остальное → динамическое
    if (root.fill === 'none') {
        attrs.push('fill="none"');
    } else {
        attrs.push('fill={color}');
    }

    // Stroke: добавляем только если был в оригинале
    if (root.stroke && root.stroke !== 'none') {
        attrs.push('stroke={color}');
    }
    if (root.strokeWidth) attrs.push(`stroke-width={strokeWidth}`);
    if (root.strokeLinecap) attrs.push(`stroke-linecap="${root.strokeLinecap}"`);
    if (root.strokeLinejoin) attrs.push(`stroke-linejoin="${root.strokeLinejoin}"`);
    if (root.fillRule) attrs.push(`fill-rule="${root.fillRule}"`);
    if (root.clipRule) attrs.push(`clip-rule="${root.clipRule}"`);

    attrs.push(`class="icon icon-${name} {className}"`);
    attrs.push('{...props}');

    const attrsStr = attrs.map(a => `  ${a}`).join('\n');

    // Определяем, нужен ли strokeWidth проп
    const hasStroke = !!(root.stroke && root.stroke !== 'none') || !!root.strokeWidth;

    return `<script>
  let { 
    size = 24, 
    color = 'currentColor',${hasStroke ? `\n    strokeWidth = ${root.strokeWidth || 2},` : ''}
    class: className = '',
    ...props 
  } = $props();
</script>

<svg
${attrsStr}
>
  ${inner}
</svg>
`;
}

function generateIconComponent(icons) {
    const imports = icons
        .map(({ componentName }) =>
            `import ${componentName} from './icons/${componentName}.svelte';`
        )
        .join('\n  ');

    return `<script>
  ${imports}

  const iconMap = {
${icons.map(({ name, componentName }) => `    '${name}': ${componentName}`).join(',\n')}
  };

  let { 
    name,
    size = 24, 
    color = 'currentColor',
    class: className = '',
    ...props 
  } = $props();

  let IconComponent = $derived(iconMap[name]);
</script>

{#if IconComponent}
  <IconComponent {size} {color} class={className} {...props} />
{:else}
  <span style="color: red;">Icon "{name}" not found</span>
{/if}
`;
}

function generateIndex(icons) {
    const exports = icons
        .map(({ componentName }) =>
            `export { default as ${componentName} } from './icons/${componentName}.svelte';`
        )
        .join('\n');

    const iconNames = icons.map(({ name }) => `'${name}'`).join(', ');

    return `// Auto-generated - do not edit manually
${exports}

export { default as Icon } from './Icon.svelte';

export const iconNames = [${iconNames}];
`;
}

// ─── Превью ───

function generatePreview(icons) {
    const iconCards = icons
        .map(({ name, componentName, file }) => {
            let svg = fs.readFileSync(path.join(SVG_DIR, file), 'utf-8');
            svg = svg
                .replace(/<\?xml[^>]*\?>/g, '')
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/\s*width="[^"]*"/g, '')
                .replace(/\s*height="[^"]*"/g, '');

            return `
      <div class="card" data-name="${name} ${componentName}">
        <button class="delete" onclick="del('${name}')" title="Delete">×</button>
        <div class="preview">${svg}</div>
        <div class="name" ondblclick="rename(this, '${name}')">${name}</div>
        <button class="copy" onclick="copy('${componentName}')">
          import { ${componentName} }
        </button>
      </div>`;
        })
        .join('');

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Icon Library — ${icons.length} icons</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5; color: #111; padding: 2rem;
    transition: background .2s, color .2s;
  }
  body.dark { background: #1a1a2e; color: #eee; }

  .header { max-width: 1200px; margin: 0 auto 1.5rem; }
  .header h1 { font-size: 1.75rem; margin-bottom: .15rem; }
  .count { color: #888; margin-bottom: 1rem; font-size: .9rem; }

  .controls { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; margin-bottom: 1.5rem; }

  .search {
    flex: 1; min-width: 180px; padding: .6rem 1rem;
    border: 2px solid #ddd; border-radius: 10px; font-size: .95rem;
    outline: none; background: #fff; color: #111; transition: border .2s;
  }
  .search:focus { border-color: #333; }
  body.dark .search { background: #2a2a3e; color: #eee; border-color: #444; }
  body.dark .search:focus { border-color: #7c7cf0; }

  .size-ctrl { display: flex; align-items: center; gap: .4rem; font-size: .85rem; white-space: nowrap; }
  .size-ctrl input[type=range] { width: 90px; }
  label { font-size: .85rem; cursor: pointer; user-select: none; white-space: nowrap; }

  /* ─── Drop zone ─── */
  .dropzone {
    max-width: 1200px; margin: 0 auto 1.5rem;
    border: 2px dashed #ccc; border-radius: 14px;
    padding: 2rem; text-align: center;
    color: #999; transition: all .2s; cursor: pointer;
    position: relative;
  }
  .dropzone:hover, .dropzone.over {
    border-color: #333; color: #333; background: rgba(0,0,0,.02);
  }
  body.dark .dropzone { border-color: #444; color: #666; }
  body.dark .dropzone:hover, body.dark .dropzone.over {
    border-color: #7c7cf0; color: #bbb; background: rgba(124,124,240,.05);
  }
  .dropzone input { display: none; }
  .dropzone .label { font-size: .95rem; pointer-events: none; }
  .dropzone .hint { font-size: .75rem; margin-top: .35rem; pointer-events: none; }
  .dropzone .btn {
    display: inline-block; margin-top: .75rem;
    padding: .45rem 1.25rem; background: #333; color: #fff;
    border: none; border-radius: 8px; font-size: .85rem;
    cursor: pointer; pointer-events: auto;
  }
  .dropzone .btn:hover { background: #555; }
  body.dark .dropzone .btn { background: #7c7cf0; }

  /* ─── Grid ─── */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: .75rem; max-width: 1200px; margin: 0 auto;
  }

  .card {
    position: relative;
    display: flex; flex-direction: column; align-items: center;
    padding: 1.25rem .75rem .75rem;
    background: #fff; border-radius: 12px;
    border: 2px solid transparent; transition: all .15s;
  }
  .card:hover { border-color: #ddd; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.06); }
  body.dark .card { background: #2a2a3e; }
  body.dark .card:hover { border-color: #444; }

  .card .delete {
    position: absolute; top: 4px; right: 6px;
    background: none; border: none; color: #ccc;
    font-size: 1.1rem; cursor: pointer; line-height: 1;
    width: 22px; height: 22px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: all .15s;
  }
  .card:hover .delete { opacity: 1; }
  .card .delete:hover { background: #fee; color: #e33; }
  body.dark .card .delete:hover { background: #422; color: #f66; }

  .preview {
    display: flex; align-items: center; justify-content: center;
    margin-bottom: .65rem; color: #333;
  }
  .preview svg { width: var(--icon-size, 28px); height: var(--icon-size, 28px); }
  body.dark .preview { color: #eee; }

  .name {
    font-size: .72rem; color: #888; text-align: center;
    word-break: break-all; margin-bottom: .5rem;
    padding: 1px 4px; border-radius: 4px; cursor: default;
  }
  .name:hover { background: #f0f0f0; }
  body.dark .name:hover { background: #3a3a4e; }

  .copy {
    font-size: .65rem; padding: .25rem .5rem;
    background: #f0f0f0; border: 1px solid #ddd; border-radius: 6px;
    cursor: pointer; color: #555; transition: all .15s;
    max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .copy:hover { background: #333; color: #fff; border-color: #333; }
  body.dark .copy { background: #3a3a4e; border-color: #555; color: #aaa; }
  body.dark .copy:hover { background: #7c7cf0; border-color: #7c7cf0; color: #fff; }

  .hidden { display: none !important; }

  .toast {
    position: fixed; bottom: 2rem; left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: #333; color: #fff; padding: .6rem 1.25rem;
    border-radius: 8px; font-size: .85rem;
    transition: transform .3s ease; z-index: 10;
    pointer-events: none;
  }
  .toast.show { transform: translateX(-50%) translateY(0); }

  .empty {
    max-width: 1200px; margin: 3rem auto; text-align: center;
    color: #aaa; font-size: 1rem;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>📦 Icon Library</h1>
    <p class="count"><span id="count">${icons.length}</span> icons</p>

    <div class="controls">
      <input class="search" id="search" type="text" placeholder="Search icons..." oninput="filter()">
      <div class="size-ctrl">
        <span>Size:</span>
        <input type="range" min="16" max="64" value="28" oninput="resize(this.value)">
        <span id="sizeVal">28</span>
      </div>
      <label><input type="checkbox" onchange="document.body.classList.toggle('dark', this.checked)"> Dark</label>
    </div>
  </div>

  <div class="dropzone" id="dropzone"
       ondrop="handleDrop(event)" ondragover="dragOver(event)"
       ondragenter="dragEnter(event)" ondragleave="dragLeave(event)"
       onclick="document.getElementById('fileInput').click()">
    <input type="file" id="fileInput" accept=".svg" multiple onchange="handleFiles(this.files)">
    <div class="label">Drop SVG files here</div>
    <div class="hint">or click / use the button below</div>
    <button class="btn" onclick="event.stopPropagation(); document.getElementById('fileInput').click()">
      Choose files
    </button>
  </div>

  ${icons.length === 0
        ? '<div class="empty">No icons yet — drop some SVG files above!</div>'
        : ''
    }

  <div class="grid" id="grid">
    ${iconCards}
  </div>

  <div class="toast" id="toast"></div>

  <script>
    // ─── Search & resize ───
    function filter() {
      const q = document.getElementById('search').value.toLowerCase();
      document.querySelectorAll('.card').forEach(c => {
        c.classList.toggle('hidden', !c.dataset.name.toLowerCase().includes(q));
      });
    }
    function resize(v) {
      document.getElementById('sizeVal').textContent = v;
      document.documentElement.style.setProperty('--icon-size', v + 'px');
    }

    // ─── Toast ───
    let _t;
    function toast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(_t);
      _t = setTimeout(() => el.classList.remove('show'), 2500);
    }

    // ─── Copy import ───
    function copy(name) {
      navigator.clipboard.writeText("import { " + name + " } from '@myorg/icons';")
        .then(() => toast('Copied: ' + name));
    }

    // ─── Drag & drop ───
    function dragOver(e) { e.preventDefault(); }
    function dragEnter(e) { e.preventDefault(); document.getElementById('dropzone').classList.add('over'); }
    function dragLeave(e) { document.getElementById('dropzone').classList.remove('over'); }

    function handleDrop(e) {
      e.preventDefault();
      document.getElementById('dropzone').classList.remove('over');
      const files = [...e.dataTransfer.files].filter(f => f.name.endsWith('.svg'));
      if (files.length) uploadFiles(files);
    }

    function handleFiles(fileList) {
      const files = [...fileList].filter(f => f.name.endsWith('.svg'));
      if (files.length) uploadFiles(files);
      document.getElementById('fileInput').value = '';
    }

    async function uploadFiles(files) {
      toast('Uploading ' + files.length + ' file(s)...');

      const payload = [];
      for (const file of files) {
        const content = await file.text();
        payload.push({ name: file.name, content });
      }

      try {
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: payload }),
        });
        const data = await resp.json();
        if (data.ok) {
          toast('Added ' + data.saved + ' icon(s)!');
          // SSE перезагрузит страницу
        } else {
          toast('Error: ' + (data.error || 'upload failed'));
        }
      } catch (e) {
        toast('Server not running — use: npm run dev');
      }
    }

    // ─── Delete ───
    async function del(name) {
      if (!confirm('Delete icon "' + name + '"?')) return;
      try {
        const resp = await fetch('/api/icons/' + encodeURIComponent(name), { method: 'DELETE' });
        const data = await resp.json();
        if (data.ok) toast('Deleted: ' + name);
      } catch (e) {
        toast('Server not running');
      }
    }

    // ─── Rename (double-click on name) ───
    function rename(el, oldName) {
      const input = document.createElement('input');
      input.value = oldName;
      input.style.cssText = 'width:100%;font-size:.72rem;text-align:center;border:1px solid #7c7cf0;border-radius:4px;padding:1px 4px;outline:none;';
      el.replaceWith(input);
      input.focus();
      input.select();

      async function commit() {
        const newName = input.value.trim();
        if (!newName || newName === oldName) {
          input.replaceWith(el);
          return;
        }
        try {
          await fetch('/api/icons/' + encodeURIComponent(oldName), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName }),
          });
        } catch (e) {
          toast('Rename failed');
          input.replaceWith(el);
        }
      }

      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') input.replaceWith(el);
      });
    }

    // ─── SSE live reload ───
    if (location.protocol !== 'file:') {
      const es = new EventSource('/api/events');
      es.onmessage = (e) => {
        if (e.data === 'reload') location.reload();
      };
      es.onerror = () => {
        setTimeout(() => location.reload(), 2000);
      };
    }
  </script>
</body>
</html>`;
}

// ─── Сборка ───

async function build() {
    console.log('🔨 Building icon library...\n');

    if (!fs.existsSync(SVG_DIR)) {
        console.log('⚠️  No /svg directory found. Creating it...');
        fs.mkdirSync(SVG_DIR, { recursive: true });
        return;
    }

    if (!fs.existsSync(ICONS_DIR)) {
        fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    // Очищаем старые иконки
    fs.readdirSync(ICONS_DIR).forEach(f => fs.unlinkSync(path.join(ICONS_DIR, f)));

    const svgFiles = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));

    if (svgFiles.length === 0) {
        console.log('⚠️  No SVG files found in /svg directory');
        return;
    }

    const icons = [];

    for (const file of svgFiles) {
        const name = path.basename(file, '.svg');
        const componentName = toPascalCase(name);
        const svgContent = fs.readFileSync(path.join(SVG_DIR, file), 'utf-8');

        const component = generateComponent(svgContent, name);
        fs.writeFileSync(path.join(ICONS_DIR, `${componentName}.svelte`), component);

        icons.push({ name, componentName, file });
        console.log(`  ✓ ${file} → ${componentName}.svelte`);
    }

    // Генерируем Icon.svelte (прямые импорты, без циклических зависимостей)
    fs.writeFileSync(path.join(SRC_DIR, 'Icon.svelte'), generateIconComponent(icons));

    // Генерируем index.js
    fs.writeFileSync(path.join(SRC_DIR, 'index.js'), generateIndex(icons));

    // Генерируем превью
    if (!fs.existsSync(PREVIEW_DIR)) {
        fs.mkdirSync(PREVIEW_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(PREVIEW_DIR, 'index.html'), generatePreview(icons));

    console.log(`\n✨ Generated ${icons.length} icons`);
    console.log(`🌐 Preview: preview/index.html`);
    console.log('📦 Ready to publish!\n');
}

build().catch(console.error);