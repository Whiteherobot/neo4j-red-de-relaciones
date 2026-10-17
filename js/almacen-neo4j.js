// Almacén sobre Neo4j. Conserva el esquema del proyecto original:
// (:Person {name, nickname, email, city, country})-[:RELATIONSHIP {type, frequency, importance}]->(:Person)
// Las relaciones se guardan con una dirección pero se consultan en ambas.
// Recibe el módulo del driver (window.neo4j en el navegador, el paquete npm en Node).

import { persona as validarPersona, relacion as validarRelacion, ErrorValidacion } from './modelo.js';

const MAXIMO_SALTOS = 6;

const aPersona = (n) => ({
  nombre: n.name, nickname: n.nickname, email: n.email, ciudad: n.city, pais: n.country
});

export class AlmacenNeo4j {
  constructor(neo4j, driver, url) {
    this.neo4j = neo4j;
    this.driver = driver;
    this.url = url;
  }

  /** Abre la conexión, la verifica y crea la restricción de unicidad del nickname. */
  static async conectar(neo4j, url, usuario, clave) {
    const driver = neo4j.driver(url, neo4j.auth.basic(usuario, clave));
    try {
      await driver.verifyConnectivity();
      await driver.executeQuery(
        'CREATE CONSTRAINT persona_nickname IF NOT EXISTS FOR (p:Person) REQUIRE p.nickname IS UNIQUE');
    } catch (error) {
      await driver.close();
      throw error;
    }
    return new AlmacenNeo4j(neo4j, driver, url);
  }

  get nombre() {
    return `Neo4j en ${this.url}`;
  }

  cerrar() {
    return this.driver.close();
  }

  async #consultar(cypher, parametros = {}) {
    const { records } = await this.driver.executeQuery(cypher, parametros);
    return records;
  }

  #numero(valor) {
    return this.neo4j.isInt(valor) ? valor.toNumber() : valor;
  }

  async personas() {
    const filas = await this.#consultar('MATCH (p:Person) RETURN p ORDER BY p.name');
    return filas.map((f) => aPersona(f.get('p').properties));
  }

  async agregarPersona(datos) {
    const p = validarPersona(datos);
    try {
      await this.#consultar(
        'CREATE (p:Person {name: $nombre, nickname: $nickname, email: $email, city: $ciudad, country: $pais})', p);
    } catch (error) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
        throw new ErrorValidacion([`El nickname ${p.nickname} ya está registrado.`]);
      throw error;
    }
    return p;
  }

  async actualizarPersona(nickname, datos) {
    const p = validarPersona({ ...datos, nickname });
    const filas = await this.#consultar(
      'MATCH (p:Person {nickname: $nickname}) SET p.name = $nombre, p.email = $email, p.city = $ciudad, p.country = $pais RETURN p', p);
    if (!filas.length) throw new ErrorValidacion([`No existe la persona ${nickname}.`]);
    return p;
  }

  async eliminarPersona(nickname) {
    const filas = await this.#consultar(
      'MATCH (p:Person {nickname: $nickname}) DETACH DELETE p RETURN count(*) AS n', { nickname });
    if (this.#numero(filas[0].get('n')) === 0) throw new ErrorValidacion([`No existe la persona ${nickname}.`]);
  }

  async relaciones() {
    const filas = await this.#consultar(
      'MATCH (a:Person)-[r:RELATIONSHIP]->(b:Person) RETURN a, r, b ORDER BY a.name, b.name');
    return filas.map((f) => this.#relacion(f.get('a').properties, f.get('r').properties, f.get('b').properties));
  }

  async agregarRelacion(datos) {
    const r = validarRelacion(datos);
    const existentes = await this.#consultar(
      'MATCH (p:Person) WHERE p.nickname IN [$desde, $hasta] RETURN p.nickname AS n', r);
    for (const n of [r.desde, r.hasta])
      if (!existentes.some((f) => f.get('n') === n)) throw new ErrorValidacion([`No existe la persona ${n}.`]);

    // Se crea solo si no hay una del mismo tipo entre los dos, en cualquier dirección.
    const filas = await this.#consultar(`
      MATCH (a:Person {nickname: $desde}), (b:Person {nickname: $hasta})
      WHERE NOT (a)-[:RELATIONSHIP {type: $tipo}]-(b)
      CREATE (a)-[r:RELATIONSHIP {type: $tipo, frequency: $frecuencia, importance: $importancia}]->(b)
      RETURN a, r, b`, { ...r, importancia: this.neo4j.int(r.importancia) });
    if (!filas.length) throw new ErrorValidacion(['Esa relación ya está registrada.']);
    const f = filas[0];
    return this.#relacion(f.get('a').properties, f.get('r').properties, f.get('b').properties);
  }

  async eliminarRelacion(desde, hasta, tipo) {
    const filas = await this.#consultar(`
      MATCH (:Person {nickname: $desde})-[r:RELATIONSHIP {type: $tipo}]-(:Person {nickname: $hasta})
      DELETE r RETURN count(*) AS n`, { desde, hasta, tipo });
    if (this.#numero(filas[0].get('n')) === 0) throw new ErrorValidacion(['La relación no existe.']);
  }

  async relacionesDe(nickname, tipo) {
    await this.#exigir(nickname);
    const filas = await this.#consultar(`
      MATCH (:Person {nickname: $nickname})-[r:RELATIONSHIP]-(o:Person)
      WHERE $tipo IS NULL OR r.type = $tipo
      RETURN o, r ORDER BY r.importance DESC, o.name`, { nickname, tipo: tipo || null });
    return filas.map((f) => {
      const r = f.get('r').properties;
      return {
        persona: aPersona(f.get('o').properties),
        tipo: r.type,
        frecuencia: r.frequency,
        importancia: this.#numero(r.importance)
      };
    });
  }

  async enComun(a, b) {
    const filas = await this.#consultar(`
      MATCH (:Person {nickname: $a})-[:RELATIONSHIP]-(c:Person)-[:RELATIONSHIP]-(:Person {nickname: $b})
      WHERE NOT c.nickname IN [$a, $b]
      RETURN DISTINCT c ORDER BY c.name`, { a, b });
    return filas.map((f) => aPersona(f.get('c').properties));
  }

  async masConectadas(limite = 5) {
    const filas = await this.#consultar(`
      MATCH (p:Person)-[:RELATIONSHIP]-(o:Person)
      RETURN p, count(DISTINCT o) AS cantidad
      ORDER BY cantidad DESC, p.name LIMIT $limite`, { limite: this.neo4j.int(limite) });
    return filas.map((f) => ({ persona: aPersona(f.get('p').properties), cantidad: this.#numero(f.get('cantidad')) }));
  }

  async caminoMasCorto(a, b) {
    await this.#exigir(a);
    await this.#exigir(b);
    if (a === b) return [aPersona((await this.#consultar('MATCH (p:Person {nickname: $a}) RETURN p', { a }))[0].get('p').properties)];
    const filas = await this.#consultar(`
      MATCH (a:Person {nickname: $a}), (b:Person {nickname: $b})
      MATCH camino = shortestPath((a)-[:RELATIONSHIP*..${MAXIMO_SALTOS}]-(b))
      RETURN [n IN nodes(camino) | n] AS nodos`, { a, b });
    if (!filas.length) return null;
    return filas[0].get('nodos').map((n) => aPersona(n.properties));
  }

  async grafo() {
    return { personas: await this.personas(), relaciones: await this.relaciones() };
  }

  /** Borra todo y carga los datos dados (para las pruebas y la semilla). */
  async reemplazarTodo(datos) {
    await this.#consultar('MATCH (n:Person) DETACH DELETE n');
    for (const p of datos.personas) await this.agregarPersona(p);
    for (const r of datos.relaciones) await this.agregarRelacion(r);
  }

  async #exigir(nickname) {
    const filas = await this.#consultar('MATCH (p:Person {nickname: $nickname}) RETURN p', { nickname });
    if (!filas.length) throw new ErrorValidacion([`No existe la persona ${nickname}.`]);
  }

  #relacion(a, r, b) {
    return {
      desde: a.nickname,
      hasta: b.nickname,
      nombreDesde: a.name,
      nombreHasta: b.name,
      tipo: r.type,
      frecuencia: r.frequency,
      importancia: this.#numero(r.importance)
    };
  }
}
