import Dexie from 'dexie';

export async function forceResetDatabase() {
  try {
    // Cerrar cualquier conexión abierta
    if (window.indexedDB) {
      await Dexie.delete('SiteManagerDB_v2');
      console.log('✅ Base de datos eliminada completamente');
    }
    
    // Limpiar el flag de localStorage también
    localStorage.removeItem('db_reset_v5');
    localStorage.removeItem('db_initialized');
    
    return true;
  } catch (error) {
    console.error('Error al eliminar DB:', error);
    return false;
  }
}