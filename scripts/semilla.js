// Carga los datos de ejemplo en Neo4j (borra los nodos :Person que haya).
// Uso: npm run semilla   (variables NEO4J_URL, NEO4J_USUARIO, NEO4J_CLAVE)
import neo4j from 'neo4j-driver';
import { AlmacenNeo4j } from '../js/almacen-neo4j.js';
import { DATOS_EJEMPLO } from '../js/datos-ejemplo.js';

const almacen = await AlmacenNeo4j.conectar(neo4j,
  process.env.NEO4J_URL ?? 'bolt://localhost:7687',
  process.env.NEO4J_USUARIO ?? 'neo4j',
  process.env.NEO4J_CLAVE ?? 'redrelaciones2026');
await almacen.reemplazarTodo(DATOS_EJEMPLO);
console.log(`Cargadas ${DATOS_EJEMPLO.personas.length} personas y ${DATOS_EJEMPLO.relaciones.length} relaciones.`);
await almacen.cerrar();
