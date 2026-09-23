import path from 'path';
import { contratos_leer_buzon } from './tools/contratos_leer_buzon';
import { contratos_extraer_variables } from './tools/contratos_extraer_variables';
import { contratos_buscar_similares } from './tools/contratos_buscar_similares';
import { contratos_registrar_actualizar } from './tools/contratos_registrar_actualizar';
import { contratos_generar_alertas } from './tools/contratos_generar_alertas';
import { RegistroContrato } from './types';

async function runDemo() {
  console.log('=== INICIANDO DEMO REGISTRO DE CONTRATOS VIGENTES (RETO 02) ===\n');

  const rutaBuzon = path.join(process.cwd(), 'fixtures/buzones/contratos');
  const rutaCsv = path.join(process.cwd(), 'fixtures/maestro-contratos.csv');
  
  const mensajes = await contratos_leer_buzon(rutaBuzon);
  console.log(`[1] Correos leídos del buzón: ${mensajes.length}`);

  const contratosActuales: RegistroContrato[] = [];

  for (const msg of mensajes) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Procesando Correo: ${msg.id} | Asunto: "${msg.asunto}"`);

    const extraccion = await contratos_extraer_variables(msg, rutaBuzon);
    console.log(` -> Confianza de extracción: ${extraccion.confianza}`);

    if (extraccion.confianza < 0.8) {
      console.log(` ⚠️ ATENCIÓN: Nivel de confianza bajo (${extraccion.confianza}). Detenido para confirmación humana.`);
      console.log(`    Campos requeridos/dudosos: ${extraccion.campos_dudosos.join(', ')}`);
      console.log(`    [ACCION]: Retenido en cola de revisión (NO registrado en maestro-contratos.csv).`);
    } else {
      const busqueda = contratos_buscar_similares(extraccion, contratosActuales);

      if (busqueda.accionSugerida === 'actualizacion_otrosi') {
        console.log(` 🔄 OTROSÍ DETECTADO: Actualizando contrato existente ID: ${busqueda.contratoExistente?.id_contrato}`);
        const actualizado: RegistroContrato = {
          ...busqueda.contratoExistente!,
          valor: busqueda.contratoExistente!.valor + extraccion.valor,
          fecha_fin: extraccion.fecha_fin || busqueda.contratoExistente!.fecha_fin,
          origen_msg_id: msg.id,
          fecha_registro: new Date().toISOString()
        };
        await contratos_registrar_actualizar(rutaCsv, contratosActuales, actualizado);
        console.log(` ✅ OTROSÍ REGISTRADO EXITOSAMENTE en maestro-contratos.csv`);

      } else if (busqueda.accionSugerida === 'contrato_padre_no_encontrado') {
        console.log(` ⚠️ ALERTA DE GOBIERNO: Se recibió un Otrosí para el cliente ${extraccion.cliente}, pero el contrato principal NO existe en el maestro.`);
        console.log(`    [ACCION]: Retenido para verificación y reconstrucción de brecha.`);

      } else {
        const nuevoContrato: RegistroContrato = {
          id_contrato: `CTR-${extraccion.cliente.substring(0, 3)}-2026`,
          cliente: extraccion.cliente,
          objeto: extraccion.objeto,
          valor: extraccion.valor,
          moneda: extraccion.moneda,
          fecha_inicio: extraccion.fecha_inicio,
          fecha_fin: extraccion.fecha_fin,
          renovacion_automatica: extraccion.renovacion_automatica,
          requiere_poliza: extraccion.requiere_poliza,
          polizas_cumplidas: extraccion.polizas_cumplidas,
          estado: 'vigente',
          origen_msg_id: msg.id,
          fecha_registro: new Date().toISOString()
        };

        await contratos_registrar_actualizar(rutaCsv, contratosActuales, nuevoContrato);
        console.log(` ✅ REGISTRADO EXITOSAMENTE en maestro-contratos.csv e Historial auditado.`);
      }
    }
  }

  console.log(`\n--------------------------------------------------`);
  console.log(`[3] Generando Reporte Directivo de Alertas...`);
  await contratos_generar_alertas(contratosActuales, '2026-09-03');
  console.log(` ✅ Reporte generado en 'out/alertas.md'`);
  
  console.log('\n=== PROCESO DE VERIFICACIÓN COMPLETADO CON ÉXITO ===');
}

runDemo().catch(console.error);