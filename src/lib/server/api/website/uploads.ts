import { db, pool, redis, BelcodaError, filterQuery } from '$lib/server';
import { parse } from '$lib/schema/valibot';
import * as m from '$lib/paraglide/messages';
import * as schema from '$lib/schema/website/uploads';

function redisString(instanceId: number, uploadId: number | 'all') {
	return `i:${instanceId}:uploads:${uploadId}`;
}

export async function create({
	instanceId,
	body
}: {
	instanceId: number;
	body: schema.Create;
}): Promise<schema.Read> {
	const parsed = parse(schema.create, body);
	const result = await db
		.insert('website.uploads', { instance_id: instanceId, ...parsed })
		.run(pool);
	const parsedResult = parse(schema.read, result);
	await redis.del(redisString(instanceId, 'all'));
	await redis.set(redisString(instanceId, parsedResult.id), parsedResult);
	return parsedResult;
}

export async function read({
	instanceId,
	uploadId,
	includeDeleted = false
}: {
	instanceId: number;
	uploadId: number;
	includeDeleted?: boolean;
}): Promise<schema.Read> {
	const cached = await redis.get(redisString(instanceId, uploadId));
	if (cached) {
		return parse(schema.read, cached);
	}
	const result = await db
		.selectExactlyOne('website.uploads', {
			instance_id: instanceId,
			id: uploadId,
			...(includeDeleted ? {} : { deleted_at: db.conditions.isNull })
		})
		.run(pool)
		.catch((err) => {
			throw new BelcodaError(404, 'DATA:WEBSITE:UPLOADS:READ:01', m.pretty_tired_fly_lead(), err);
		});
	const parsedResult = parse(schema.read, result);
	await redis.set(redisString(instanceId, uploadId), parsedResult);
	return parsedResult;
}

export async function list({
	instanceId,
	url,
	includeDeleted = false
}: {
	instanceId: number;
	url: URL;
	includeDeleted?: boolean;
}): Promise<schema.List> {
	const filter = filterQuery(url);
	if (!includeDeleted && filter.filtered !== true) {
		const cached = await redis.get(redisString(instanceId, 'all'));
		if (cached) {
			return parse(schema.list, cached);
		}
	}
	const where = {
		...filter.where,
		...(includeDeleted ? {} : { deleted_at: db.conditions.isNull })
	};
	const result = await db
		.select(
			'website.uploads',
			{ instance_id: instanceId, ...where },
			{
				offset: filter.options.offset,
				limit: filter.options.limit,
				order: { by: 'created_at', direction: 'DESC' }
			}
		)
		.run(pool);

	const count = await db.count('website.uploads', { instance_id: instanceId, ...where }).run(pool);
	const parsedResult = parse(schema.list, { count: count, items: result });
	await redis.set(redisString(instanceId, 'all'), parsedResult);
	return parsedResult;
}

export async function del({
	instanceId,
	uploadId
}: {
	instanceId: number;
	uploadId: number;
}): Promise<void> {
	await db
		.update(
			'website.uploads',
			{ deleted_at: new Date() },
			{ instance_id: instanceId, id: uploadId }
		)
		.run(pool)
		.catch((err) => {
			throw new BelcodaError(404, 'DATA:WEBSITE:UPLOADS:DEL:01', m.pretty_tired_fly_lead(), err);
		});
	await redis.del(redisString(instanceId, uploadId));
	await redis.del(redisString(instanceId, 'all'));
}
