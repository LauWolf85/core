import { valibot, superValidate, formAction, redirect } from '$lib/server';
import { update, read } from '$lib/schema/core/instance';
import { parse } from '$lib/schema/valibot';
import { Localization } from '$lib/i18n';

export async function load(event) {
	const form = await superValidate(event.locals.instance, valibot(update));
	return { form };
}

export const actions = {
	default: async function (event) {
		const output = await formAction({
			event,
			url: '/api/v1/settings/language',
			method: 'PUT',
			inputSchema: update
		});
		if (output.error) return output.output;
		const parsed = parse(read, output.output);
		event.locals.instance = parsed;
		event.locals.language = parsed.language;
		event.locals.t = new Localization(event.locals.language);
		return redirect(event, {
			message: event.locals.t.forms.actions.success()
		});
	}
};
