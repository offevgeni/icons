import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { getGitStatus } from './git-publisher.js';

const execFileAsync = promisify(execFile);
const PACKAGE_JSON = path.resolve(process.cwd(), 'package.json');
const GITHUB_SCOPE = '@offevgeni';
const GITHUB_REGISTRY = 'https://npm.pkg.github.com/';
const NPM_CACHE_DIR = path.resolve(process.cwd(), '.npm-cache');

function parseSemver(version) {
	const match = String(version ?? '').match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) return null;
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3])
	};
}

function compareSemver(a, b) {
	const av = parseSemver(a);
	const bv = parseSemver(b);
	if (!av || !bv) return 0;
	if (av.major !== bv.major) return av.major - bv.major;
	if (av.minor !== bv.minor) return av.minor - bv.minor;
	return av.patch - bv.patch;
}

function trimText(value) {
	return String(value ?? '').trim();
}

function errorMessage(error) {
	const stderr = trimText(error?.stderr);
	if (stderr) return stderr;
	const stdout = trimText(error?.stdout);
	if (stdout) return stdout;
	return trimText(error?.message) || 'Command failed';
}

async function runCmd(bin, args, { allowFailure = false } = {}) {
	try {
		const { stdout, stderr } = await execFileAsync(bin, args, {
			cwd: process.cwd(),
			env: {
				...process.env,
				NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || NPM_CACHE_DIR
			},
			maxBuffer: 10 * 1024 * 1024
		});

		return {
			ok: true,
			stdout: trimText(stdout),
			stderr: trimText(stderr)
		};
	} catch (error) {
		if (allowFailure) {
			return {
				ok: false,
				stdout: trimText(error?.stdout),
				stderr: trimText(error?.stderr),
				message: errorMessage(error),
				code: error?.code ?? 1
			};
		}
		throw new Error(errorMessage(error));
	}
}

function bumpVersion(version, level) {
	const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) throw new Error(`Некорректная версия в package.json: ${version}`);

	const major = Number(match[1]);
	const minor = Number(match[2]);
	const patch = Number(match[3]);

	if (level === 'major') return `${major + 1}.0.0`;
	if (level === 'minor') return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

async function readPackageMeta() {
	const raw = await readFile(PACKAGE_JSON, 'utf8');
	const pkg = JSON.parse(raw);
	return {
		name: pkg.name,
		version: pkg.version
	};
}

export async function getReleaseStatus() {
	const pkg = await readPackageMeta();
	const git = await getGitStatus();

	const scopeRegistryRes = await runCmd('npm', ['config', 'get', `${GITHUB_SCOPE}:registry`], {
		allowFailure: true
	});
	const npmUserRes = await runCmd('npm', ['whoami', '--registry', GITHUB_REGISTRY], { allowFailure: true });

	const registry = scopeRegistryRes.ok ? scopeRegistryRes.stdout || GITHUB_REGISTRY : GITHUB_REGISTRY;
	const npmUser = npmUserRes.ok ? npmUserRes.stdout : null;

	const latestPublishedRes = await runCmd('npm', ['view', pkg.name, 'version', '--registry', GITHUB_REGISTRY], {
		allowFailure: true
	});
	const latestPublishedVersion = latestPublishedRes.ok ? latestPublishedRes.stdout : null;

	const localVersion = pkg.version;
	const effectiveBaseVersion =
		latestPublishedVersion && compareSemver(localVersion, latestPublishedVersion) < 0
			? latestPublishedVersion
			: localVersion;

	return {
		packageName: pkg.name,
		currentVersion: localVersion,
		effectiveBaseVersion,
		registry,
		npmUser,
		npmReady: Boolean(npmUser),
		latestPublishedVersion,
		localVersionBehindPublished:
			Boolean(latestPublishedVersion) && compareSemver(localVersion, latestPublishedVersion) < 0,
		git
	};
}

export async function releaseToGithubPackages({ level = 'patch', push = true } = {}) {
	if (!['patch', 'minor', 'major'].includes(level)) {
		throw new Error('Допустимые уровни релиза: patch, minor, major');
	}

	const statusBefore = await getReleaseStatus();
	if (!statusBefore.npmReady) {
		throw new Error('GitHub Packages не авторизован. Сохраните GitHub token в UI.');
	}

	const currentVersion = statusBefore.currentVersion;
	const baseVersion = statusBefore.effectiveBaseVersion || currentVersion;
	const nextVersion = bumpVersion(baseVersion, level);
	const tagName = `v${nextVersion}`;

	const result = {
		ok: true,
		level,
		currentVersion,
		baseVersion,
		nextVersion,
		tagName,
		published: false,
		commitHash: '',
		pushed: false,
		warnings: []
	};

	try {
		await runCmd('npm', ['version', nextVersion, '--no-git-tag-version']);
		await runCmd('npm', ['run', 'build']);
		await runCmd('npm', ['publish', '--registry', GITHUB_REGISTRY]);
		result.published = true;
	} catch (error) {
		await runCmd('npm', ['version', currentVersion, '--no-git-tag-version', '--allow-same-version'], {
			allowFailure: true
		});
		throw new Error(`Публикация в GitHub Packages не удалась: ${error instanceof Error ? error.message : String(error)}`);
	}

	await runCmd('git', ['add', '--', 'package.json', 'package-lock.json']);

	const commitRes = await runCmd(
		'git',
		['commit', '-m', `release: ${tagName}`, '--', 'package.json', 'package-lock.json'],
		{ allowFailure: true }
	);

	if (!commitRes.ok) {
		result.warnings.push(`Не удалось создать commit релиза: ${commitRes.message}`);
	} else {
		const hashRes = await runCmd('git', ['rev-parse', '--short', 'HEAD'], { allowFailure: true });
		result.commitHash = hashRes.ok ? hashRes.stdout : '';
	}

	const tagRes = await runCmd('git', ['tag', tagName], { allowFailure: true });
	if (!tagRes.ok) {
		result.warnings.push(`Не удалось создать git tag ${tagName}: ${tagRes.message}`);
	}

	if (push) {
		const pushMainRes = await runCmd('git', ['push'], { allowFailure: true });
		const pushTagRes = await runCmd('git', ['push', 'origin', tagName], { allowFailure: true });

		result.pushed = pushMainRes.ok && pushTagRes.ok;
		if (!pushMainRes.ok) result.warnings.push(`Push ветки не удался: ${pushMainRes.message}`);
		if (!pushTagRes.ok) result.warnings.push(`Push тега не удался: ${pushTagRes.message}`);
	}

	result.status = await getReleaseStatus();
	return result;
}

export async function configureGithubToken(token) {
	const value = trimText(token);
	if (!value || value.length < 10) {
		throw new Error('GitHub token выглядит некорректно');
	}

	await runCmd('npm', ['config', 'set', `${GITHUB_SCOPE}:registry`, GITHUB_REGISTRY, '--location=user']);
	await runCmd('npm', ['config', 'set', '//npm.pkg.github.com/:_authToken', value, '--location=user']);

	const whoamiRes = await runCmd('npm', ['whoami', '--registry', GITHUB_REGISTRY], { allowFailure: true });
	return {
		ok: whoamiRes.ok,
		npmUser: whoamiRes.ok ? whoamiRes.stdout : null,
		message: whoamiRes.ok
			? 'GitHub token сохранен, авторизация для GitHub Packages активна'
			: whoamiRes.message
	};
}
