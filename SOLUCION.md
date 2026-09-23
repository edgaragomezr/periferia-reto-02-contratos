# Solución Reto 02 — Agente conversacional "Registro de Contratos Vigentes"

## 1. Resumen Ejecutivo
Esta solución implementa un agente conversacional para la gestión, clasificación y registro de contratos vigentes en Periferia IT Group. Resuelve la problemática del proceso operativo congelado tras la salida del gestor del área, garantizando trazabilidad, validación por nivel de confianza y reportes de alertas para la Alta Dirección.

## 2. Arquitectura de la Solución
* **Arquitectura Orientada a Herramientas (Tool Use):** Bucle de razonamiento decoupled donde las herramientas (`src/tools/`) ejecutan operaciones deterministas sobre archivos locales.
* **Manejo de Errores y Confianza:** Lógica de evaluación de confianza (< 0.8) que detiene automáticamente registros dudosos para validación del operador.
* **Persistencia y Auditoría:** Actualización atómica en `fixtures/contratos.csv` y log append-only en `out/historial.jsonl`.

## 3. Comandos de Ejecución y Pruebas
```bash
# Instalación
npm install

# Ejecución de la prueba determinista de verificación
npm run demo