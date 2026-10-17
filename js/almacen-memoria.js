// Grafo en memoria con la misma interfaz que AlmacenNeo4j. Es el modo demo de la
// página publicada y sirve para probar la lógica sin una base levantada.
// Si recibe un storage (localStorage), guarda los cambios entre visitas.

import { persona as validarPersona, relacion as validarRelacion, ErrorValidacion } from './modelo.js';

const CLAVE = 'red-de-relaciones';
const MAXIMO_SALTOS = 6;

export class AlmacenMemoria {
  constructor({ datos, storage } = {}) {
    this.storage = storage;
    const guardado = storage?.getItem(CLAVE);
    const inicial = guardado ? JSON.parse(guardado) : datos ?? { personas: [], relaciones: [] };
    this.lista = structuredClone(inicial.personas);
    this.aristas = structuredClone(inicial.relaciones);
  }

  get nombre() {
    return 'Modo demo (datos en este navegador)';
  }

  async personas() {
    return [...this.lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async agregarPersona(datos) {
    const p = validarPersona(datos);
    if (this.#buscar(p.nickname)) throw new ErrorValidacion([`El nickname ${p.nickname} ya está registrado.`]);
    this.lista.push(p);
    this.#guardar();
    return p;
  }

  async actualizarPersona(nickname, datos) {
    const actual = this.#exigir(nickname);
    const p = validarPersona({ ...datos, nickname });
    Object.assign(actual, p);
    this.#guardar();
    return p;
  }

  /** Borra a la persona y todas sus relaciones (como DETACH DELETE). */
  async eliminarPersona(nickname) {
    this.#exigir(nickname);
    this.lista = this.lista.filter((p) => p.nickname !== nickname);
    this.aristas = this.aristas.filter((r) => r.desde !== nickname && r.hasta !== nickname);
    this.#guardar();
  }

  async relaciones() {
    return this.aristas.map((r) => this.#conNombres(r));
  }

  async agregarRelacion(datos) {
    const r = validarRelacion(datos);
    this.#exigir(r.desde);
    this.#exigir(r.hasta);
    if (this.#arista(r.desde, r.hasta, r.tipo))
      throw new ErrorValidacion(['Esa relación ya está registrada.']);
    this.aristas.push(r);
    this.#guardar();
    return this.#conNombres(r);
  }

  async eliminarRelacion(desde, hasta, tipo) {
    const r = this.#arista(desde, hasta, tipo);
    if (!r) throw new ErrorValidacion(['La relación no existe.']);
    this.aristas = this.aristas.filter((x) => x !== r);
    this.#guardar();
  }

  /** Relaciones de una persona en cualquier dirección, con los datos de la otra persona. */
  async relacionesDe(nickname, tipo) {
    this.#exigir(nickname);
    return this.aristas
      .filter((r) => (r.desde === nickname || r.hasta === nickname) && (!tipo || r.tipo === tipo))
      .map((r) => ({
        persona: this.#buscar(r.desde === nickname ? r.hasta : r.desde),
        tipo: r.tipo,
        frecuencia: r.frecuencia,
        importancia: r.importancia
      }))
      .sort((a, b) => b.importancia - a.importancia || a.persona.nombre.localeCompare(b.persona.nombre, 'es'));
  }

  /** Personas relacionadas con las dos. */
  async enComun(a, b) {
    const vecinosA = this.#vecinos(a);
    const vecinosB = this.#vecinos(b);
    return [...vecinosA]
      .filter((n) => vecinosB.has(n) && n !== a && n !== b)
      .map((n) => this.#buscar(n))
      .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
  }

  async masConectadas(limite = 5) {
    return this.lista
      .map((p) => ({ persona: p, cantidad: this.#vecinos(p.nickname).size }))
      .filter((x) => x.cantidad > 0)
      .sort((x, y) => y.cantidad - x.cantidad || x.persona.nombre.localeCompare(y.persona.nombre, 'es'))
      .slice(0, limite);
  }

  /** Búsqueda en anchura sin importar la dirección, hasta 6 saltos (igual que la consulta de Neo4j). */
  async caminoMasCorto(a, b) {
    this.#exigir(a);
    this.#exigir(b);
    if (a === b) return [this.#buscar(a)];
    const previo = new Map([[a, null]]);
    let frontera = [a];
    for (let salto = 0; salto < MAXIMO_SALTOS && frontera.length; salto++) {
      const siguiente = [];
      for (const actual of frontera) {
        for (const vecino of [...this.#vecinos(actual)].sort()) {
          if (previo.has(vecino)) continue;
          previo.set(vecino, actual);
          if (vecino === b) return this.#reconstruir(previo, b);
          siguiente.push(vecino);
        }
      }
      frontera = siguiente;
    }
    return null;
  }

  async grafo() {
    return { personas: await this.personas(), relaciones: await this.relaciones() };
  }

  #reconstruir(previo, fin) {
    const camino = [];
    for (let n = fin; n !== null; n = previo.get(n)) camino.unshift(this.#buscar(n));
    return camino;
  }

  #vecinos(nickname) {
    const vecinos = new Set();
    for (const r of this.aristas) {
      if (r.desde === nickname) vecinos.add(r.hasta);
      if (r.hasta === nickname) vecinos.add(r.desde);
    }
    return vecinos;
  }

  #arista(a, b, tipo) {
    return this.aristas.find((r) => r.tipo === tipo &&
      ((r.desde === a && r.hasta === b) || (r.desde === b && r.hasta === a)));
  }

  #conNombres(r) {
    return { ...r, nombreDesde: this.#buscar(r.desde).nombre, nombreHasta: this.#buscar(r.hasta).nombre };
  }

  #buscar(nickname) {
    return this.lista.find((p) => p.nickname === nickname);
  }

  #exigir(nickname) {
    const p = this.#buscar(nickname);
    if (!p) throw new ErrorValidacion([`No existe la persona ${nickname}.`]);
    return p;
  }

  #guardar() {
    this.storage?.setItem(CLAVE, JSON.stringify({ personas: this.lista, relaciones: this.aristas }));
  }
}
