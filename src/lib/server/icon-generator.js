import path from 'node:path';
import { mkdir, readdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { optimize } from 'svgo';
import { pascalCase } from 'change-case';

const ICONS_DIR = path.resolve(process.cwd(), 'src/lib/icons');
const RAW_DIR = path.resolve(ICONS_DIR, '__raw');
const INDEX_FILE = path.resolve(ICONS_DIR, 'index.js');

async function ensureDirs() {
	await mkdir(ICONS_DIR, { recursive: true });
	await mkdir(RAW_DIR, { recursive: true });
}

async function readIfExists(filePath) {
	try {
		return await readFile(filePath, 'utf8');
	} catch {
		return null;
	}
}

async function writeIfChanged(filePath, content) {
	const previous = await readIfExists(filePath);
	if (previous === content) return false;
	await writeFile(filePath, content, 'utf8');
	return true;
}

function sanitizeSvg(svg) {
	return svg
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
		.replace(/\son\w+="[^"]*"/gi, '')
		.replace(/\son\w+='[^']*'/gi, '')
		.replace(/\s(?:href|xlink:href)=("javascript:[^"]*"|'javascript:[^']*')/gi, '');
}

function extractSvg(svg) {
	const match = svg.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);
	if (!match) throw new Error('Некорректный SVG: не найден тег <svg>');

	const attrs = match[1];
	const inner = match[2];
	const viewBox = attrs.match(/viewBox=['"]([^'"]+)['"]/i)?.[1] || '0 0 24 24';

	return { viewBox, inner };
}

function toComponentName(fileName) {
	const base = fileName
		.replace(/\.svg$/i, '')
		.normalize('NFKD')
		.replace(/[^\w\s-]/g, ' ')
		.trim();

	let name = pascalCase(base || 'icon');
	if (!name) name = 'Icon';
	if (/^\d/.test(name)) name = `I${name}`;
	return name;
}

function monoPaint(inner) {
	const withNormalizedStyle = inner.replace(/\sstyle=("([^"]*)"|'([^']*)')/gi, (full, _q, dq, sq) => {
		const styleValue = String(dq ?? sq ?? '').trim();
		if (!styleValue) return '';

		const normalized = styleValue
			.split(';')
			.map((chunk) => chunk.trim())
			.filter(Boolean)
			.map((chunk) => {
				const [rawProp, ...rest] = chunk.split(':');
				if (!rawProp || !rest.length) return chunk;

				const prop = rawProp.trim().toLowerCase();
				const value = rest.join(':').trim();
				if (!value) return chunk;

				if (prop === 'fill' || prop === 'stroke') {
					return `${rawProp.trim()}:${/^(none)$/i.test(value) ? 'none' : 'currentColor'}`;
				}

				return `${rawProp.trim()}:${value}`;
			})
			.join('; ');

		return normalized ? ` style="${normalized}"` : '';
	});

	return withNormalizedStyle
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/\s(fill|stroke)=("([^"]*)"|'([^']*)')/gi, (full, attr, _quoted, dq, sq) => {
			const value = String(dq ?? sq ?? '').trim();
			if (!value) return full;
			if (/^(none|currentColor)$/i.test(value)) return full;
			return ` ${attr}="currentColor"`;
		});
}

function optimizeSvgPreservingGeometry(raw, name) {
	return optimize(raw, {
		multipass: false,
		plugins: [
			'removeDoctype',
			'removeXMLProcInst',
			'removeComments',
			'removeMetadata',
			'removeEditorsNSData',
			{ name: 'removeDimensions' },
			{ name: 'prefixIds', params: { prefix: `${name}-` } }
		]
	}).data;
}

function makeSvelteComponent(viewBox, inner) {
	const body = JSON.stringify(inner);

	return `<script>\n\texport let size = 24;\n\texport let title = undefined;\n</script>\n\n<svg\n\t{...$$restProps}\n\txmlns="http://www.w3.org/2000/svg"\n\twidth={size}\n\theight={size}\n\tviewBox="${viewBox}"\n\tfill="currentColor"\n\trole={title ? 'img' : 'presentation'}\n\taria-hidden={title ? undefined : 'true'}\n>\n\t{#if title}<title>{title}</title>{/if}\n\t{@html ${body}}\n</svg>\n`;
}

function makeRawSvg(viewBox, inner) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
}

async function rebuildIndex() {
	const entries = await readdir(ICONS_DIR, { withFileTypes: true });
	const names = entries
		.filter((entry) => entry.isFile() && entry.name.endsWith('.svelte'))
		.map((entry) => entry.name.replace(/\.svelte$/, ''))
		.sort((a, b) => a.localeCompare(b));

	const lines = names.map((name) => `export { default as ${name} } from './${name}.svelte';`);
	const content = lines.length ? `${lines.join('\n')}\n` : '';
	await writeIfChanged(INDEX_FILE, content);
}

export async function listIcons() {
	await ensureDirs();

	const entries = await readdir(ICONS_DIR, { withFileTypes: true });
	const names = entries
		.filter((entry) => entry.isFile() && entry.name.endsWith('.svelte'))
		.map((entry) => entry.name.replace(/\.svelte$/, ''))
		.sort((a, b) => a.localeCompare(b));

	const icons = [];
	for (const name of names) {
		const svg = (await readIfExists(path.resolve(RAW_DIR, `${name}.svg`))) || '';
		icons.push({ name, svg });
	}

	return icons;
}

export async function deleteIcon(name) {
	if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
		throw new Error('Некорректное имя иконки');
	}

	try {
		await unlink(path.resolve(ICONS_DIR, `${name}.svelte`));
	} catch {}

	try {
		await unlink(path.resolve(RAW_DIR, `${name}.svg`));
	} catch {}

	await rebuildIndex();
}

export async function clearIcons() {
	await ensureDirs();

	const iconEntries = await readdir(ICONS_DIR, { withFileTypes: true });
	for (const entry of iconEntries) {
		if (entry.isFile() && entry.name.endsWith('.svelte')) {
			await unlink(path.resolve(ICONS_DIR, entry.name));
		}
	}

	const rawEntries = await readdir(RAW_DIR, { withFileTypes: true });
	for (const entry of rawEntries) {
		if (entry.isFile() && entry.name.endsWith('.svg')) {
			await unlink(path.resolve(RAW_DIR, entry.name));
		}
	}

	await rebuildIndex();
}

export async function generateIcons(files, { mode = 'mono' } = {}) {
	await ensureDirs();

	const generated = [];
	const usedInBatch = new Set();

	for (const file of files) {
		if (!(file instanceof File) || !/\.svg$/i.test(file.name)) continue;

		const initialName = toComponentName(file.name);
		let name = initialName;
		let suffix = 2;
		while (usedInBatch.has(name)) {
			name = `${initialName}${suffix++}`;
		}
		usedInBatch.add(name);

		const raw = await file.text();
		const optimized = optimizeSvgPreservingGeometry(raw, name);

		const sanitized = sanitizeSvg(optimized);
		const { viewBox, inner } = extractSvg(sanitized);
		const finalInner = mode === 'mono' ? monoPaint(inner) : inner;

		const componentPath = path.resolve(ICONS_DIR, `${name}.svelte`);
		const rawPath = path.resolve(RAW_DIR, `${name}.svg`);
		const existedBefore = (await readIfExists(componentPath)) !== null;

		const componentChanged = await writeIfChanged(componentPath, makeSvelteComponent(viewBox, finalInner));
		const rawChanged = await writeIfChanged(rawPath, makeRawSvg(viewBox, finalInner));
		const changed = componentChanged || rawChanged;

		let status = 'unchanged';
		if (changed) status = existedBefore ? 'updated' : 'created';

		generated.push({ name, status, mode });
	}

	await rebuildIndex();
	return generated;
}
