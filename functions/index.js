const functions = require("firebase-functions");
const { db } = require("./utils/admin"); // <--- NUEVO: Importa la instancia de Firestore

// NO HAY admin.initializeApp() AQUÍ. Se hace en admin.js.

// --- Función 1: validateKey (valida la clave final) ---
exports.validateKey = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido. Solo POST.");
  }

  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ isValid: false, message: "Falta la clave." });
  }

  // const firestore = admin.firestore(); // <--- ¡ELIMINA ESTA LÍNEA!

  try {
    const keyQuery = await db.collection("keys") // <--- USA 'db' aquí
        .where("value", "==", key)
        .limit(1)
        .get();

    if (keyQuery.empty) {
      return res.status(200).json({ isValid: false, message: "Clave no encontrada." });
    }

    const keyDoc = keyQuery.docs[0];
    const keyData = keyDoc.data();
    const now = new Date().getTime();

    if (keyData.expiresAt.toDate().getTime() <= now) {
      return res.status(200).json({ isValid: false, message: "Clave expirada." });
    }

    return res.status(200).json({ isValid: true, message: "Clave válida." });

  } catch (error) {
    console.error("Error al validar clave:", error);
    return res.status(500).json({ isValid: false, message: "Error interno del servidor." });
  }
});

// Exporta la función proxy desde el nuevo archivo 'proxyValidate.js'
exports.robloxProxyValidate = require('./proxyValidate');