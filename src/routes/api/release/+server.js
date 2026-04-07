import { json } from '@sveltejs/kit';
import { configureGithubToken, getReleaseStatus, releaseToGithubPackages } from '$lib/server/release-manager.js';

export async function GET() {
	try {
		const status = await getReleaseStatus();
		return json({ ok: true, status });
	} catch (error) {
		return json(
			{ ok: false, error: error instanceof Error ? error.message : 'Ошибка получения release-статуса' },
			{ status: 500 }
		);
	}
}

export async function POST({ request }) {
	let payload = {};
	try {
		payload = await request.json();
	} catch {
		payload = {};
	}

	if (payload.action === 'set-token') {
		const token = typeof payload.token === 'string' ? payload.token : '';
		try {
			const result = await configureGithubToken(token);
			const status = await getReleaseStatus();
			return json({ ok: true, ...result, status });
		} catch (error) {
			return json(
				{ ok: false, error: error instanceof Error ? error.message : 'Ошибка сохранения GitHub токена' },
				{ status: 500 }
			);
		}
	}

	const level = typeof payload.level === 'string' ? payload.level : 'patch';
	const push = payload.push !== false;

	try {
		const result = await releaseToGithubPackages({ level, push });
		return json({ ok: true, ...result });
	} catch (error) {
		return json(
			{ ok: false, error: error instanceof Error ? error.message : 'Ошибка релиза GitHub Packages' },
			{ status: 500 }
		);
	}
}
