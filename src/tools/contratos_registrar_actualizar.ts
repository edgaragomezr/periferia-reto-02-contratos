import fs from 'fs/promises';
import path from 'path';
import { RegistroContrato } from '../types';

export async function contratos_registrar_actualizar(
  rutaCsv: string,
  contratosActuales: RegistroContrato[],
  nuevoRegistro: RegistroContrato
): Promise<void> {
  const index = contratosActuales.findIndex(c => c.id_contrato === nuevoRegistro.id_contrato);
  if (index >= 0) {
    contratosActuales[index] = nuevoRegistro;
  } else {
    contratosActuales.push(nuevoRegistro);
  }

  const header = 'id_contrato,cliente,objeto,valor,moneda,fecha_inicio,fecha_fin,renovacion_automatica,requiere_poliza,polizas_cumplidas,estado,origen_msg_id,fecha_registro\n';
  const filas = contratosActuales.map(c => 
    `${c.id_contrato},"${c.cliente}","${c.objeto}",${c.valor},${c.moneda},${c.fecha_inicio},${c.fecha_fin},${c.renovacion_automatica},${c.requiere_poliza},${c.polizas_cumplidas},${c.estado},${c.origen_msg_id},${c.fecha_registro}`
  ).join('\n');

  await fs.writeFile(rutaCsv, header + filas, 'utf-8');

  const logEntry = JSON.stringify({ timestamp: new Date().toISOString(), accion: 'upsert', contrato: nuevoRegistro }) + '\n';
  await fs.mkdir('out', { recursive: true });
  await fs.appendFile(path.join('out', 'historial.jsonl'), logEntry, 'utf-8');
}