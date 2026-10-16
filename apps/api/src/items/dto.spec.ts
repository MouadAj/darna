import {ValidationPipe, BadRequestException} from '@nestjs/common';
import {CreateItemDto, UpdateItemDto} from './dto.js';

const pipe = new ValidationPipe({whitelist: true, forbidNonWhitelisted: true, transform: true});
const parse = (body: unknown, create = false) => pipe.transform(body, {type: 'body', metatype: create ? CreateItemDto : UpdateItemDto});
describe('Item details validation', () => {
  it('trims flexible text and treats blank text and null as clearing', async () => {
    expect(await parse({quantity: '  2 bottles  ', notes: '  keep cold\nplease  '})).toMatchObject({quantity: '2 bottles', notes: 'keep cold\nplease'});
    expect(await parse({quantity: '  ', notes: null})).toMatchObject({quantity: null, notes: null});
  });
  it('preserves omission for older clients', async () => {
    const dto = await parse({status: 'NEEDED'});
    expect(dto.quantity).toBeUndefined(); expect(dto.notes).toBeUndefined();
    await expect(parse({name: 'Milk', visualKey: 'milk'}, true)).resolves.toBeInstanceOf(CreateItemDto);
  });
  it.each([['quantity', 60], ['notes', 500]] as const)('enforces %s length for create and update', async (field, limit) => {
    for (const create of [true, false]) {
      const base = create ? {name: 'Milk', visualKey: 'milk'} : {};
      await expect(parse({...base, [field]: 'x'.repeat(limit)}, create)).resolves.toBeDefined();
      await expect(parse({...base, [field]: 'x'.repeat(limit + 1)}, create)).rejects.toBeInstanceOf(BadRequestException);
      await expect(parse({...base, [field]: 123}, create)).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});
