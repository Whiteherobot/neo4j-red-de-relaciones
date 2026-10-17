// Reglas de los datos: qué es una persona válida y qué es una relación válida.
// El nickname identifica a la persona (el nombre se puede repetir).

export const TIPOS = ['amistad', 'familiar', 'laboral'];
export const FRECUENCIAS = ['diaria', 'semanal', 'mensual', 'ocasional'];

export class ErrorValidacion extends Error {
  constructor(errores) {
    super(errores.join(' '));
    this.errores = errores;
  }
}

const recortar = (texto) => String(texto ?? '').trim().replace(/\s+/g, ' ');

export function normalizarPersona(datos) {
  return {
    nombre: recortar(datos.nombre),
    nickname: recortar(datos.nickname).toLowerCase().replace(/^@/, ''),
    email: recortar(datos.email).toLowerCase(),
    ciudad: recortar(datos.ciudad),
    pais: recortar(datos.pais)
  };
}

export function validarPersona(p) {
  const errores = [];
  if (p.nombre.length < 2) errores.push('El nombre es obligatorio.');
  if (!/^[a-z0-9_.]{3,20}$/.test(p.nickname))
    errores.push('El nickname debe tener de 3 a 20 caracteres: letras, números, punto o guion bajo.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) errores.push('El correo no es válido.');
  if (!p.ciudad) errores.push('La ciudad es obligatoria.');
  if (!p.pais) errores.push('El país es obligatorio.');
  return errores;
}

export function normalizarRelacion(datos) {
  return {
    desde: recortar(datos.desde).toLowerCase(),
    hasta: recortar(datos.hasta).toLowerCase(),
    tipo: recortar(datos.tipo).toLowerCase(),
    frecuencia: recortar(datos.frecuencia).toLowerCase(),
    importancia: Number(datos.importancia)
  };
}

export function validarRelacion(r) {
  const errores = [];
  if (!r.desde || !r.hasta) errores.push('Elija las dos personas.');
  else if (r.desde === r.hasta) errores.push('Una persona no puede relacionarse consigo misma.');
  if (!TIPOS.includes(r.tipo)) errores.push('El tipo debe ser amistad, familiar o laboral.');
  if (!FRECUENCIAS.includes(r.frecuencia)) errores.push('La frecuencia debe ser diaria, semanal, mensual u ocasional.');
  if (!Number.isInteger(r.importancia) || r.importancia < 1 || r.importancia > 5)
    errores.push('La importancia va de 1 a 5.');
  return errores;
}

/** Normaliza y valida; devuelve el objeto limpio o lanza ErrorValidacion con todos los errores. */
export function persona(datos) {
  const p = normalizarPersona(datos);
  const errores = validarPersona(p);
  if (errores.length) throw new ErrorValidacion(errores);
  return p;
}

export function relacion(datos) {
  const r = normalizarRelacion(datos);
  const errores = validarRelacion(r);
  if (errores.length) throw new ErrorValidacion(errores);
  return r;
}
