// Corre las mismas pruebas de contrato contra un Neo4j real. Se activa con
// NEO4J_URL (y NEO4J_USUARIO / NEO4J_CLAVE). Borra todos los nodos :Person.
import { test, after } from 'node:test';
import neo4j from 'neo4j-driver';
import { AlmacenNeo4j } from '../js/almacen-neo4j.js';
import { pruebasDeAlmacen } from './contrato.js';

const url = process.env.NEO4J_URL;

if (!url) {
  test('pruebas contra Neo4j', { skip: 'defina NEO4J_URL para correrlas' }, () => {});
} else {
  const almacen = await AlmacenNeo4j.conectar(neo4j, url,
    process.env.NEO4J_USUARIO ?? 'neo4j', process.env.NEO4J_CLAVE ?? 'redrelaciones2026');
  after(() => almacen.cerrar());

  pruebasDeAlmacen(test, async (datos) => {
    await almacen.reemplazarTodo(datos);
    return almacen;
  });
}
