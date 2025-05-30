const functions = require("firebase-functions");
// const admin = require("firebase-admin"); // <--- Puedes ELIMINAR esta línea si no la usas.
const axios = require("axios"); 

// NO HAY admin.initializeApp() AQUÍ. Se hace en admin.js.

// URL REAL de tu función de validación de clave (la que ya tienes desplegada)
const VALIDATE_KEY_FUNCTION_URL = "https://us-central1-cinnahub-keygen.cloudfunctions.net/validateKey"; 

exports.robloxProxyValidate = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido. Solo POST.");
  }

  const { key } = req.body;

  if (!key) {
    console.error("PROXY ERROR: Falta la clave en la solicitud de Roblox. Body recibido:", req.body);
    return res.status(400).json({ isValid: false, message: "Falta la clave en la solicitud del proxy." });
  }

  try {
    const response = await axios.post(VALIDATE_KEY_FUNCTION_URL, { key: key }, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error("PROXY ERROR: Fallo al conectar o recibir respuesta de validateKey:", error);
    if (error.response) {
      console.error("PROXY ERROR: Respuesta de error de validateKey:", error.response.status, error.response.data);
      return res.status(error.response.status).json(error.response.data);
    } else {
      console.error("PROXY ERROR: Error de red o timeout al contactar validateKey:", error.message);
      return res.status(500).json({ isValid: false, message: "Error interno del proxy al conectar con el validador." });
    }
  }
});