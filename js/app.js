// Interfaz: arma las tablas y formularios sobre el almacén activo (demo o Neo4j).
import { AlmacenMemoria } from './almacen-memoria.js';
import { DATOS_EJEMPLO } from './datos-ejemplo.js';
import { ErrorValidacion } from './modelo.js';

const DRIVER_NEO4J = 'https://cdn.jsdelivr.net/npm/neo4j-driver@6.2.0/lib/browser/neo4j-web.esm.min.js';

const $ = (selector) => document.querySelector(selector);

let almacen = crearDemo();
let editando = null;

function crearDemo() {
  return new AlmacenMemoria({ datos: DATOS_EJEMPLO, storage: window.localStorage });
}

/** Crea un elemento con texto y atributos sin pasar por innerHTML (los datos los escribe el usuario). */
function el(etiqueta, texto, atributos = {}) {
  const nodo = document.createElement(etiqueta);
  if (texto !== undefined && texto !== null) nodo.textContent = texto;
  for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
  return nodo;
}

function fila(celdas) {
  const tr = el('tr');
  for (const celda of celdas) {
    const td = el('td');
    if (celda instanceof Node) td.append(celda);
    else td.textContent = celda;
    tr.append(td);
  }
  return tr;
}

function botonera(...botones) {
  const td = el('td', null, { class: 'acciones-fila' });
  td.append(...botones);
  return td;
}

function boton(texto, clase, accion) {
  const b = el('button', texto, { type: 'button', class: clase });
  b.addEventListener('click', accion);
  return b;
}

export function etiquetaTipo(tipo) {
  return el('span', tipo, { class: `etiqueta ${tipo}` });
}

export function estrellas(n) {
  return el('span', '★'.repeat(n) + '☆'.repeat(5 - n), { class: 'estrellas', title: `${n} de 5` });
}

let temporizador;
function avisar(texto, esError = false) {
  const aviso = $('#aviso');
  aviso.textContent = texto;
  aviso.classList.toggle('error', esError);
  aviso.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => (aviso.hidden = true), esError ? 6000 : 3000);
}

/** Ejecuta una acción del usuario mostrando el error si lo hay. */
async function intentar(accion, exito) {
  try {
    await accion();
    if (exito) avisar(exito);
    return true;
  } catch (error) {
    avisar(error instanceof ErrorValidacion ? error.message : `Error: ${error.message}`, true);
    if (!(error instanceof ErrorValidacion)) console.error(error);
    return false;
  }
}

async function refrescar() {
  const [personas, relaciones] = await Promise.all([almacen.personas(), almacen.relaciones()]);
  const cantidad = new Map(personas.map((p) => [p.nickname, 0]));
  for (const r of relaciones) {
    cantidad.set(r.desde, cantidad.get(r.desde) + 1);
    cantidad.set(r.hasta, cantidad.get(r.hasta) + 1);
  }

  const tablaPersonas = $('#tabla-personas');
  tablaPersonas.replaceChildren();
  for (const p of personas) {
    const tr = fila([p.nombre, `@${p.nickname}`, p.email, `${p.ciudad}, ${p.pais}`, String(cantidad.get(p.nickname))]);
    tr.append(botonera(
      boton('Editar', 'enlace', () => editarPersona(p)),
      boton('Eliminar', 'peligro', () => eliminarPersona(p, cantidad.get(p.nickname)))));
    tablaPersonas.append(tr);
  }
  if (!personas.length) tablaPersonas.append(vacio(6, 'No hay personas registradas.'));

  const tablaRelaciones = $('#tabla-relaciones');
  tablaRelaciones.replaceChildren();
  for (const r of relaciones) {
    const tr = fila([r.nombreDesde, r.nombreHasta, etiquetaTipo(r.tipo), r.frecuencia, estrellas(r.importancia)]);
    tr.append(botonera(boton('Eliminar', 'peligro', () => eliminarRelacion(r))));
    tablaRelaciones.append(tr);
  }
  if (!relaciones.length) tablaRelaciones.append(vacio(6, 'No hay relaciones registradas.'));

  for (const select of document.querySelectorAll('.selector-persona')) {
    const elegido = select.value;
    select.replaceChildren(...personas.map((p) => el('option', `${p.nombre} (@${p.nickname})`, { value: p.nickname })));
    if (personas.some((p) => p.nickname === elegido)) select.value = elegido;
  }
  // Que la persona 2 no arranque igual a la persona 1.
  const relacion = $('#form-relacion').elements;
  if (relacion.hasta.value === relacion.desde.value && personas.length > 1)
    relacion.hasta.selectedIndex = relacion.desde.selectedIndex === 0 ? 1 : 0;
  document.dispatchEvent(new CustomEvent('datos-actualizados', { detail: { almacen, personas, relaciones } }));
}

function vacio(columnas, texto) {
  const tr = el('tr');
  tr.append(el('td', texto, { colspan: columnas, class: 'vacio' }));
  return tr;
}

function editarPersona(p) {
  editando = p.nickname;
  const form = $('#form-persona');
  for (const campo of ['nombre', 'nickname', 'email', 'ciudad', 'pais']) form.elements[campo].value = p[campo];
  form.elements.nickname.disabled = true;
  $('#titulo-persona').textContent = `Editar a @${p.nickname}`;
  $('#cancelar-edicion').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function terminarEdicion() {
  editando = null;
  const form = $('#form-persona');
  form.reset();
  form.elements.nickname.disabled = false;
  $('#titulo-persona').textContent = 'Registrar persona';
  $('#cancelar-edicion').hidden = true;
}

async function eliminarPersona(p, relaciones) {
  const detalle = relaciones ? ` y sus ${relaciones} relaciones` : '';
  if (!confirm(`¿Eliminar a ${p.nombre}${detalle}?`)) return;
  if (await intentar(() => almacen.eliminarPersona(p.nickname), `${p.nombre} fue eliminada.`)) {
    if (editando === p.nickname) terminarEdicion();
    await refrescar();
  }
}

async function eliminarRelacion(r) {
  if (!confirm(`¿Eliminar la relación ${r.tipo} entre ${r.nombreDesde} y ${r.nombreHasta}?`)) return;
  if (await intentar(() => almacen.eliminarRelacion(r.desde, r.hasta, r.tipo), 'Relación eliminada.')) await refrescar();
}

$('#form-persona').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(evento.target));
  const ok = editando
    ? await intentar(() => almacen.actualizarPersona(editando, datos), 'Cambios guardados.')
    : await intentar(() => almacen.agregarPersona(datos), `${datos.nombre} fue registrada.`);
  if (ok) {
    terminarEdicion();
    await refrescar();
  }
});

$('#cancelar-edicion').addEventListener('click', terminarEdicion);

$('#form-relacion').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(evento.target));
  if (await intentar(() => almacen.agregarRelacion(datos), 'Relación registrada.')) await refrescar();
});

$('#form-relacion').elements.importancia.addEventListener('input', (evento) => {
  $('#valor-importancia').textContent = evento.target.value;
});

// Conexión

function mostrarEstado() {
  const esNeo4j = !(almacen instanceof AlmacenMemoria);
  $('#estado-conexion').textContent = esNeo4j ? almacen.nombre : 'Modo demo';
  $('#boton-conexion').classList.toggle('neo4j', esNeo4j);
}

$('#boton-conexion').addEventListener('click', () => {
  $('#error-conexion').hidden = true;
  $('#dialogo-conexion').showModal();
});

$('#form-conexion').addEventListener('submit', async (evento) => {
  const accion = evento.submitter?.value;
  if (accion === 'conectar') {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.target));
    const boton = $('#conectar');
    boton.disabled = true;
    boton.textContent = 'Conectando...';
    try {
      const [{ default: neo4j }, { AlmacenNeo4j }] = await Promise.all([import(DRIVER_NEO4J), import('./almacen-neo4j.js')]);
      const nuevo = await AlmacenNeo4j.conectar(neo4j, datos.url, datos.usuario, datos.clave);
      await cambiarAlmacen(nuevo);
      $('#dialogo-conexion').close();
      avisar('Conectado a Neo4j.');
    } catch (error) {
      $('#error-conexion').textContent = `No se pudo conectar: ${error.message}`;
      $('#error-conexion').hidden = false;
    } finally {
      boton.disabled = false;
      boton.textContent = 'Conectar a Neo4j';
      evento.target.elements.clave.value = '';
    }
  } else if (accion === 'demo') {
    await cambiarAlmacen(crearDemo());
  } else if (accion === 'reiniciar') {
    window.localStorage.removeItem('red-de-relaciones');
    await cambiarAlmacen(crearDemo());
    avisar('Se restablecieron los datos de ejemplo del modo demo.');
  }
});

async function cambiarAlmacen(nuevo) {
  if (almacen !== nuevo && almacen.cerrar) await almacen.cerrar();
  almacen = nuevo;
  terminarEdicion();
  mostrarEstado();
  await refrescar();
}

export const actual = () => almacen;
export { intentar, el, fila, vacio };

mostrarEstado();
await refrescar();
