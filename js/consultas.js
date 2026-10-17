// Sección de consultas: se recalcula cada vez que cambian los datos o los filtros.
import { actual, intentar, el } from './app.js';

const $ = (selector) => document.querySelector(selector);

function sinResultado(contenedor, texto) {
  contenedor.replaceChildren(el(contenedor.tagName === 'DIV' ? 'p' : 'li', texto, { class: 'sin-resultado' }));
}

async function relacionesDe() {
  const form = $('#consulta-relaciones').elements;
  const lista = $('#resultado-relaciones');
  if (!form.persona.value) return sinResultado(lista, 'No hay personas.');
  await intentar(async () => {
    const relaciones = await actual().relacionesDe(form.persona.value, form.tipo.value);
    if (!relaciones.length) return sinResultado(lista, 'Sin relaciones de ese tipo.');
    lista.replaceChildren(...relaciones.map((r) => {
      const li = el('li');
      li.append(el('span', r.persona.nombre),
        el('span', `${r.tipo} · ${r.frecuencia} · ${'★'.repeat(r.importancia)}`, { class: 'detalle' }));
      return li;
    }));
  });
}

async function enComun() {
  const form = $('#consulta-comun').elements;
  const lista = $('#resultado-comun');
  if (!form.a.value || form.a.value === form.b.value) return sinResultado(lista, 'Elija dos personas distintas.');
  await intentar(async () => {
    const comunes = await actual().enComun(form.a.value, form.b.value);
    if (!comunes.length) return sinResultado(lista, 'No tienen contactos en común.');
    lista.replaceChildren(...comunes.map((p) => {
      const li = el('li');
      li.append(el('span', p.nombre), el('span', `@${p.nickname}`, { class: 'detalle' }));
      return li;
    }));
  });
}

async function camino(destacar = false) {
  const form = $('#consulta-camino').elements;
  const salida = $('#resultado-camino');
  if (!form.a.value || form.a.value === form.b.value) return sinResultado(salida, 'Elija dos personas distintas.');
  await intentar(async () => {
    const personas = await actual().caminoMasCorto(form.a.value, form.b.value);
    if (!personas) return sinResultado(salida, 'No están conectadas (o están a más de 6 saltos).');
    const partes = [];
    personas.forEach((p, i) => {
      if (i > 0) partes.push(el('span', '→', { class: 'flecha' }));
      partes.push(el('span', p.nombre, { class: 'nodo' }));
    });
    const saltos = personas.length - 1;
    partes.push(el('span', `${saltos} ${saltos === 1 ? 'salto' : 'saltos'}`, { class: 'detalle' }));
    salida.replaceChildren(...partes);
    if (destacar) document.dispatchEvent(new CustomEvent('camino-encontrado', { detail: personas.map((p) => p.nickname) }));
  });
}

async function ranking() {
  const lista = $('#resultado-ranking');
  await intentar(async () => {
    const top = await actual().masConectadas(5);
    if (!top.length) return sinResultado(lista, 'Todavía no hay relaciones.');
    const maximo = top[0].cantidad;
    lista.replaceChildren(...top.map(({ persona, cantidad }) => {
      const li = el('li');
      const barra = el('div', null, { class: 'barra' });
      barra.style.width = `${Math.round(80 * cantidad / maximo)}px`;
      li.append(el('span', persona.nombre, { class: 'nombre' }), barra, el('span', String(cantidad)));
      return li;
    }));
  });
}

/** Elige por defecto dos personas distintas en los pares de selectores. */
function separar(form) {
  if (form.a.value === form.b.value && form.b.options.length > 1) form.b.selectedIndex = form.a.selectedIndex === 0 ? 1 : 0;
}

function todo() {
  separar($('#consulta-comun').elements);
  separar($('#consulta-camino').elements);
  return Promise.all([relacionesDe(), enComun(), camino(), ranking()]);
}

document.addEventListener('datos-actualizados', todo);
$('#consulta-relaciones').addEventListener('change', relacionesDe);
$('#consulta-comun').addEventListener('change', enComun);
// Al elegir un camino a mano se resalta en el grafo.
$('#consulta-camino').addEventListener('change', () => camino(true));
for (const id of ['#consulta-relaciones', '#consulta-comun', '#consulta-camino'])
  $(id).addEventListener('submit', (e) => e.preventDefault());

await todo();
