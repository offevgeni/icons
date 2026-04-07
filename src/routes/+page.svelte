<script>
	import { onMount } from 'svelte';

	const THEME_KEY = 'icon-studio-theme';

	let theme = $state('light');
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

	let releaseStatusLoading = $state(false);
	let releaseStatus = $state(null);
	let releaseLoading = $state(false);
	let releaseResult = $state(null);
	let releaseLevel = $state('patch');
	let releasePush = $state(true);
	let npmTokenInput = $state('');
	let npmTokenSaving = $state(false);

	let toast = $state({
		show: false,
		type: 'success',
		text: ''
	});

	let fileInput = $state();

	let filteredIcons = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return icons;
		return icons.filter((icon) => icon.name.toLowerCase().includes(q));
	});

	let summary = $derived(result?.summary ?? null);
	let releaseNextVersion = $derived.by(() => {
		const version = releaseStatus?.effectiveBaseVersion || releaseStatus?.currentVersion;
		const match = String(version ?? '').match(/^(\d+)\.(\d+)\.(\d+)$/);
		if (!match) return 'n/a';

		const major = Number(match[1]);
		const minor = Number(match[2]);
		const patch = Number(match[3]);

		if (releaseLevel === 'major') return `${major + 1}.0.0`;
		if (releaseLevel === 'minor') return `${major}.${minor + 1}.0`;
		return `${major}.${minor}.${patch + 1}`;
	});

	let fileCount = $derived(files?.length ?? 0);

	function applyTheme(nextTheme, persist = true) {
		theme = nextTheme === 'dark' ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		if (persist) localStorage.setItem(THEME_KEY, theme);
	}

	function toggleTheme() {
		applyTheme(theme === 'dark' ? 'light' : 'dark');
	}

	function showToast(text, type = 'success') {
		toast = { show: true, text, type };
		setTimeout(() => {
			toast = { ...toast, show: false };
		}, 1900);
	}

	async function readJsonSafe(res) {
		const text = await res.text();
		try {
			return JSON.parse(text);
		} catch {
			throw new Error(`API вернул не JSON (HTTP ${res.status})`);
		}
	}

	function summaryText(value) {
		const created = Number(value?.created ?? 0);
		const updated = Number(value?.updated ?? 0);
		const unchanged = Number(value?.unchanged ?? 0);
		return `Создано: ${created}, обновлено: ${updated}, без изменений: ${unchanged}`;
	}

	async function refreshIcons() {
		try {
			const res = await fetch('/api/icons');
			const data = await readJsonSafe(res);
			if (!data.ok) throw new Error(data.error || 'Не удалось получить список иконок');
			icons = data.icons ?? [];
		} catch (error) {
			showToast(error?.message || 'Ошибка загрузки списка', 'error');
		}
	}

	async function refreshGitStatus() {
		gitStatusLoading = true;
		try {
			const res = await fetch('/api/git');
			const data = await readJsonSafe(res);
			if (!data.ok) throw new Error(data.error || 'Не удалось получить git-статус');
			gitStatus = data.status;
		} catch (error) {
			showToast(error?.message || 'Ошибка получения git-статуса', 'error');
		} finally {
			gitStatusLoading = false;
		}
	}

	async function refreshReleaseStatus() {
		releaseStatusLoading = true;
		try {
			const res = await fetch('/api/release');
			const data = await readJsonSafe(res);
			if (!data.ok) throw new Error(data.error || 'Не удалось получить release-статус');
			releaseStatus = data.status;
		} catch (error) {
			showToast(error?.message || 'Ошибка получения release-статуса', 'error');
		} finally {
			releaseStatusLoading = false;
		}
	}

	onMount(async () => {
		const savedTheme = localStorage.getItem(THEME_KEY);
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		if (savedTheme === 'light' || savedTheme === 'dark') {
			applyTheme(savedTheme, false);
		} else {
			applyTheme(prefersDark ? 'dark' : 'light', false);
		}

		await Promise.all([refreshIcons(), refreshGitStatus(), refreshReleaseStatus()]);
	});

	async function generate() {
		if (!files?.length) return;

		loading = true;
		result = null;

		try {
			const fd = new FormData();
			for (const file of Array.from(files)) fd.append('files', file);
			fd.append('mode', mode);

			const res = await fetch('/api/icons', { method: 'POST', body: fd });
			const data = await readJsonSafe(res);
			result = data;

			if (!data?.ok) throw new Error(data?.error || 'Ошибка генерации');

			icons = data.icons ?? [];
			files = null;
			if (fileInput) fileInput.value = '';
			showToast(summaryText(data.summary), 'success');
			await refreshGitStatus();
		} catch (error) {
			result = { ok: false, error: error?.message || 'Ошибка запроса' };
			showToast(error?.message || 'Ошибка запроса', 'error');
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
		} catch (error) {
			showToast(error?.message || 'Ошибка удаления', 'error');
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
		} catch (error) {
			showToast(error?.message || 'Ошибка очистки', 'error');
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
				showToast(`Commit создан: ${data.commitHash}`, 'info');
			}
		} catch (error) {
			showToast(error?.message || 'Ошибка публикации', 'error');
		} finally {
			publishLoading = false;
		}
	}

	async function publishNpmRelease() {
		releaseLoading = true;
		releaseResult = null;

		try {
			const res = await fetch('/api/release', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ level: releaseLevel, push: releasePush })
			});
			const data = await readJsonSafe(res);
			if (!data.ok) throw new Error(data.error || 'Ошибка релиза GitHub Packages');

			releaseResult = data;
			releaseStatus = data.status ?? releaseStatus;

			if (data.warnings?.length) {
				showToast(`Релиз ${data.nextVersion} опубликован с предупреждениями`, 'info');
			} else {
				showToast(`Релиз ${data.nextVersion} опубликован в GitHub Packages`, 'success');
			}

			await refreshGitStatus();
		} catch (error) {
			showToast(error?.message || 'Ошибка релиза GitHub Packages', 'error');
		} finally {
			releaseLoading = false;
		}
	}

	async function saveNpmToken() {
		if (!npmTokenInput.trim()) {
			showToast('Введите GitHub token', 'error');
			return;
		}

		npmTokenSaving = true;
		try {
			const res = await fetch('/api/release', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'set-token', token: npmTokenInput.trim() })
			});
			const data = await readJsonSafe(res);
			if (!data.ok) throw new Error(data.error || 'Не удалось сохранить GitHub token');

			releaseStatus = data.status ?? releaseStatus;
			npmTokenInput = '';
			showToast('GitHub token сохранен', 'success');
		} catch (error) {
			showToast(error?.message || 'Ошибка сохранения GitHub токена', 'error');
		} finally {
			npmTokenSaving = false;
		}
	}
</script>

<main class="page">
	<div class="app-shell">
		<header class="hero card">
			<div>
				<p class="hero-kicker">Personal Icon Pipeline</p>
				<h1>Icon Studio</h1>
				<p class="hero-text">Простой процесс: загрузили SVG, сгенерировали иконки, нажали публикацию в Git и релиз в GitHub Packages.</p>
			</div>

			<div class="hero-actions">
				<button class="btn btn-secondary" type="button" onclick={toggleTheme}>
					Тема: {theme === 'dark' ? 'Темная' : 'Светлая'}
				</button>
			</div>
		</header>

		<section class="status-row">
			<div class="status-chip"><span>Иконок</span><strong>{icons.length}</strong></div>
			<div class="status-chip"><span>Файлов выбрано</span><strong>{fileCount}</strong></div>
			<div class="status-chip"><span>Ветка</span><strong>{gitStatus?.branch || '...'}</strong></div>
			<div class="status-chip"><span>GitHub Packages</span><strong>{releaseStatus?.npmUser || 'нет авторизации'}</strong></div>
		</section>

		<section class="card section-card">
			<div class="section-head">
				<h2>1. Загрузка и генерация</h2>
				<p>Загрузите SVG из Illustrator и выберите режим цвета.</p>
			</div>

			<div class="panel">
				<input
					bind:this={fileInput}
					class="input-file"
					type="file"
					accept=".svg,image/svg+xml"
					multiple
					onchange={(event) => (files = event.currentTarget.files)}
				/>

				<div class="control-row">
					<label class="option-pill">
						<input type="radio" bind:group={mode} value="mono" />
						Monochrome (currentColor)
					</label>
					<label class="option-pill">
						<input type="radio" bind:group={mode} value="original" />
						Original colors
					</label>
				</div>

				<div class="control-row">
					<button class="btn btn-primary" type="button" onclick={generate} disabled={!files?.length || loading}>
						{loading ? 'Генерирую...' : 'Сгенерировать'}
					</button>
					<button class="btn btn-danger" type="button" onclick={clearAll} disabled={!icons.length || loading}>
						Очистить библиотеку
					</button>
				</div>
			</div>

			{#if summary}
				<p class="inline-note inline-note-success">{summaryText(summary)}</p>
			{/if}
		</section>

		<section class="grid-two">
			<article class="card section-card">
				<div class="section-head with-action">
					<div>
						<h2>2. Публикация в Git</h2>
						<p>Коммит и push только изменений библиотеки иконок.</p>
					</div>
					<button
						class="btn btn-secondary"
						type="button"
						onclick={refreshGitStatus}
						disabled={gitStatusLoading || publishLoading}
					>
						{gitStatusLoading ? 'Обновляю...' : 'Обновить'}
					</button>
				</div>

				<div class="meta-grid">
					<div><span>Upstream</span><strong>{gitStatus?.upstream || 'не настроен'}</strong></div>
					<div><span>Изменений в иконках</span><strong>{gitStatus?.iconChangesCount ?? 0}</strong></div>
					<div><span>Ahead</span><strong>{gitStatus?.ahead ?? 0}</strong></div>
					<div><span>Behind</span><strong>{gitStatus?.behind ?? 0}</strong></div>
				</div>

				{#if gitStatus?.iconChangesCount > 0}
					<div class="scroll-list">
						{#each gitStatus.iconChanges as file}
							<div>{file}</div>
						{/each}
					</div>
				{/if}

				<div class="stack">
					<input
						class="input"
						placeholder="Commit message (опционально)"
						bind:value={commitMessage}
					/>

					<label class="inline-check">
						<input type="checkbox" bind:checked={pushAfterCommit} />
						Сразу делать push
					</label>

					<button
						class="btn btn-accent"
						type="button"
						onclick={publishToGit}
						disabled={publishLoading || gitStatusLoading}
					>
						{publishLoading ? 'Публикую...' : 'Опубликовать в Git'}
					</button>
				</div>

				{#if publishResult}
					<div class="result-box">
						{#if publishResult.skipped}
							<div>{publishResult.message}</div>
						{:else}
							<div>Commit: <strong>{publishResult.commitHash}</strong></div>
							<div>{publishResult.commitMessage}</div>
							{#if publishResult.pushMessage}
								<div>{publishResult.pushMessage}</div>
							{/if}
						{/if}
					</div>
				{/if}
			</article>

			<article class="card section-card">
				<div class="section-head with-action">
					<div>
						<h2>3. Релиз в GitHub Packages</h2>
						<p>Выбор версии и публикация пакета кнопкой.</p>
					</div>
					<button
						class="btn btn-secondary"
						type="button"
						onclick={refreshReleaseStatus}
						disabled={releaseStatusLoading || releaseLoading}
					>
						{releaseStatusLoading ? 'Обновляю...' : 'Обновить'}
					</button>
				</div>

				<div class="meta-grid">
					<div><span>Пакет</span><strong>{releaseStatus?.packageName || '-'}</strong></div>
					<div><span>Локальная версия</span><strong>{releaseStatus?.currentVersion || '-'}</strong></div>
					<div><span>Последняя версия</span><strong>{releaseStatus?.latestPublishedVersion || '-'}</strong></div>
					<div><span>GitHub user</span><strong>{releaseStatus?.npmUser || 'не авторизован'}</strong></div>
				</div>

				{#if releaseStatus?.localVersionBehindPublished}
					<div class="token-box">
						<p>
							Локальная версия ниже опубликованной ({releaseStatus.currentVersion} меньше чем {releaseStatus.latestPublishedVersion}).
							Релиз будет считаться от {releaseStatus.effectiveBaseVersion}.
						</p>
					</div>
				{/if}

				{#if releaseStatus && !releaseStatus.npmReady}
					<div class="token-box">
						<p>Вставьте GitHub token (scope: read:packages, write:packages) для публикации релизов.</p>
						<div class="token-row">
							<input
								class="input"
								placeholder="GitHub token (ghp_... или github_pat_...)"
								bind:value={npmTokenInput}
							/>
							<button class="btn btn-warning" type="button" onclick={saveNpmToken} disabled={npmTokenSaving}>
								{npmTokenSaving ? 'Сохраняю...' : 'Сохранить токен'}
							</button>
						</div>
					</div>
				{/if}

				<div class="panel">
					<div class="control-row">
						<label class="option-pill">
							<input type="radio" bind:group={releaseLevel} value="patch" />
							patch
						</label>
						<label class="option-pill">
							<input type="radio" bind:group={releaseLevel} value="minor" />
							minor
						</label>
						<label class="option-pill">
							<input type="radio" bind:group={releaseLevel} value="major" />
							major
						</label>
					</div>

					<p class="inline-note">Следующая версия: <strong>{releaseNextVersion}</strong></p>

					<label class="inline-check">
						<input type="checkbox" bind:checked={releasePush} />
						Push commit и tag после публикации
					</label>

					<button
						class="btn btn-release"
						type="button"
						onclick={publishNpmRelease}
						disabled={releaseLoading || releaseStatusLoading || !releaseStatus?.npmReady}
					>
						{releaseLoading ? 'Публикую в GitHub Packages...' : 'Опубликовать релиз в GitHub Packages'}
					</button>
				</div>

				{#if releaseResult}
					<div class="result-box">
						<div>
							Релиз: <strong>{releaseResult.currentVersion} -> {releaseResult.nextVersion}</strong>
						</div>
						{#if releaseResult.baseVersion && releaseResult.baseVersion !== releaseResult.currentVersion}
							<div>База версии для bump: {releaseResult.baseVersion}</div>
						{/if}
						{#if releaseResult.tagName}
							<div>Tag: {releaseResult.tagName}</div>
						{/if}
						{#if releaseResult.commitHash}
							<div>Commit: {releaseResult.commitHash}</div>
						{/if}
						{#if releaseResult.warnings?.length}
							{#each releaseResult.warnings as warning}
								<div class="warn-text">{warning}</div>
							{/each}
						{/if}
					</div>
				{/if}
			</article>
		</section>

		<section class="card section-card">
			<div class="section-head with-action">
				<div>
					<h2>4. Библиотека иконок</h2>
					<p>Поиск, предпросмотр, копирование импорта и удаление.</p>
				</div>
				<div class="library-count">Найдено: {filteredIcons.length}</div>
			</div>

			<input class="input" placeholder="Поиск по имени иконки..." bind:value={query} />

			{#if !filteredIcons.length}
				<p class="empty-note">Иконки не найдены. Загрузите SVG, чтобы собрать библиотеку.</p>
			{:else}
				<div class="icons-grid">
					{#each filteredIcons as icon}
						<article class="icon-card">
							<div class="icon-preview">{@html icon.svg}</div>
							<div class="icon-name">{icon.name}</div>
							<div class="icon-import">{`import { ${icon.name} } from '@offevgeni/icons';`}</div>

							<div class="icon-actions">
								<button class="btn btn-secondary" type="button" onclick={() => copyImport(icon.name)}>
									{copied === icon.name ? 'Скопировано' : 'Копировать'}
								</button>
								<button class="btn btn-danger" type="button" onclick={() => removeIcon(icon.name)}>
									Удалить
								</button>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>

		{#if result}
			<details class="card section-card debug-block">
				<summary>Технический ответ API</summary>
				<pre>{JSON.stringify(result, null, 2)}</pre>
			</details>
		{/if}
	</div>

	{#if toast.show}
		<div class="toast-wrap">
			<div class={`toast toast-${toast.type}`}>{toast.text}</div>
		</div>
	{/if}
</main>
