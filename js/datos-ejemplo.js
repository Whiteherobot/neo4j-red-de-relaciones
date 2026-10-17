// Datos para el modo demo y para db/semilla.cypher: dos grupos (trabajo y familia)
// unidos por pocas personas, para que el camino más corto tenga sentido.

export const DATOS_EJEMPLO = {
  personas: [
    { nombre: 'Ana Torres', nickname: 'anat', email: 'ana.torres@correo.ec', ciudad: 'Cuenca', pais: 'Ecuador' },
    { nombre: 'Luis Pacheco', nickname: 'luisp', email: 'lpacheco@correo.ec', ciudad: 'Cuenca', pais: 'Ecuador' },
    { nombre: 'María Sarmiento', nickname: 'msarmiento', email: 'maria.s@correo.ec', ciudad: 'Quito', pais: 'Ecuador' },
    { nombre: 'Jorge Vintimilla', nickname: 'jorgev', email: 'jvintimilla@correo.ec', ciudad: 'Cuenca', pais: 'Ecuador' },
    { nombre: 'Carla Ordóñez', nickname: 'carlao', email: 'carla.o@correo.ec', ciudad: 'Guayaquil', pais: 'Ecuador' },
    { nombre: 'Pedro Quezada', nickname: 'pedroq', email: 'pquezada@correo.ec', ciudad: 'Loja', pais: 'Ecuador' },
    { nombre: 'Sofía Andrade', nickname: 'sofiaa', email: 'sofia.andrade@correo.ec', ciudad: 'Cuenca', pais: 'Ecuador' },
    { nombre: 'Diego Rivera', nickname: 'diegor', email: 'drivera@correo.pe', ciudad: 'Lima', pais: 'Perú' },
    { nombre: 'Elena Cabrera', nickname: 'elenac', email: 'elena.c@correo.ec', ciudad: 'Quito', pais: 'Ecuador' },
    { nombre: 'Tomás Ochoa', nickname: 'tomaso', email: 'tochoa@correo.ec', ciudad: 'Cuenca', pais: 'Ecuador' }
  ],
  relaciones: [
    { desde: 'anat', hasta: 'luisp', tipo: 'laboral', frecuencia: 'diaria', importancia: 4 },
    { desde: 'anat', hasta: 'jorgev', tipo: 'laboral', frecuencia: 'diaria', importancia: 3 },
    { desde: 'luisp', hasta: 'jorgev', tipo: 'amistad', frecuencia: 'semanal', importancia: 4 },
    { desde: 'jorgev', hasta: 'carlao', tipo: 'laboral', frecuencia: 'mensual', importancia: 2 },
    { desde: 'anat', hasta: 'sofiaa', tipo: 'familiar', frecuencia: 'semanal', importancia: 5 },
    { desde: 'sofiaa', hasta: 'tomaso', tipo: 'familiar', frecuencia: 'diaria', importancia: 5 },
    { desde: 'tomaso', hasta: 'elenac', tipo: 'amistad', frecuencia: 'mensual', importancia: 3 },
    { desde: 'elenac', hasta: 'msarmiento', tipo: 'laboral', frecuencia: 'diaria', importancia: 4 },
    { desde: 'msarmiento', hasta: 'diegor', tipo: 'amistad', frecuencia: 'ocasional', importancia: 2 },
    { desde: 'carlao', hasta: 'pedroq', tipo: 'familiar', frecuencia: 'semanal', importancia: 4 },
    { desde: 'luisp', hasta: 'sofiaa', tipo: 'amistad', frecuencia: 'ocasional', importancia: 2 },
    { desde: 'pedroq', hasta: 'diegor', tipo: 'laboral', frecuencia: 'ocasional', importancia: 1 }
  ]
};
