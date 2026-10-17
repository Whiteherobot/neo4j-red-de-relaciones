import { test } from 'node:test';
import assert from 'node:assert/strict';
import { persona, relacion, ErrorValidacion } from '../js/modelo.js';

test('limpia espacios y pasa el nickname y el correo a minúsculas', () => {
  const p = persona({ nombre: '  Ana   Torres ', nickname: '@AnaT', email: ' Ana@Correo.EC ', ciudad: 'Cuenca', pais: 'Ecuador' });
  assert.deepEqual(p, { nombre: 'Ana Torres', nickname: 'anat', email: 'ana@correo.ec', ciudad: 'Cuenca', pais: 'Ecuador' });
});

test('junta todos los errores de una persona', () => {
  assert.throws(() => persona({ nombre: '', nickname: 'a b', email: 'x', ciudad: '', pais: '' }), (e) => {
    assert.ok(e instanceof ErrorValidacion);
    assert.equal(e.errores.length, 5);
    return true;
  });
});

test('una relación necesita dos personas distintas', () => {
  assert.throws(() => relacion({ desde: 'ana', hasta: 'ANA', tipo: 'amistad', frecuencia: 'semanal', importancia: 3 }),
    /consigo misma/);
});

test('valida tipo, frecuencia e importancia', () => {
  const ok = relacion({ desde: 'ana', hasta: 'luis', tipo: 'Laboral', frecuencia: 'Diaria', importancia: '4' });
  assert.deepEqual(ok, { desde: 'ana', hasta: 'luis', tipo: 'laboral', frecuencia: 'diaria', importancia: 4 });

  assert.throws(() => relacion({ desde: 'ana', hasta: 'luis', tipo: 'vecinos', frecuencia: 'a veces', importancia: 9 }),
    (e) => e.errores.length === 3);
});
