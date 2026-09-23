import fs from 'fs/promises';
import path from 'path';
import { MensajeBuzon, ResultadoExtraccion } from '../types';

export async function contratos_extraer_variables(
  msg: MensajeBuzon, 
  directorioBuzon: string
): Promise<ResultadoExtraccion> {
  
  let textoAdjunto = '';
  const rutaCarpetaMsg = path.join(directorioBuzon, msg.id);

  const nombreAdjuntoDeclarado = (msg.adjuntos && msg.adjuntos.length > 0) 
    ? msg.adjuntos[0] 
    : 'contrato.txt';

  const rutaAdjunto = path.join(rutaCarpetaMsg, nombreAdjuntoDeclarado);

  try {
    textoAdjunto = await fs.readFile(rutaAdjunto, 'utf-8');
  } catch (error) {
    try {
      const rutaFallback = path.join(rutaCarpetaMsg, 'contrato.txt');
      textoAdjunto = await fs.readFile(rutaFallback, 'utf-8');
    } catch (e) {
      console.warn(` ⚠️ No se encontró el adjunto para ${msg.id}. Se procesa solo con el cuerpo del correo.`);
    }
  }

  const textoCompleto = `${msg.asunto}\n${msg.cuerpo}\n${textoAdjunto}`.toLowerCase();
  
  const camposDudosos: string[] = [];
  let factoresConfianza = 0;
  const totalFactores = 5;

  // 1. Cliente
  const matchCliente = textoCompleto.match(/(?:contrato|cliente|con)\s+([a-záéíóúñ0-9\s]+?)(?:-|\$|v1|v2|final|$|\n)/i);
  const cliente = matchCliente ? matchCliente[1].trim().toUpperCase() : 'DESCONOCIDO';
  if (cliente !== 'DESCONOCIDO') factoresConfianza++; else camposDudosos.push('cliente');

  // 2. Valor y Moneda
  const matchValor = textoCompleto.match(/(?:valor|monto|cuantía|total):\s*(\$|usd|cop)?\s*([\d\.,]+)/i);
  let valor = 0;
  let moneda = 'COP';
  if (matchValor) {
    moneda = matchValor[1]?.toUpperCase().includes('USD') ? 'USD' : 'COP';
    valor = parseFloat(matchValor[2].replace(/\./g, '').replace(',', '.'));
    factoresConfianza++;
  } else {
    camposDudosos.push('valor');
  }

  // 3. Fechas
  const matchFechas = textoCompleto.match(/(\d{4}-\d{2}-\d{2})/g);
  let fecha_inicio = msg.fecha ? msg.fecha.split('T')[0] : '2026-08-01';
  let fecha_fin = '';
  if (matchFechas && matchFechas.length >= 2) {
    fecha_inicio = matchFechas[0];
    fecha_fin = matchFechas[1];
    factoresConfianza++;
  } else if (matchFechas && matchFechas.length === 1) {
    fecha_fin = matchFechas[0];
    factoresConfianza += 0.5;
    camposDudosos.push('fecha_inicio (inferida)');
  } else {
    camposDudosos.push('fecha_fin');
  }

  // 4. Renovación y Pólizas
  const renovacion_automatica = /renovaci[oó]n autom[aá]tica|pr[oó]rroga autom[aá]tica/.test(textoCompleto);
  factoresConfianza++;

  const requiere_poliza = /p[oó]liza|garant[ií]a|amparo/.test(textoCompleto);
  const polizas_cumplidas = /p[oó]liza adjunta|p[oó]liza verificada|p[oó]liza vigente/.test(textoCompleto);
  factoresConfianza++;

  const confianza = parseFloat((factoresConfianza / totalFactores).toFixed(2));

  return {
    msg_id: msg.id,
    cliente,
    objeto: msg.asunto,
    valor,
    moneda,
    fecha_inicio,
    fecha_fin,
    renovacion_automatica,
    requiere_poliza,
    polizas_cumplidas,
    confianza,
    campos_dudosos: camposDudosos
  };
}