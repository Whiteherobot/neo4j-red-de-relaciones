import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlmacenMemoria } from '../js/almacen-memoria.js';
import { DATOS_EJEMPLO } from '../js/datos-ejemplo.js';
import { pruebasDeAlmacen } from './contrato.js';

pruebasDeAlmacen(test, async (datos) => new AlmacenMemoria({ datos }));

test('guarda y recupera desde el storage del navegador', async () => {
  const memoria = new Map();
  const storage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) };

  const a = new AlmacenMemoria({ datos: DATOS_EJEMPLO, storage });
  await a.eliminarPersona('diegor');

  const b = new AlmacenMemoria({ datos: DATOS_EJEMPLO, storage });
  assert.equal((await b.personas()).length, 9);
});

test('no modifica los datos de ejemplo originales', async () => {
  const a = new AlmacenMemoria({ datos: DATOS_EJEMPLO });
  await a.eliminarPersona('anat');
  assert.equal(DATOS_EJEMPLO.personas.length, 10);
});
