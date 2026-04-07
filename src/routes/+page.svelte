<script>
	import { onMount } from 'svelte';

	let files = $state(null);
	let mode = $state('mono');
	let loading = $state(false);
	let result = $state(null);
	let icons = $state([]);

	let query = $state('');
	let copied = $state('');

	let gitStatusLoading = $state(false);
	let gitStatus = $state(null);
	let publishLoading = $state(false);
	let publishResult = $state(null);
	let commitMessage = $state('');
	let pushAfterCommit = $state(true);

	let toast = $state({
		show: false,
		type: 'success', // success | error | info
		text: ''
	});

	let fileInput = $state();

	let filteredIcons = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return icons;
		return icons.filter((i) => i.name.toLowerCase().includes(q));
	});

	function showToast(text, type = 'success') {
		toast = { show: true, text, type };
		setTimeout(() => {
			toast = { ...toast, show: false };
		}, 1800);
	}

	async function readJsonSafe(res) {
		const text = await res.text();
		try {
			return JSON.parse(text);
		} catch {
			throw new Error(`API вернул не JSON (HTTP ${res.status})`);
		}
	}

	async function refreshIcons() {
		try {
			const res = await fetch('/api/icons');
			const data = await readJsonSafe(res);
			if (data.ok) {
				icons = data.icons ?? [];
			} else {
				showToast(data.error || 'Не удалось получить список иконок', 'error');
			}
		} catch (e) {
			showToast(e?.message || 'Ошибка загрузки списка', 'error');
		}
	}

	async function refreshGitStatus() {
		gitStatusLoading = true;
		try {
			const res = await fetch('/api/git');
			const data = await readJsonSafe(res);
			if (!data.ok) throw new Error(data.error || 'Не удалось получить git-статус');
			gitStatus = data.status;
		} catch (e) {
			showToast(e?.message || 'Ошибка получения git-статуса', 'error');
		} finally {
			gitStatusLoading = false;
		}
	}

	onMount(async () => {
		await Promise.all([refreshIcons(), refreshGitStatus()]);
	});

	function summaryText(summary) {
		const created = Number(summary?.created ?? 0);
		const updated = Number(summary?.updated ?? 0);
		const unchanged = Number(summary?.unchanged ?? 0);
		return `Создано: ${created}, обновлено: ${updated}, без изменений: ${unchanged}`;
	}

	async function generate() {
		if (!files?.length) return;

		loading = true;
		result = null;

		try {
			const fd = new FormData();
			for (const f of Array.from(files)) fd.append('files', f);
			fd.append('mode', mode);

			const res = await fetch('/api/icons', { method: 'POST', body: fd });
			const data = await readJsonSafe(res);
			result = data;

			if (data?.ok) {
				icons = data.icons ?? [];
				files = null;
				if (fileInput) fileInput.value = '';
				showToast(summaryText(data.summary), 'success');
				await refreshGitStatus();
			} else {
				showToast(data?.error || 'Ошибка генерации', 'error');
			}
		} catch (e) {
			result = { ok: false, error: e?.message || 'Ошибка запроса' };
			showToast(e?.message || 'Ошибка запроса', 'error');
		} finally {
			loading = false;
		}
	}

	async function removeIcon(name) {
		try {
			const res = await fetch(`/api/icons?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
			const data = await readJsonSafe(res);
			if (!data.ok) throw new Error(data.error || 'Ошибка удаления');

			await Promise.all([refreshIcons(), refreshGitStatus()]);
			showToast(`Удалено: ${name}`, 'info');
		} catch (e) {
			showToast(e?.message || 'Ошибка удаления', 'error');
		}
	}

	async function clearAll() {
		if (!confirm('Удалить все сгенерированные иконки?')) return;

		try {
			const res = await fetch('/api/icons', { method: 'DELETE' });
			const data = await readJsonSafe(res);
			if (!data.ok) throw new Error(data.error || 'Ошибка очистки');

			await Promise.all([refreshIcons(), refreshGitStatus()]);
			showToast('Библиотека очищена', 'info');
		} catch (e) {
			showToast(e?.message || 'Ошибка очистки', 'error');
		}
	}

	async function copyImport(name) {
		const text = `import { ${name} } from '@offevgeni/icons';`;
		try {
			await navigator.clipboard.writeText(text);
			copied = name;
			showToast(`Скопировано: ${name}`, 'success');
			setTimeout(() => (copied = ''), 1200);
		} catch {
			showToast('Не удалось скопировать в буфер обмена', 'error');
		}
	}

	async function publishToGit() {
		publishLoading = true;
		publishResult = null;

		try {
			const res = await fetch('/api/git', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ message: commitMessage, push: pushAfterCommit })
			});
			const data = await readJsonSafe(res);
			if (!data.ok) throw new Error(data.error || 'Ошибка публикации');

			publishResult = data;
			gitStatus = data.status ?? gitStatus;

			if (data.skipped) {
				showToast(data.message || 'Изменений для публикации нет', 'info');
			} else if (data.pushed) {
				showToast(`Опубликовано: ${data.commitHash}`, 'success');
				commitMessage = '';
			} else {
				showToast(`Commit создан: ${data.commitHash}. Push: проверьте статус`, 'info');
			}
		} catch (e) {
			showToast(e?.message || 'Ошибка публикации', 'error');
		} finally {
			publishLoading = false;
		}
	}
</script>

<main class="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
	<div class="mx-auto max-w-6xl space-y-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h1 class="text-3xl font-bold">Icon Studio</h1>
			<div class="text-sm text-slate-300">
				Всего иконок: <span class="font-semibold">{icons.length}</span>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
			<div class="text-sm text-slate-300">
				Загрузите SVG-файлы, экспортированные из Adobe Illustrator, и выберите режим цвета.
			</div>

			<input
				bind:this={fileInput}
				class="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-500"
				type="file"
				accept=".svg,image/svg+xml"
				multiple
				onchange={(e) => (files = e.currentTarget.files)}
			/>

			<div class="flex flex-wrap gap-6 text-sm">
				<label class="flex items-center gap-2">
					<input type="radio" bind:group={mode} value="mono" />
					Monochrome (`currentColor`)
				</label>

				<label class="flex items-center gap-2">
					<input type="radio" bind:group={mode} value="original" />
					Original colors
				</label>
			</div>

			<div class="flex flex-wrap gap-3">
				<button
					class="rounded-xl bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
					onclick={generate}
					disabled={!files?.length || loading}
				>
					{loading ? 'Генерирую...' : 'Сгенерировать'}
				</button>

				<button
					class="rounded-xl bg-rose-700 px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
					onclick={clearAll}
					disabled={!icons.length || loading}
				>
					Очистить всё
				</button>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-lg font-semibold">Git публикация</h2>
				<button
					class="rounded-lg bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700 disabled:opacity-50"
					onclick={refreshGitStatus}
					disabled={gitStatusLoading || publishLoading}
				>
					{gitStatusLoading ? 'Обновляю...' : 'Обновить статус'}
				</button>
			</div>

			{#if gitStatus}
				<div class="grid gap-2 text-sm md:grid-cols-2">
					<div>Ветка: <span class="font-semibold">{gitStatus.branch}</span></div>
					<div>
						Upstream:
						<span class="font-semibold">{gitStatus.upstream || 'не настроен'}</span>
					</div>
					<div>
						Изменений в иконках:
						<span class="font-semibold">{gitStatus.iconChangesCount}</span>
					</div>
					<div>
						Ahead/Behind:
						<span class="font-semibold">{gitStatus.ahead}/{gitStatus.behind}</span>
					</div>
				</div>

				{#if gitStatus.iconChangesCount > 0}
					<div class="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 max-h-32 overflow-auto">
						{#each gitStatus.iconChanges as file}
							<div>{file}</div>
						{/each}
					</div>
				{/if}
			{:else}
				<p class="text-sm text-slate-400">Статус Git еще не загружен.</p>
			{/if}

			<div class="space-y-3">
				<input
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
					placeholder="Commit message (опционально)"
					bind:value={commitMessage}
				/>

				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={pushAfterCommit} />
					Сразу сделать push после commit
				</label>

				<button
					class="rounded-xl bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
					onclick={publishToGit}
					disabled={publishLoading || gitStatusLoading}
				>
					{publishLoading ? 'Публикую...' : 'Опубликовать в Git'}
				</button>
			</div>

			{#if publishResult}
				<div class="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 space-y-2">
					{#if publishResult.skipped}
						<div>{publishResult.message}</div>
					{:else}
						<div>Commit: <span class="font-semibold">{publishResult.commitHash}</span></div>
						<div>{publishResult.commitMessage}</div>
						{#if publishResult.pushMessage}
							<div>{publishResult.pushMessage}</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
			<div class="mb-4 flex items-center justify-between gap-3">
				<h2 class="text-lg font-semibold">Библиотека</h2>
				<div class="text-xs text-slate-400">Найдено: {filteredIcons.length}</div>
			</div>

			<input
				class="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
				placeholder="Поиск иконки по имени..."
				bind:value={query}
			/>

			{#if !filteredIcons.length}
				<p class="text-slate-400 text-sm">Ничего не найдено (или библиотека пока пустая).</p>
			{:else}
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
					{#each filteredIcons as icon}
						<div class="rounded-xl border border-slate-800 p-3 bg-slate-950">
							<div class="h-16 rounded-lg bg-slate-800 text-indigo-300 flex items-center justify-center [&_svg]:w-10 [&_svg]:h-10">
								{@html icon.svg}
							</div>

							<div class="mt-2 text-xs truncate font-medium">{icon.name}</div>
							<div class="mt-1 text-[10px] text-slate-400 truncate">
								{`import { ${icon.name} } from '@offevgeni/icons';`}
							</div>

							<div class="mt-2 flex gap-2">
								<button
									class="w-full rounded-lg bg-indigo-700 py-1 text-xs hover:bg-indigo-600"
									onclick={() => copyImport(icon.name)}
								>
									{copied === icon.name ? 'Скопировано ✓' : 'Копировать импорт'}
								</button>

								<button
									class="w-full rounded-lg bg-slate-800 py-1 text-xs hover:bg-slate-700"
									onclick={() => removeIcon(icon.name)}
								>
									Удалить
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		{#if result}
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
				<h2 class="mb-3 text-lg font-semibold">Последняя генерация</h2>
				{#if result.summary}
					<div class="mb-3 text-sm text-slate-300">{summaryText(result.summary)}</div>
				{/if}
				<pre class="text-xs text-slate-200 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
			</div>
		{/if}
	</div>

	{#if toast.show}
		<div class="fixed right-4 top-4 z-50">
			<div
				class={`rounded-xl px-4 py-2 text-sm shadow-lg border ${
					toast.type === 'error'
						? 'bg-rose-900/90 border-rose-700 text-rose-100'
						: toast.type === 'info'
							? 'bg-sky-900/90 border-sky-700 text-sky-100'
							: 'bg-emerald-900/90 border-emerald-700 text-emerald-100'
				}`}
			>
				{toast.text}
			</div>
		</div>
	{/if}
</main>
