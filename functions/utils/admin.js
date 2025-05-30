const admin = require('firebase-admin');

// Solo inicializa si no ha sido inicializado ya.
// Esto previene errores si, por alguna razón, se llama múltiples veces.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Exporta la instancia de Firestore para que otras funciones puedan usarla.
const firestore = admin.firestore();
exports.db = firestore;