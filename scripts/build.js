import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { optimize } from 'svgo';
import { svgPathBbox } from 'svg-path-bbox';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SVG_DIR = path.join(ROOT, 'svg');
const ICONS_DIR = path.join(ROOT, 'src/icons');
const SRC_DIR = path.join(ROOT, 'src');
const PREVIEW_DIR = path.join(ROOT, 'preview');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const PKG_NAME = pkg.name;

// ─── Настройки единого стиля ───
const STYLE = {
    stroke: { strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
    fill:   { /* fill управляется только через currentColor */ },
};

// ─── Именование ───

function toPascalCase(str) {
    return str.replace(/\.svg$/, '').split(/[-_.\s]+/).filter(Boolean)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
}

function toKebabCase(str) {
    return str.replace(/\.svg$/, '')
        .replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/gi, '').replace(/-+/g, '-')
        .toLowerCase().replace(/^-|-$/g, '');
}

// ─── SVGO: агрессивная очистка мусора ───

function runSvgo(svgString) {
    try {
        return optimize(svgString, {
            multipass: true,
            plugins: [
                {
                    name: 'preset-default',
                    params: {
                        overrides: {
                            removeViewBox: false,
                            mergePaths: false,
                            inlineStyles: { onlyMatchedOnce: false },
                            convertPathData: { floatPrecision: 3 },
                        },
                    },
                },
                'removeDimensions',
                'removeXMLNS',
                'removeXMLProcInst',
                'removeDoctype',
                'removeComments',
                'removeMetadata',
                'removeEditorsNSData',
                'removeTitle',
                'removeDesc',
                'removeEmptyContainers',
                {
                    name: 'removeAttrs',
                    params: {
                        attrs: [
                            'data-name', 'data-.*', 'xml:space', 'xmlns:xlink',
                            'xmlns:serif', 'xmlns:sketch', 'sketch:type', 'version',
                            'id', 'class',
                        ],
                    },
                },
            ],
        }).data;
    } catch {
        return svgString;
    }
}

// ─── Определение типа иконки ───
// Stroke: корневой fill="none" + есть stroke на элементах или корне
// Fill: всё остальное

function detectIconType(svgString) {
    const rootMatch = svgString.match(/<svg([^>]*)>/);
    const rootAttrs = rootMatch ? rootMatch[1] : '';
    const rootFillNone = /\bfill="none"/.test(rootAttrs);
    const inner = svgString.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
    const hasStroke = /\bstroke="(?!none)[^"]*"/.test(inner) || /\bstroke="(?!none)[^"]*"/.test(rootAttrs);
    return (rootFillNone && hasStroke) ? 'stroke' : 'fill';
}

// ─── Парсинг viewBox ───

function getViewBox(svgString) {
    const m = svgString.match(/viewBox="([^"]*)"/);
    return m ? m[1] : '0 0 24 24';
}

// ─── Нормализация viewBox к квадрату с паддингом ───

function getContentBounds(svgString) {
    const viewBoxMatch = svgString.match(/viewBox="([^"]*)"/);
    if (!viewBoxMatch) return null;
    const [vbX, vbY, vbW, vbH] = viewBoxMatch[1].split(/[\s,]+/).map(Number);
    if ([vbX, vbY, vbW, vbH].some(isNaN)) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;

    // path
    for (const [, d] of svgString.matchAll(/\bd="([^"]*)"/g)) {
        try {
            const [x1, y1, x2, y2] = svgPathBbox(d);
            minX = Math.min(minX, x1); minY = Math.min(minY, y1);
            maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2);
            found = true;
        } catch {}
    }

    // rect
    for (const m of svgString.matchAll(/<rect([^/]*)/g)) {
        const a = m[1];
        const get = (n) => { const r = a.match(new RegExp(`\\b${n}="([^"]*)"`)); return r ? parseFloat(r[1]) : 0; };
        const x = get('x'), y = get('y'), w = get('width'), h = get('height');
        if (w && h) {
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
            found = true;
        }
    }

    // circle
    for (const m of svgString.matchAll(/<circle([^/]*)/g)) {
        const a = m[1];
        const get = (n) => { const r = a.match(new RegExp(`\\b${n}="([^"]*)"`)); return r ? parseFloat(r[1]) : 0; };
        const cx = get('cx'), cy = get('cy'), r = get('r');
        if (r) {
            minX = Math.min(minX, cx - r); minY = Math.min(minY, cy - r);
            maxX = Math.max(maxX, cx + r); maxY = Math.max(maxY, cy + r);
            found = true;
        }
    }

    // ellipse
    for (const m of svgString.matchAll(/<ellipse([^/]*)/g)) {
        const a = m[1];
        const get = (n) => { const r = a.match(new RegExp(`\\b${n}="([^"]*)"`)); return r ? parseFloat(r[1]) : 0; };
        const cx = get('cx'), cy = get('cy'), rx = get('rx'), ry = get('ry');
        if (rx && ry) {
            minX = Math.min(minX, cx - rx); minY = Math.min(minY, cy - ry);
            maxX = Math.max(maxX, cx + rx); maxY = Math.max(maxY, cy + ry);
            found = true;
        }
    }

    // line
    for (const m of svgString.matchAll(/<line([^/]*)/g)) {
        const a = m[1];
        const get = (n) => { const r = a.match(new RegExp(`\\b${n}="([^"]*)"`)); return r ? parseFloat(r[1]) : 0; };
        const x1 = get('x1'), y1 = get('y1'), x2 = get('x2'), y2 = get('y2');
        minX = Math.min(minX, x1, x2); minY = Math.min(minY, y1, y2);
        maxX = Math.max(maxX, x1, x2); maxY = Math.max(maxY, y1, y2);
        found = true;
    }

    // polyline / polygon
    for (const m of svgString.matchAll(/points="([^"]*)"/g)) {
        const pts = m[1].trim().split(/[\s,]+/).map(Number);
        for (let i = 0; i < pts.length - 1; i += 2) {
            const px = pts[i], py = pts[i + 1];
            if (!isNaN(px) && !isNaN(py)) {
                minX = Math.min(minX, px); minY = Math.min(minY, py);
                maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
                found = true;
            }
        }
    }

    if (!found) return null;

    return { minX, minY, maxX, maxY, vbX, vbY, vbW, vbH };
}

// ─── Оптическое выравнивание viewBox ───
// Цель: контент занимает одинаковый % площади у всех иконок
// Алгоритм:
//   1. Находим реальный bbox контента
//   2. Центрируем viewBox вокруг контента
//   3. Добавляем одинаковый padding (% от размера контента)
//      — одинаковый для всех иконок = одинаковый визуальный размер

const OPTICAL_PADDING = 0.10; // 10% отступ от края — настрой под свой вкус

function normalizeViewBox(svg) {
    const bounds = getContentBounds(svg);

    if (!bounds) {
        // Нет контента для анализа — оставляем как есть, только делаем квадратным
        const m = svg.match(/viewBox="([^"]*)"/);
        if (!m) return svg;
        const [x, y, w, h] = m[1].split(/[\s,]+/).map(Number);
        if ([x, y, w, h].some(isNaN)) return svg;
        const size = Math.max(w, h);
        const nx = x - (size - w) / 2;
        const ny = y - (size - h) / 2;
        return svg.replace(/viewBox="[^"]*"/, `viewBox="${fmt(nx)} ${fmt(ny)} ${fmt(size)} ${fmt(size)}"`);
    }

    const { minX, minY, maxX, maxY } = bounds;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const contentSize = Math.max(contentW, contentH);

    // Центр контента
    const cx = minX + contentW / 2;
    const cy = minY + contentH / 2;

    // viewBox со стороной = контент + padding со всех сторон
    const pad = contentSize * OPTICAL_PADDING;
    const viewSize = contentSize + pad * 2;

    const vx = fmt(cx - viewSize / 2);
    const vy = fmt(cy - viewSize / 2);
    const vs = fmt(viewSize);

    return svg.replace(/viewBox="[^"]*"/, `viewBox="${vx} ${vy} ${vs} ${vs}"`);
}

function fmt(n) {
    return Math.round(n * 100) / 100;
}

// ═══════════════════════════════════════════════
// ─── НОРМАЛИЗАЦИЯ FILL-ИКОНОК ───
// Задача: убрать весь мусор, все цвета → currentColor
// ═══════════════════════════════════════════════

function normalizeFill(svgString) {
    let s = svgString;

    // 1. Убираем style-блоки целиком
    s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // 2. Убираем defs (clipPath, mask, filter и т.д.)
    s = s.replace(/<defs[^>]*>[\s\S]*?<\/defs>/gi, '');

    // 3. Убираем clip-path и mask атрибуты на элементах
    s = s.replace(/\s+clip-path="[^"]*"/g, '');
    s = s.replace(/\s+mask="[^"]*"/g, '');

    // 4. Убираем все инлайн style атрибуты
    s = s.replace(/\s+style="[^"]*"/g, '');

    // 5. Убираем fill-rule и clip-rule (оставим только если нужно для формы)
    // На самом деле fill-rule="evenodd" важен для формы — оставляем
    // clip-rule тоже оставляем если есть

    // 6. Все fill="что угодно кроме none" → fill="currentColor"
    s = s.replace(/\bfill="(?!none")[^"]*"/g, 'fill="currentColor"');

    // 7. Убираем stroke с fill-иконок (не нужен)
    s = s.replace(/\s+stroke="[^"]*"/g, '');
    s = s.replace(/\s+stroke-width="[^"]*"/g, '');
    s = s.replace(/\s+stroke-linecap="[^"]*"/g, '');
    s = s.replace(/\s+stroke-linejoin="[^"]*"/g, '');

    // 8. Убираем трансформации на корневых g-обёртках если они только оборачивают
    // (SVGO уже должен был это сделать, но на всякий случай)
    s = s.replace(/<g\s+transform="translate\(0[,\s]+0\)">/g, '<g>');

    // 9. Убираем пустые g-теги
    s = s.replace(/<g[^>]*>\s*<\/g>/g, '');

    // 10. На корневом svg: убираем fill если он есть (будет управляться через currentColor)
    s = s.replace(/<svg([^>]*)>/, (_, attrs) => {
        let a = attrs;
        a = a.replace(/\s*fill="[^"]*"/g, '');
        a = a.replace(/\s*stroke="[^"]*"/g, '');
        a = a.replace(/\s*width="[^"]*"/g, '');
        a = a.replace(/\s*height="[^"]*"/g, '');
        return `<svg${a}>`;
    });

    return s;
}

// ═══════════════════════════════════════════════
// ─── НОРМАЛИЗАЦИЯ STROKE-ИКОНОК ───
// Задача: единый strokeWidth=1.5, round caps/joins, всё → currentColor
// ═══════════════════════════════════════════════

function normalizeStroke(svgString) {
    let s = svgString;
    const { strokeWidth, strokeLinecap, strokeLinejoin } = STYLE.stroke;

    // 1. Убираем style-блоки
    s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // 2. Убираем defs
    s = s.replace(/<defs[^>]*>[\s\S]*?<\/defs>/gi, '');

    // 3. Убираем инлайн style
    s = s.replace(/\s+style="[^"]*"/g, '');

    // 4. Убираем clip-path, mask
    s = s.replace(/\s+clip-path="[^"]*"/g, '');
    s = s.replace(/\s+mask="[^"]*"/g, '');

    // 5. Все stroke-цвета → currentColor
    s = s.replace(/\bstroke="(?!none")[^"]*"/g, 'stroke="currentColor"');

    // 6. Все fill="цвет" → fill="none" (stroke-иконки не должны быть залиты)
    //    fill="none" оставляем, fill="currentColor" оставляем если явно задан
    s = s.replace(/\bfill="(?!none)(?!currentColor)[^"]*"/g, 'fill="none"');

    // 7. Убираем все stroke-width, stroke-linecap, stroke-linejoin на дочерних элементах
    //    — они будут заданы единообразно на корне svg
    s = s.replace(/\s+stroke-width="[^"]*"/g, '');
    s = s.replace(/\s+stroke-linecap="[^"]*"/g, '');
    s = s.replace(/\s+stroke-linejoin="[^"]*"/g, '');
    s = s.replace(/\s+stroke-miterlimit="[^"]*"/g, '');

    // 8. Убираем пустые g-теги
    s = s.replace(/<g[^>]*>\s*<\/g>/g, '');

    // 9. На корневом svg задаём единый стиль stroke
    s = s.replace(/<svg([^>]*)>/, (_, attrs) => {
        let a = attrs;
        a = a.replace(/\s*fill="[^"]*"/g, '');
        a = a.replace(/\s*stroke="[^"]*"/g, '');
        a = a.replace(/\s*stroke-width="[^"]*"/g, '');
        a = a.replace(/\s*stroke-linecap="[^"]*"/g, '');
        a = a.replace(/\s*stroke-linejoin="[^"]*"/g, '');
        a = a.replace(/\s*width="[^"]*"/g, '');
        a = a.replace(/\s*height="[^"]*"/g, '');
        return `<svg${a} fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}">`;
    });

    return s;
}

// ─── Полный пайплайн ───

function processSvg(svgContent) {
    // 1. SVGO убирает основной мусор
    let svg = runSvgo(svgContent);

    // 2. Определяем тип ДО нашей нормализации
    const type = detectIconType(svg);

    // 3. Нормализуем под тип
    svg = type === 'stroke' ? normalizeStroke(svg) : normalizeFill(svg);

    // 4. Нормализуем viewBox
    svg = normalizeViewBox(svg);

    return { svg, type };
}

// ─── Парсинг для генерации Svelte-компонента ───

function parseSvg(svgString) {
    const m = svgString.match(/<svg([^>]*)>([\s\S]*)<\/svg>/);
    if (!m) return null;
    const attrs = m[1];
    const inner = m[2].trim();
    const getAttr = (name) => { const r = attrs.match(new RegExp(`${name}="([^"]*)"`)); return r ? r[1] : null; };
    return {
        viewBox: getAttr('viewBox') || '0 0 24 24',
        inner,
    };
}

// ─── Генерация Svelte компонента ───

function generateComponent(svgContent, kebabName) {
    const { svg, type } = processSvg(svgContent);
    const parsed = parseSvg(svg);
    if (!parsed) { console.warn(`  ⚠ Не удалось разобрать: ${kebabName}`); return null; }

    const { strokeWidth, strokeLinecap, strokeLinejoin } = STYLE.stroke;
    const isStroke = type === 'stroke';

    // Атрибуты svg-тега в компоненте
    const svgAttrs = [
        `viewBox="${parsed.viewBox}"`,
        `width={size}`,
        `height={size}`,
    ];

    if (isStroke) {
        svgAttrs.push(
            'fill="none"',
            'stroke={color}',
            `stroke-width={strokeWidth}`,
            `stroke-linecap="${strokeLinecap}"`,
            `stroke-linejoin="${strokeLinejoin}"`,
        );
    } else {
        svgAttrs.push('fill={color}');
    }

    svgAttrs.push(
        `class="icon icon-${kebabName}{className ? ' ' + className : ''}"`,
        'aria-hidden={!title}',
        'role={title ? "img" : "presentation"}',
        '{...rest}',
    );

    const props = isStroke
        ? `size = 24,\n    color = 'currentColor',\n    strokeWidth = ${strokeWidth},`
        : `size = 24,\n    color = 'currentColor',`;

    // Внутренний контент — убираем оставшиеся захардкоженные атрибуты
    let inner = parsed.inner;
    if (isStroke) {
        // На дочерних элементах stroke уже наследуется с корня — убираем дубли
        inner = inner
            .replace(/\s+stroke="currentColor"/g, '')
            .replace(/\s+fill="none"/g, '');
    } else {
        // На дочерних fill="currentColor" заменяем на наследование
        inner = inner.replace(/\s+fill="currentColor"/g, '');
    }

    return `<script>
  let {
    ${props}
    title = '',
    class: className = '',
    ...rest
  } = $props();
</script>

<svg
  ${svgAttrs.join('\n  ')}
>
  {#if title}<title>{title}</title>{/if}
  ${inner}
</svg>
`;
}

// ─── Генерация Icon.svelte ───

function generateIconComponent(icons) {
    const imports = icons
        .map(({ componentName }) => `import ${componentName} from './icons/${componentName}.svelte';`)
        .join('\n  ');
    const mapEntries = icons
        .map(({ kebabName, componentName }) => `    '${kebabName}': ${componentName}`)
        .join(',\n');

    return `<script>
  ${imports}

  const iconMap = {
${mapEntries}
  };

  let {
    name,
    size = 24,
    color = 'currentColor',
    strokeWidth = ${STYLE.stroke.strokeWidth},
    title = '',
    class: className = '',
    ...rest
  } = $props();

  let IconComponent = $derived(iconMap[name]);
</script>

{#if IconComponent}
  <IconComponent {size} {color} {strokeWidth} {title} class={className} {...rest} />
{:else}
  <span style="display:inline-flex;align-items:center;gap:4px;color:#ef4444;font-size:12px;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    {name}
  </span>
{/if}
`;
}

// ─── Генерация index.js ───

function generateIndex(icons) {
    const exports = icons
        .map(({ componentName }) =>
            `export { default as ${componentName} } from './icons/${componentName}.svelte';`)
        .join('\n');
    const names = icons.map(({ kebabName }) => `'${kebabName}'`).join(', ');
    return `// Файл сгенерирован автоматически — не редактируйте вручную
${exports}

export { default as Icon } from './Icon.svelte';

export const iconNames = [${names}];
`;
}

// ─── Генерация Preview ───

function generatePreview(icons) {
    const iconCards = icons.map(({ kebabName, componentName, file, type, originalViewBox }) => {
        const raw = fs.readFileSync(path.join(SVG_DIR, file), 'utf-8');
        const { svg } = processSvg(raw);
        const typeLabel = type === 'stroke' ? '〰️ stroke' : '◼ fill';
        return `
      <div class="card" data-name="${kebabName} ${componentName}" data-component="${componentName}" data-kebab="${kebabName}" data-type="${type}">
        <button class="delete" onclick="del('${kebabName}')" title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="preview">${svg}</div>
        <div class="name-row">
          <span class="name" title="Двойной клик — переименовать" ondblclick="rename(this, '${kebabName}')">${kebabName}</span>
        </div>
        <div class="meta">${typeLabel} · ${originalViewBox}</div>
        <div class="actions">
          <button class="copy-btn" onclick="copyImport('${componentName}')" title="Скопировать import">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Import
          </button>
          <button class="copy-btn" onclick="copyComponent('${componentName}')" title="Скопировать тег">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Тег
          </button>
          <button class="copy-btn" onclick="downloadSvg('${kebabName}')" title="Скачать SVG">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
      </div>`;
    }).join('');

    const fillCount = icons.filter(i => i.type === 'fill').length;
    const strokeCount = icons.filter(i => i.type === 'stroke').length;

    return /* html */`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Иконки — ${icons.length} шт.</title>
<style>
  :root {
    --bg:#f8f9fa;--bg-card:#fff;--bg-input:#fff;--bg-hover:#f1f3f5;
    --text:#1a1a2e;--text-muted:#6b7280;--text-dim:#9ca3af;
    --border:#e5e7eb;--border-hover:#d1d5db;
    --accent:#6366f1;--accent-light:rgba(99,102,241,.08);--accent-hover:#4f46e5;
    --danger:#ef4444;--danger-bg:#fef2f2;
    --success:#10b981;--success-bg:rgba(16,185,129,.08);
    --warning:#f59e0b;--warning-bg:rgba(245,158,11,.08);
    --icon-size:28px;--radius:12px;
    --shadow:0 1px 3px rgba(0,0,0,.04),0 1px 2px rgba(0,0,0,.06);
    --shadow-hover:0 10px 30px rgba(0,0,0,.08);
    --icon-color:#1a1a2e;
  }
  .dark {
    --bg:#0f0f1a;--bg-card:#1a1a2e;--bg-input:#16213e;--bg-hover:#232340;
    --text:#e2e8f0;--text-muted:#94a3b8;--text-dim:#64748b;
    --border:#2d2d44;--border-hover:#3d3d5c;
    --accent:#818cf8;--accent-light:rgba(129,140,248,.1);--accent-hover:#6366f1;
    --danger:#f87171;--danger-bg:#1c1017;
    --success:#34d399;--success-bg:rgba(52,211,153,.1);
    --warning:#fbbf24;--warning-bg:rgba(251,191,36,.1);
    --shadow:0 1px 3px rgba(0,0,0,.3);--shadow-hover:0 10px 30px rgba(0,0,0,.4);
    --icon-color:#e2e8f0;
  }
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;transition:background .25s,color .25s;}

  .toolbar{position:sticky;top:0;z-index:100;background:var(--bg-card);border-bottom:1px solid var(--border);padding:.75rem 1.5rem;box-shadow:var(--shadow);}
  .toolbar-inner{max-width:1400px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;}
  .toolbar-brand{display:flex;align-items:center;gap:.5rem;font-weight:700;font-size:1.1rem;white-space:nowrap;margin-right:.25rem;}
  .badge{display:inline-flex;align-items:center;justify-content:center;background:var(--accent);color:#fff;font-size:.65rem;font-weight:700;padding:.1rem .45rem;border-radius:99px;min-width:22px;}
  .badge-version{background:var(--success);font-size:.6rem;padding:.1rem .4rem;border-radius:99px;color:#fff;font-weight:600;cursor:pointer;transition:opacity .15s;}
  .badge-version:hover{opacity:.85;}
  .search-wrap{flex:1;min-width:180px;max-width:360px;position:relative;}
  .search-wrap svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;width:15px;height:15px;}
  .search{width:100%;padding:.5rem .7rem .5rem 2rem;border:1.5px solid var(--border);border-radius:8px;font-size:.85rem;outline:none;background:var(--bg-input);color:var(--text);transition:border .2s,box-shadow .2s;}
  .search:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-light);}
  .search::placeholder{color:var(--text-dim);}
  .toolbar-right{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-left:auto;}
  .filter-group{display:flex;gap:.25rem;}
  .filter-btn{padding:.3rem .65rem;border-radius:6px;border:1.5px solid var(--border);background:var(--bg-input);color:var(--text-muted);font-size:.72rem;font-weight:600;cursor:pointer;transition:all .15s;}
  .filter-btn:hover{border-color:var(--accent);color:var(--accent);}
  .filter-btn.active{border-color:var(--accent);background:var(--accent);color:#fff;}
  .size-ctrl{display:flex;align-items:center;gap:.35rem;font-size:.75rem;color:var(--text-muted);}
  .size-ctrl input[type=range]{width:70px;accent-color:var(--accent);}
  .btn-icon{width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-input);color:var(--text);cursor:pointer;transition:all .15s;}
  .btn-icon:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light);}
  .btn-icon svg{width:16px;height:16px;}
  .btn-primary{display:inline-flex;align-items:center;gap:.35rem;padding:.45rem .9rem;border-radius:8px;background:var(--accent);color:#fff;border:none;font-size:.8rem;font-weight:600;cursor:pointer;transition:background .15s;}
  .btn-primary:hover{background:var(--accent-hover);}
  .btn-primary svg{width:15px;height:15px;}
  .btn-primary:disabled{opacity:.5;cursor:not-allowed;}
  .btn-success{display:inline-flex;align-items:center;gap:.35rem;padding:.45rem .9rem;border-radius:8px;background:var(--success);color:#fff;border:none;font-size:.8rem;font-weight:600;cursor:pointer;transition:opacity .15s;}
  .btn-success:hover{opacity:.9;}
  .btn-success:disabled{opacity:.5;cursor:not-allowed;}
  .btn-secondary{padding:.45rem .9rem;border-radius:8px;background:transparent;color:var(--text);border:1.5px solid var(--border);font-size:.8rem;cursor:pointer;transition:all .15s;}
  .btn-secondary:hover{border-color:var(--text-muted);background:var(--bg-hover);}
  .btn-danger{padding:.45rem .9rem;border-radius:8px;background:var(--danger);color:#fff;border:none;font-size:.8rem;font-weight:600;cursor:pointer;transition:background .15s;}
  .btn-danger:hover{background:#dc2626;}

  .main{max-width:1400px;margin:0 auto;padding:1.25rem 1.5rem 4rem;}

  .dropzone{border:2px dashed var(--border);border-radius:var(--radius);padding:2rem 1.5rem;text-align:center;color:var(--text-dim);transition:all .25s;cursor:pointer;margin-bottom:1.25rem;}
  .dropzone:hover,.dropzone.over{border-color:var(--accent);background:var(--accent-light);color:var(--accent);}
  .dropzone input{display:none;}
  .dropzone-icon{font-size:1.75rem;margin-bottom:.35rem;}
  .dropzone-text{font-size:.9rem;font-weight:500;}
  .dropzone-hint{font-size:.75rem;margin-top:.2rem;opacity:.7;}

  .publish-panel{background:var(--bg-card);border:1.5px solid var(--border);border-radius:var(--radius);margin-bottom:1.25rem;box-shadow:var(--shadow);overflow:hidden;}
  .publish-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;cursor:pointer;user-select:none;}
  .publish-header:hover{background:var(--bg-hover);}
  .publish-header h2{font-size:.95rem;font-weight:700;}
  .publish-toggle-icon{font-size:.8rem;color:var(--text-dim);transition:transform .2s;}
  .publish-body{padding:0 1.25rem 1.25rem;}
  .publish-section{margin-bottom:1.25rem;padding-bottom:1.25rem;border-bottom:1px solid var(--border);}
  .publish-section:last-child{margin-bottom:0;border-bottom:none;padding-bottom:0;}
  .publish-section h3{font-size:.82rem;font-weight:700;margin-bottom:.65rem;color:var(--text);display:flex;align-items:center;gap:.4rem;}
  .publish-hint{font-size:.72rem;color:var(--text-dim);line-height:1.5;margin-bottom:.65rem;}
  .publish-row{display:flex;flex-wrap:wrap;align-items:center;gap:.65rem;margin-bottom:.6rem;}
  .publish-row:last-child{margin-bottom:0;}
  .publish-label{font-size:.75rem;color:var(--text-muted);font-weight:600;min-width:100px;}
  .bump-group{display:flex;gap:.35rem;}
  .bump-btn{padding:.3rem .65rem;border-radius:6px;border:1.5px solid var(--border);background:var(--bg-input);color:var(--text);font-size:.72rem;font-weight:600;cursor:pointer;transition:all .15s;}
  .bump-btn:hover{border-color:var(--accent);color:var(--accent);}
  .bump-btn.active{border-color:var(--accent);background:var(--accent);color:#fff;}
  .code-block{background:var(--bg-hover);border:1px solid var(--border);border-radius:8px;padding:.5rem .75rem;font-family:'SF Mono','Fira Code','Consolas',monospace;font-size:.73rem;color:var(--text);position:relative;overflow-x:auto;cursor:pointer;transition:border-color .15s;flex:1;min-width:0;}
  .code-block:hover{border-color:var(--accent);}
  .code-block .copy-hint{position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:.58rem;color:var(--text-dim);font-family:sans-serif;opacity:0;transition:opacity .15s;pointer-events:none;}
  .code-block:hover .copy-hint{opacity:1;}
  .changelog-area{width:100%;min-height:55px;padding:.45rem .65rem;border:1.5px solid var(--border);border-radius:8px;font-size:.75rem;outline:none;resize:vertical;background:var(--bg-input);color:var(--text);font-family:inherit;}
  .changelog-area:focus{border-color:var(--accent);}
  .publish-status{margin-top:.75rem;padding:.5rem .75rem;border-radius:8px;font-size:.75rem;display:none;line-height:1.5;}
  .publish-status.show{display:block;}
  .publish-status.success{background:var(--success-bg);color:var(--success);border:1px solid var(--success);}
  .publish-status.error{background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger);}
  .publish-status.info{background:var(--accent-light);color:var(--accent);border:1px solid var(--accent);}
  .step-list{font-size:.72rem;color:var(--text-muted);line-height:1.8;padding-left:1.25rem;}
  .step-list li{margin-bottom:.15rem;}
  .step-list code{background:var(--bg-hover);padding:.1rem .35rem;border-radius:4px;font-size:.7rem;font-family:'SF Mono','Fira Code',monospace;}

  .info-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-bottom:1rem;font-size:.78rem;color:var(--text-muted);}
  .chip{display:inline-flex;align-items:center;gap:.25rem;padding:.2rem .55rem;border-radius:6px;background:var(--bg-card);border:1px solid var(--border);font-size:.75rem;}
  .kbd{display:inline-flex;padding:.1rem .35rem;border-radius:4px;border:1px solid var(--border);background:var(--bg-hover);font-size:.65rem;font-family:monospace;color:var(--text-muted);}

  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.65rem;}
  .card{position:relative;display:flex;flex-direction:column;align-items:center;padding:1.1rem .6rem .6rem;background:var(--bg-card);border-radius:var(--radius);border:1.5px solid transparent;transition:all .2s;cursor:default;box-shadow:var(--shadow);}
  .card:hover{border-color:var(--border-hover);box-shadow:var(--shadow-hover);transform:translateY(-1px);}
  .card.selected{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-light),var(--shadow-hover);}
  .card .delete{position:absolute;top:5px;right:5px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:none;border:none;color:var(--text-dim);border-radius:6px;cursor:pointer;opacity:0;transition:all .15s;}
  .card .delete svg{width:12px;height:12px;}
  .card:hover .delete{opacity:1;}
  .card .delete:hover{background:var(--danger-bg);color:var(--danger);}
  .preview{display:flex;align-items:center;justify-content:center;margin-bottom:.5rem;}
  .preview svg{width:var(--icon-size);height:var(--icon-size);color:var(--icon-color);}
  /* Fill иконки */
  .preview svg:not([fill="none"]){fill:var(--icon-color);}
  .preview svg:not([fill="none"]) *{fill:inherit;}
  /* Stroke иконки */
  .preview svg[fill="none"]{fill:none;stroke:var(--icon-color);}
  .preview svg[fill="none"] *{stroke:inherit;}
  .name-row{display:flex;align-items:center;justify-content:center;margin-bottom:.2rem;max-width:100%;}
  .name{font-size:.68rem;color:var(--text-muted);text-align:center;word-break:break-all;padding:2px 6px;border-radius:4px;cursor:pointer;transition:background .15s;max-width:100%;}
  .name:hover{background:var(--bg-hover);}
  .meta{font-size:.55rem;color:var(--text-dim);margin-bottom:.35rem;font-family:monospace;}
  .actions{display:flex;gap:.3rem;flex-wrap:wrap;justify-content:center;}
  .copy-btn{display:inline-flex;align-items:center;gap:.2rem;font-size:.6rem;font-weight:500;padding:.15rem .4rem;background:transparent;border:1px solid var(--border);border-radius:5px;cursor:pointer;color:var(--text-muted);transition:all .15s;white-space:nowrap;}
  .copy-btn svg{width:11px;height:11px;flex-shrink:0;}
  .copy-btn:hover{background:var(--accent);border-color:var(--accent);color:#fff;}
  .hidden{display:none!important;}

  .empty{text-align:center;padding:4rem 2rem;color:var(--text-dim);}
  .empty-icon{font-size:2.5rem;margin-bottom:.75rem;opacity:.5;}
  .empty-text{font-size:1rem;font-weight:500;}
  .empty-hint{font-size:.8rem;margin-top:.3rem;}

  .toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(100px);background:var(--text);color:var(--bg);padding:.55rem 1.25rem;border-radius:10px;font-size:.8rem;font-weight:500;box-shadow:0 10px 40px rgba(0,0,0,.25);transition:transform .3s cubic-bezier(.4,0,.2,1);z-index:1000;pointer-events:none;white-space:nowrap;}
  .toast.show{transform:translateX(-50%) translateY(0);}

  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:500;opacity:0;pointer-events:none;transition:opacity .2s;}
  .modal-overlay.active{opacity:1;pointer-events:auto;}
  .modal{background:var(--bg-card);border-radius:16px;padding:1.75rem;max-width:440px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,.25);transform:scale(.95);transition:transform .2s;}
  .modal-overlay.active .modal{transform:scale(1);}
  .modal h2{font-size:1.05rem;margin-bottom:.85rem;}
  .modal-input{width:100%;padding:.55rem .7rem;border:1.5px solid var(--border);border-radius:8px;font-size:.85rem;outline:none;background:var(--bg-input);color:var(--text);margin-bottom:.85rem;}
  .modal-input:focus{border-color:var(--accent);}
  .modal-actions{display:flex;gap:.6rem;justify-content:flex-end;}

  .bulk-bar{position:fixed;bottom:0;left:0;right:0;background:var(--bg-card);border-top:1px solid var(--border);padding:.65rem 1.5rem;display:flex;align-items:center;justify-content:center;gap:.75rem;transform:translateY(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);z-index:200;box-shadow:0 -4px 20px rgba(0,0,0,.1);}
  .bulk-bar.visible{transform:translateY(0);}
  .bulk-bar span{font-size:.85rem;font-weight:600;}

  @keyframes spin{to{transform:rotate(360deg);}}
  .spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;}

  @media(max-width:640px){
    .toolbar{padding:.6rem .75rem;}
    .main{padding:.75rem;}
    .grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:.5rem;}
    .card{padding:.85rem .4rem .4rem;}
    .search-wrap{max-width:none;}
  }
</style>
</head>
<body>
<div class="toolbar">
  <div class="toolbar-inner">
    <div class="toolbar-brand">
      <span>📦</span><span>Иконки</span>
      <span class="badge" id="countBadge">${icons.length}</span>
      <span class="badge-version" id="versionBadge" onclick="togglePublish()" title="Публикация">v${pkg.version}</span>
    </div>
    <div class="search-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="search" id="search" type="text" placeholder="Поиск...  ⌘K" oninput="filterIcons()">
    </div>
    <div class="toolbar-right">
      <div class="filter-group">
        <button class="filter-btn active" data-filter="all" onclick="setFilter('all')">Все (${icons.length})</button>
        <button class="filter-btn" data-filter="fill" onclick="setFilter('fill')">◼ Fill (${fillCount})</button>
        <button class="filter-btn" data-filter="stroke" onclick="setFilter('stroke')">〰 Stroke (${strokeCount})</button>
      </div>
      <div class="size-ctrl">
        <input type="range" min="16" max="64" value="28" oninput="resizeIcons(this.value)">
        <span id="sizeVal">28</span>
      </div>
      <button class="btn-icon" onclick="toggleTheme()" title="Сменить тему">
        <svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      </button>
      <button class="btn-success" onclick="togglePublish()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
        Публикация
      </button>
      <button class="btn-primary" onclick="document.getElementById('fileInput').click()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Добавить
      </button>
    </div>
  </div>
</div>

<div class="main">
  <div class="publish-panel" id="publishPanel" style="display:none;">
    <div class="publish-header" onclick="togglePublishBody()">
      <h2>🚀 Публикация и подключение</h2>
      <span class="publish-toggle-icon" id="publishToggleIcon">▼</span>
    </div>
    <div class="publish-body" id="publishBody">
      <div class="publish-section">
        <h3>📥 Подключение к проекту</h3>
        <div class="publish-row">
          <span class="publish-label">Установка:</span>
          <div class="code-block" onclick="copyText(this.querySelector('code').textContent)">
            <code>npm install ${PKG_NAME}@latest</code><span class="copy-hint">скопировать</span>
          </div>
        </div>
        <div class="publish-row">
          <span class="publish-label">Импорт:</span>
          <div class="code-block" onclick="copyText(this.querySelector('code').textContent)">
            <code>import { Heart, Icon } from '${PKG_NAME}';</code><span class="copy-hint">скопировать</span>
          </div>
        </div>
        <div class="publish-row">
          <span class="publish-label">По имени:</span>
          <div class="code-block" onclick="copyText(this.querySelector('code').textContent)">
            <code>&lt;Icon name="heart" size={24} /&gt;</code><span class="copy-hint">скопировать</span>
          </div>
        </div>
      </div>
      <div class="publish-section">
        <h3>📤 Опубликовать</h3>
        <div class="publish-row">
          <span class="publish-label">Текущая:</span>
          <strong id="currentVersion">${pkg.version}</strong>
        </div>
        <div class="publish-row">
          <span class="publish-label">Тип версии:</span>
          <div class="bump-group">
            <button class="bump-btn active" data-bump="patch" onclick="selectBump('patch')">Патч</button>
            <button class="bump-btn" data-bump="minor" onclick="selectBump('minor')">Минор</button>
            <button class="bump-btn" data-bump="major" onclick="selectBump('major')">Мажор</button>
          </div>
          <span id="bumpPreview" style="font-size:.75rem;color:var(--text-muted);"></span>
        </div>
        <div class="publish-row">
          <span class="publish-label">Описание:</span>
          <textarea class="changelog-area" id="publishMessage" placeholder="Что изменилось?"></textarea>
        </div>
        <div class="publish-row" style="justify-content:flex-end;">
          <button class="btn-success" id="publishBtn" onclick="doPublish()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
            Опубликовать
          </button>
        </div>
        <div class="publish-status" id="publishStatus"></div>
      </div>
      <div class="publish-section">
        <h3>⚙️ Настройка (один раз)</h3>
        <ol class="step-list">
          <li>Зарегистрируйтесь на <a href="https://www.npmjs.com" target="_blank" style="color:var(--accent);">npmjs.com</a></li>
          <li>Выполните в терминале: <code>npm login</code></li>
          <li>Готово — кнопка «Опубликовать» будет работать</li>
        </ol>
      </div>
    </div>
  </div>

  <div class="dropzone" id="dropzone"
       ondrop="handleDrop(event)" ondragover="event.preventDefault()"
       ondragenter="dragEnter(event)" ondragleave="dragLeave(event)"
       onclick="document.getElementById('fileInput').click()">
    <input type="file" id="fileInput" accept=".svg" multiple onchange="handleFiles(this.files)">
    <div class="dropzone-icon">📁</div>
    <div class="dropzone-text">Перетащите SVG-файлы сюда или нажмите для выбора</div>
    <div class="dropzone-hint">Fill и stroke иконки определяются автоматически · Цвета нормализуются · Stroke-width приводится к 1.5</div>
  </div>

  ${icons.length > 0 ? `
  <div class="info-bar">
    <div class="chip">📊 <strong>${icons.length}</strong> иконок</div>
    <div class="chip">◼ Fill: <strong>${fillCount}</strong></div>
    <div class="chip">〰 Stroke: <strong>${strokeCount}</strong></div>
    <div class="chip"><kbd class="kbd">Shift</kbd> + клик — выделение нескольких</div>
    <div class="chip"><kbd class="kbd">⌘K</kbd> поиск</div>
  </div>` : `
  <div class="empty">
    <div class="empty-icon">📭</div>
    <div class="empty-text">Пока нет иконок</div>
    <div class="empty-hint">Перетащите SVG-файлы в область выше</div>
  </div>`}

  <div class="grid" id="grid">${iconCards}</div>
</div>

<div class="bulk-bar" id="bulkBar">
  <span id="selectedCount">0 выбрано</span>
  <button class="btn-danger" onclick="bulkDelete()">Удалить выбранные</button>
  <button class="btn-secondary" onclick="clearSelection()">Отмена</button>
</div>
<div class="toast" id="toast"></div>
<div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <h2 id="modalTitle">Переименовать</h2>
    <input class="modal-input" id="modalInput" placeholder="Новое имя...">
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Отмена</button>
      <button class="btn-primary" id="modalConfirm" onclick="confirmModal()">Переименовать</button>
    </div>
  </div>
</div>

<script>
const PKG = '${PKG_NAME}';
const CURRENT_VERSION = '${pkg.version}';
let selectedBump = 'patch';
let selectedCards = new Set();
let modalCallback = null;
let publishOpen = false;
let currentFilter = 'all';

function initTheme() {
  const s = localStorage.getItem('icon-lib-theme');
  if (s === 'dark' || (!s && matchMedia('(prefers-color-scheme:dark)').matches))
    document.documentElement.classList.add('dark');
  updateThemeIcon();
}
function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('icon-lib-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  updateThemeIcon();
}
function updateThemeIcon() {
  const d = document.documentElement.classList.contains('dark');
  document.getElementById('themeIcon').innerHTML = d
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
}
initTheme();

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  filterIcons();
}
function filterIcons() {
  const q = document.getElementById('search').value.toLowerCase();
  let v = 0;
  document.querySelectorAll('.card').forEach(c => {
    const matchSearch = c.dataset.name.toLowerCase().includes(q);
    const matchFilter = currentFilter === 'all' || c.dataset.type === currentFilter;
    const show = matchSearch && matchFilter;
    c.classList.toggle('hidden', !show);
    if (show) v++;
  });
  document.getElementById('countBadge').textContent = v;
}
function resizeIcons(val) {
  document.getElementById('sizeVal').textContent = val;
  document.documentElement.style.setProperty('--icon-size', val + 'px');
}

let _t;
function toast(msg, dur = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_t); _t = setTimeout(() => el.classList.remove('show'), dur);
}

function openModal(title, value, btnText, cb) {
  document.getElementById('modalTitle').textContent = title;
  const inp = document.getElementById('modalInput');
  inp.value = value;
  document.getElementById('modalConfirm').textContent = btnText;
  document.getElementById('modalOverlay').classList.add('active');
  setTimeout(() => { inp.focus(); inp.select(); }, 50);
  modalCallback = cb;
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); modalCallback = null; }
function confirmModal() { const v = document.getElementById('modalInput').value.trim(); if (v && modalCallback) modalCallback(v); closeModal(); }

document.addEventListener('keydown', e => {
  if (document.getElementById('modalOverlay').classList.contains('active')) {
    if (e.key === 'Enter') { e.preventDefault(); confirmModal(); }
    if (e.key === 'Escape') closeModal();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('search').focus(); }
  if (e.key === 'Escape') clearSelection();
});

function copyText(text) { navigator.clipboard.writeText(text).then(() => toast('✓ Скопировано')); }
function copyImport(name) { copyText("import { " + name + " } from '" + PKG + "';"); }
function copyComponent(name) { copyText('<' + name + ' />'); }
function downloadSvg(name) { window.open('/api/svg/' + encodeURIComponent(name), '_blank'); }

document.getElementById('grid').addEventListener('click', e => {
  if (!e.shiftKey) return;
  const card = e.target.closest('.card');
  if (!card || e.target.closest('button')) return;
  e.preventDefault();
  const n = card.dataset.kebab;
  if (selectedCards.has(n)) { selectedCards.delete(n); card.classList.remove('selected'); }
  else { selectedCards.add(n); card.classList.add('selected'); }
  updateBulkBar();
});
function updateBulkBar() {
  document.getElementById('selectedCount').textContent = selectedCards.size + ' выбрано';
  document.getElementById('bulkBar').classList.toggle('visible', selectedCards.size > 0);
}
function clearSelection() {
  selectedCards.clear();
  document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
  updateBulkBar();
}
async function bulkDelete() {
  if (!confirm('Удалить ' + selectedCards.size + ' иконок?')) return;
  toast('Удаление...', 5000);
  for (const name of [...selectedCards])
    try { await fetch('/api/icons/' + encodeURIComponent(name), { method: 'DELETE' }); } catch {}
  try { await fetch('/api/rebuild', { method: 'POST' }); } catch {}
  clearSelection();
}

let dragCounter = 0;
function dragEnter(e) { e.preventDefault(); dragCounter++; document.getElementById('dropzone').classList.add('over'); }
function dragLeave() { dragCounter--; if (dragCounter <= 0) { dragCounter = 0; document.getElementById('dropzone').classList.remove('over'); } }
function handleDrop(e) {
  e.preventDefault(); dragCounter = 0;
  document.getElementById('dropzone').classList.remove('over');
  const files = [...e.dataTransfer.files].filter(f => f.name.endsWith('.svg'));
  if (files.length) uploadFiles(files);
}
function handleFiles(fl) {
  const files = [...fl].filter(f => f.name.endsWith('.svg'));
  if (files.length) uploadFiles(files);
  document.getElementById('fileInput').value = '';
}
async function uploadFiles(files) {
  toast('Загрузка ' + files.length + ' файлов...', 5000);
  const payload = [];
  for (const f of files) payload.push({ name: f.name, content: await f.text() });
  try {
    const r = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: payload }) });
    const d = await r.json();
    if (d.ok) toast('✓ Добавлено: ' + d.saved + ' иконок');
    else toast('✗ ' + (d.error || 'Ошибка'));
  } catch { toast('✗ Сервер не запущен — выполните npm run dev'); }
}

async function del(name) {
  if (!confirm('Удалить «' + name + '»?')) return;
  try {
    const r = await fetch('/api/icons/' + encodeURIComponent(name), { method: 'DELETE' });
    if ((await r.json()).ok) toast('✓ Удалено: ' + name);
  } catch { toast('✗ Ошибка сервера'); }
}
function rename(el, oldName) {
  openModal('Переименовать иконку', oldName, 'Переименовать', async (newName) => {
    try {
      const r = await fetch('/api/icons/' + encodeURIComponent(oldName), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });
      const d = await r.json();
      if (d.ok) toast('✓ Переименовано → ' + d.name);
      else toast('✗ ' + (d.error || 'Ошибка'));
    } catch { toast('✗ Не удалось переименовать'); }
  });
}

function togglePublish() {
  const panel = document.getElementById('publishPanel');
  publishOpen = !publishOpen;
  panel.style.display = publishOpen ? 'block' : 'none';
  if (publishOpen) updateBumpPreview();
}
function togglePublishBody() {
  const body = document.getElementById('publishBody');
  const icon = document.getElementById('publishToggleIcon');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  icon.textContent = isOpen ? '▶' : '▼';
}
function selectBump(type) {
  selectedBump = type;
  document.querySelectorAll('.bump-btn').forEach(b => b.classList.toggle('active', b.dataset.bump === type));
  updateBumpPreview();
}
function updateBumpPreview() {
  const p = CURRENT_VERSION.split('.').map(Number);
  let next;
  if (selectedBump === 'major') next = (p[0]+1)+'.0.0';
  else if (selectedBump === 'minor') next = p[0]+'.'+(p[1]+1)+'.0';
  else next = p[0]+'.'+p[1]+'.'+(p[2]+1);
  document.getElementById('bumpPreview').textContent = CURRENT_VERSION + ' → ' + next;
}
updateBumpPreview();

function setPublishStatus(msg, type) {
  const el = document.getElementById('publishStatus');
  el.innerHTML = msg; el.className = 'publish-status show ' + type;
}
async function doPublish() {
  const btn = document.getElementById('publishBtn');
  const message = document.getElementById('publishMessage').value.trim();
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Публикуем...';
  setPublishStatus('⏳ Собираем и публикуем...', 'info');
  try {
    const r = await fetch('/api/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bump: selectedBump, message: message || undefined }),
    });
    const d = await r.json();
    if (d.ok) {
      setPublishStatus('✅ Версия <strong>v' + d.version + '</strong> опубликована!<br>Обновите в проекте: <code>npm update ${PKG_NAME}</code>', 'success');
      document.getElementById('currentVersion').textContent = d.version;
      document.getElementById('versionBadge').textContent = 'v' + d.version;
      document.getElementById('publishMessage').value = '';
    } else {
      setPublishStatus('❌ ' + (d.error || 'Ошибка публикации'), 'error');
    }
  } catch (e) { setPublishStatus('❌ ' + e.message, 'error'); }
  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg> Опубликовать';
}

if (location.protocol !== 'file:') {
  let rt;
  function connectSSE() {
    const es = new EventSource('/api/events');
    es.onmessage = e => { if (e.data === 'reload') location.reload(); };
    es.onerror = () => { es.close(); clearTimeout(rt); rt = setTimeout(connectSSE, 3000); };
  }
  connectSSE();
}
</script>
</body>
</html>`;
}

// ─── Основная сборка ───

async function build() {
    console.log('🔨 Сборка библиотеки иконок...\n');
    [SVG_DIR, ICONS_DIR, PREVIEW_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
    fs.readdirSync(ICONS_DIR).forEach(f => fs.unlinkSync(path.join(ICONS_DIR, f)));

    const svgFiles = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg')).sort();
    const icons = [];

    for (const file of svgFiles) {
        const baseName = path.basename(file, '.svg');
        const kebabName = toKebabCase(baseName);
        const componentName = toPascalCase(baseName);
        const svgContent = fs.readFileSync(path.join(SVG_DIR, file), 'utf-8');

        const origVbMatch = svgContent.match(/viewBox="([^"]*)"/);
        const originalViewBox = origVbMatch ? origVbMatch[1] : 'нет';

        const component = generateComponent(svgContent, kebabName);
        if (!component) continue;

        const { type } = processSvg(svgContent);

        fs.writeFileSync(path.join(ICONS_DIR, `${componentName}.svelte`), component);
        icons.push({ kebabName, componentName, file, type, originalViewBox });
        console.log(`  ✓ ${file} → ${componentName}.svelte [${type}]`);
    }

    fs.writeFileSync(path.join(SRC_DIR, 'Icon.svelte'), generateIconComponent(icons));
    fs.writeFileSync(path.join(SRC_DIR, 'index.js'), generateIndex(icons));
    fs.writeFileSync(path.join(PREVIEW_DIR, 'index.html'), generatePreview(icons));

    const fillCount = icons.filter(i => i.type === 'fill').length;
    const strokeCount = icons.filter(i => i.type === 'stroke').length;

    console.log(`\n✨ Собрано ${icons.length} иконок (fill: ${fillCount}, stroke: ${strokeCount})`);
    console.log('📦 Готово к публикации\n');
}

build().catch(console.error);