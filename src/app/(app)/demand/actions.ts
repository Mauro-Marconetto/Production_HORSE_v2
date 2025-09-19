'use server';

import type { Demand } from '@/lib/types';

/**
 * Combina las nuevas demandas de un CSV con las existentes, actualizando solo las que están en borrador.
 * @param newDemands Demandas parseadas del archivo CSV.
 * @param existingDemands Demandas actuales en el estado de la aplicación.
 * @returns Una nueva lista de demandas combinadas.
 */
export async function importDemand(
  newDemands: Demand[],
  existingDemands: Demand[]
): Promise<Demand[]> {
  const existingMap = new Map(existingDemands.map(d => [d.id, d]));

  newDemands.forEach(newDemand => {
    const existing = existingMap.get(newDemand.id);

    // Si no existe, la añadimos.
    // Si existe y NO está congelada (es borrador), la sobreescribimos.
    if (!existing || !existing.congelado) {
      existingMap.set(newDemand.id, newDemand);
    }
    // Si existe y está congelada, no hacemos nada.
  });

  // Convertir el mapa de nuevo a un array y ordenarlo.
  const mergedDemands = Array.from(existingMap.values());
  mergedDemands.sort((a, b) => a.periodoYYYYWW.localeCompare(b.periodoYYYYWW) || a.pieceId.localeCompare(b.pieceId));
  
  return mergedDemands;
}
