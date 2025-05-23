import { json, error, pino } from '$lib/server';
import { filterGroup } from '$lib/schema/people/filters/filters';
import { parse } from '$lib/schema/valibot';
import { create } from '$lib/server/api/people/lists';
import * as m from '$lib/paraglide/messages';
const log = pino(import.meta.url);
import { generateUniqueString } from '$lib/utils/text/random';
export async function PUT(event) {
	try {
		const body = await event.request.json();
		const date = new Date();
		const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
		const list = await create({
			instanceId: event.locals.instance.id,
			body: {
				name: m.lazy_happy_bullock_cry({ dateString, randomString: generateUniqueString() })
			}
		});
		const parsed = parse(filterGroup, body);
		await event.locals.queue(
			'/core/people/create_list_from_filter',
			event.locals.instance.id,
			{ filter: parsed, list_id: list.id },
			event.locals.admin.id
		);
		return json({ success: true });
	} catch (err) {
		return error(
			500,
			'API:/api/v1/people/[person_id]/filters/+server.ts',
			m.spry_ago_baboon_cure(),
			err
		);
	}
}
