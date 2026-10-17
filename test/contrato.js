// Pruebas que deben pasar con cualquier almacén (memoria o Neo4j).
import assert from 'node:assert/strict';
import { DATOS_EJEMPLO } from '../js/datos-ejemplo.js';
import { ErrorValidacion } from '../js/modelo.js';

const nicks = (lista) => lista.map((p) => p.nickname);

export function pruebasDeAlmacen(test, crear) {
  test('lista a las personas ordenadas por nombre', async () => {
    const a = await crear(DATOS_EJEMPLO);
    const personas = await a.personas();
    assert.equal(personas.length, 10);
    assert.equal(personas[0].nombre, 'Ana Torres');
  });

  test('el nickname no se repite, aunque venga con mayúsculas', async () => {
    const a = await crear(DATOS_EJEMPLO);
    await assert.rejects(
      a.agregarPersona({ nombre: 'Otra Ana', nickname: 'AnaT', email: 'otra@correo.ec', ciudad: 'Cuenca', pais: 'Ecuador' }),
      ErrorValidacion);
  });

  test('una relación no se duplica aunque se registre al revés', async () => {
    const a = await crear(DATOS_EJEMPLO);
    await assert.rejects(
      a.agregarRelacion({ desde: 'luisp', hasta: 'anat', tipo: 'laboral', frecuencia: 'semanal', importancia: 2 }),
      /ya está registrada/);
    // Con otro tipo sí se puede.
    const r = await a.agregarRelacion({ desde: 'luisp', hasta: 'anat', tipo: 'amistad', frecuencia: 'semanal', importancia: 2 });
    assert.equal(r.nombreDesde, 'Luis Pacheco');
  });

  test('no se relaciona a alguien que no existe', async () => {
    const a = await crear(DATOS_EJEMPLO);
    await assert.rejects(
      a.agregarRelacion({ desde: 'anat', hasta: 'nadie', tipo: 'amistad', frecuencia: 'semanal', importancia: 2 }),
      /No existe/);
  });

  test('las relaciones de una persona se ven desde los dos lados', async () => {
    const a = await crear(DATOS_EJEMPLO);
    const deJorge = await a.relacionesDe('jorgev');
    assert.deepEqual(nicks(deJorge.map((r) => r.persona)).sort(), ['anat', 'carlao', 'luisp']);
    assert.deepEqual(nicks((await a.relacionesDe('jorgev', 'amistad')).map((r) => r.persona)), ['luisp']);
  });

  test('contactos en común', async () => {
    const a = await crear(DATOS_EJEMPLO);
    assert.deepEqual(nicks(await a.enComun('anat', 'jorgev')), ['luisp']);
    assert.deepEqual(nicks(await a.enComun('anat', 'diegor')), []);
  });

  test('las más conectadas', async () => {
    const a = await crear(DATOS_EJEMPLO);
    const top = await a.masConectadas(2);
    assert.deepEqual(top.map((x) => [x.persona.nickname, x.cantidad]), [['anat', 3], ['jorgev', 3]]);
  });

  test('camino más corto entre dos grupos', async () => {
    const a = await crear(DATOS_EJEMPLO);
    const camino = await a.caminoMasCorto('luisp', 'msarmiento');
    // luisp - sofiaa - tomaso - elenac - msarmiento (4 saltos)
    assert.deepEqual(nicks(camino), ['luisp', 'sofiaa', 'tomaso', 'elenac', 'msarmiento']);
  });

  test('sin conexión no hay camino', async () => {
    const a = await crear(DATOS_EJEMPLO);
    await a.agregarPersona({ nombre: 'Isla Sola', nickname: 'isla', email: 'isla@correo.ec', ciudad: 'Galápagos', pais: 'Ecuador' });
    assert.equal(await a.caminoMasCorto('anat', 'isla'), null);
  });

  test('borrar a una persona borra sus relaciones', async () => {
    const a = await crear(DATOS_EJEMPLO);
    await a.eliminarPersona('jorgev');
    const relaciones = await a.relaciones();
    assert.equal(relaciones.length, 9);
    assert.ok(relaciones.every((r) => r.desde !== 'jorgev' && r.hasta !== 'jorgev'));
  });

  test('actualizar mantiene el nickname', async () => {
    const a = await crear(DATOS_EJEMPLO);
    await a.actualizarPersona('pedroq', { nombre: 'Pedro Quezada M.', email: 'pq@correo.ec', ciudad: 'Zamora', pais: 'Ecuador' });
    const pedro = (await a.personas()).find((p) => p.nickname === 'pedroq');
    assert.equal(pedro.ciudad, 'Zamora');
  });

  test('eliminar una relación', async () => {
    const a = await crear(DATOS_EJEMPLO);
    await a.eliminarRelacion('jorgev', 'luisp', 'amistad');
    assert.equal((await a.relaciones()).length, 11);
  });
}
