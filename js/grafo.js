// Vista del grafo en un canvas con un layout de fuerzas simple: los nodos se
// repelen, las relaciones actúan como resortes y todo se atrae al centro.
// Se pueden arrastrar los nodos; el último camino consultado queda resaltado.

const canvas = document.querySelector('#lienzo-grafo');
const ctx = canvas.getContext('2d');
const COLORES = { amistad: '#00bfff', familiar: '#f59e0b', laboral: '#a78bfa' };

let nodos = [];
let aristas = [];
let camino = [];
let arrastrado = null;
let encima = null;
let energia = 0;

function tamano() {
  const ancho = canvas.clientWidth;
  const alto = canvas.clientHeight;
  const escala = window.devicePixelRatio || 1;
  if (canvas.width !== ancho * escala) {
    canvas.width = ancho * escala;
    canvas.height = alto * escala;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
  }
  return { ancho, alto };
}

function cargar({ personas, relaciones }) {
  const { ancho, alto } = tamano();
  const anteriores = new Map(nodos.map((n) => [n.id, n]));
  // Posición inicial en círculo (la misma en cada carga) o la que ya tenía el nodo.
  nodos = personas.map((p, i) => {
    const previo = anteriores.get(p.nickname);
    const angulo = (2 * Math.PI * i) / personas.length;
    return {
      id: p.nickname,
      nombre: p.nombre,
      x: previo?.x ?? ancho / 2 + Math.cos(angulo) * alto * 0.35,
      y: previo?.y ?? alto / 2 + Math.sin(angulo) * alto * 0.35,
      vx: 0,
      vy: 0,
      grado: 0
    };
  });
  const porId = new Map(nodos.map((n) => [n.id, n]));
  aristas = relaciones.map((r) => ({ a: porId.get(r.desde), b: porId.get(r.hasta), tipo: r.tipo, importancia: r.importancia }));
  for (const e of aristas) { e.a.grado++; e.b.grado++; }
  camino = camino.filter((id) => porId.has(id));
  // Se asienta antes de dibujar para no mostrar el salto inicial.
  for (energia = 1; energia > 0.05; energia *= 0.985) paso();
  energia = 0.05;
  pedirCuadro();
}

function radio(n) {
  return 9 + Math.min(n.grado, 6) * 2;
}

// Fruchterman-Reingold: repulsión k²/d entre todos, atracción d²/k en cada
// relación y un desplazamiento máximo (temperatura) que se va enfriando.
function paso() {
  const { ancho, alto } = tamano();
  const k = Math.sqrt((ancho * alto) / Math.max(nodos.length, 1)) * 0.55;
  const temperatura = Math.max(energia, 0.02) * ancho * 0.05;

  for (const n of nodos) { n.dx = 0; n.dy = 0; }
  for (let i = 0; i < nodos.length; i++) {
    for (let j = i + 1; j < nodos.length; j++) {
      const a = nodos[i], b = nodos[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.max(Math.hypot(dx, dy), 0.5);
      const f = (k * k) / d;
      dx = (dx / d) * f; dy = (dy / d) * f;
      a.dx += dx; a.dy += dy;
      b.dx -= dx; b.dy -= dy;
    }
  }
  for (const e of aristas) {
    let dx = e.a.x - e.b.x, dy = e.a.y - e.b.y;
    const d = Math.max(Math.hypot(dx, dy), 0.5);
    const f = (d * d) / k;
    dx = (dx / d) * f; dy = (dy / d) * f;
    e.a.dx -= dx; e.a.dy -= dy;
    e.b.dx += dx; e.b.dy += dy;
  }
  for (const n of nodos) {
    // Atracción suave al centro para que los grupos sueltos no se vayan a los bordes.
    n.dx += (ancho / 2 - n.x) * 0.6;
    n.dy += (alto / 2 - n.y) * 0.9;
    if (n === arrastrado) continue;
    const d = Math.max(Math.hypot(n.dx, n.dy), 0.01);
    const mover = Math.min(d, temperatura);
    n.x = Math.min(Math.max(n.x + (n.dx / d) * mover, 70), ancho - 70);
    n.y = Math.min(Math.max(n.y + (n.dy / d) * mover, 30), alto - 40);
  }
}

function enCamino(e) {
  for (let i = 0; i + 1 < camino.length; i++) {
    if ((e.a.id === camino[i] && e.b.id === camino[i + 1]) || (e.b.id === camino[i] && e.a.id === camino[i + 1])) return true;
  }
  return false;
}

function dibujar() {
  const { ancho, alto } = tamano();
  ctx.clearRect(0, 0, ancho, alto);
  const resaltar = camino.length > 1;

  for (const e of aristas) {
    const destacado = enCamino(e);
    ctx.strokeStyle = COLORES[e.tipo];
    ctx.globalAlpha = resaltar && !destacado ? 0.2 : 0.85;
    ctx.lineWidth = destacado ? 5 : 1 + e.importancia * 0.6;
    ctx.beginPath();
    ctx.moveTo(e.a.x, e.a.y);
    ctx.lineTo(e.b.x, e.b.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const n of nodos) {
    const destacado = camino.includes(n.id);
    ctx.fillStyle = destacado ? '#f2f2f2' : n === encima ? '#3a3a3a' : '#2a2a2a';
    ctx.strokeStyle = destacado ? '#00bfff' : '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(n.x, n.y, radio(n), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = resaltar && !destacado ? '#777' : '#f2f2f2';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.nombre, n.x, n.y + radio(n) + 15);
  }
}

let cuadroPendiente = false;
function pedirCuadro() {
  if (cuadroPendiente) return;
  cuadroPendiente = true;
  requestAnimationFrame(() => {
    cuadroPendiente = false;
    if (energia > 0.01 || arrastrado) {
      paso();
      energia *= 0.97;
      pedirCuadro();
    }
    dibujar();
  });
}

function nodoEn(evento) {
  const r = canvas.getBoundingClientRect();
  const x = evento.clientX - r.left, y = evento.clientY - r.top;
  return nodos.find((n) => Math.hypot(n.x - x, n.y - y) <= radio(n) + 3) ?? null;
}

canvas.addEventListener('pointerdown', (evento) => {
  arrastrado = nodoEn(evento);
  if (arrastrado) canvas.setPointerCapture(evento.pointerId);
});
canvas.addEventListener('pointermove', (evento) => {
  if (arrastrado) {
    const r = canvas.getBoundingClientRect();
    arrastrado.x = evento.clientX - r.left;
    arrastrado.y = evento.clientY - r.top;
    energia = 0.3;
    pedirCuadro();
    return;
  }
  const nuevo = nodoEn(evento);
  if (nuevo !== encima) {
    encima = nuevo;
    canvas.style.cursor = encima ? 'grab' : 'default';
    canvas.title = encima ? `${encima.nombre} (@${encima.id}) · ${encima.grado} relaciones` : '';
    pedirCuadro();
  }
});
canvas.addEventListener('pointerup', () => { arrastrado = null; });
window.addEventListener('resize', () => { energia = 0.3; pedirCuadro(); });

document.addEventListener('datos-actualizados', (evento) => cargar(evento.detail));
document.addEventListener('camino-encontrado', (evento) => {
  camino = evento.detail;
  pedirCuadro();
});
