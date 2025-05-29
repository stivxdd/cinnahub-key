// --- VARIABLES GLOBALES (Declaradas al principio para asegurar accesibilidad) ---
// Estas variables estarán disponibles para todas las funciones.

// Configuración de Firebase - ¡PERSONALIZA ESTO CON TUS VALORES!
const firebaseConfig = {
  apiKey: "AIzaSyBsE7Hzu_AQHduFk46Srqly89WP4n4vPew", // <-- TU API KEY
  authDomain: "cinnahub-keygen.firebaseapp.com", // <-- TU AUTH DOMAIN
  projectId: "cinnahub-keygen", // <-- TU PROJECT ID
  storageBucket: "cinnahub-keygen.firebasestorage.app", // <-- TU STORAGE BUCKET
  messagingSenderId: "865047507078", // <-- TU MESSAGING SENDER ID
  appId: "1:865047507078:web:8f90873cfd716d21a1a107" // <-- TU APP ID
};

// Referencias a elementos HTML - Las obtenemos aquí para que sean globales.
const checkpointStatusSpan = document.getElementById('current-checkpoint');
const checkpointButtonsDiv = document.getElementById('checkpoint-buttons');
const option1Button = document.getElementById('option-1-button');
const option2Button = document.getElementById('option-2-button');
const keyDisplay = document.getElementById('key-display');
const generatedKeyParagraph = document.getElementById('generated-key');
const copyKeyButton = document.getElementById('copy-key-button');

// Configuración de URLs Acortadas - ¡Tus URLs aquí!
const checkpointUrls = {
    1: [
        'https://cuty.io/OP2onuNk', 
        'https://link-center.net/1355276/mhLzCyqwizBa'
    ],
    2: [
        'https://cuty.io/77l7AqLI',
        'https://link-hub.net/1355295/eljYRfIbugqS'
    ],
    3: [
        'https://cuty.io/HFgV8wWoG',
        'https://link-hub.net/1355297/8jX2NRMAg4GL'
    ]
};


// --- FUNCIONES GLOBALES (Declaradas al principio para asegurar accesibilidad) ---

// Instancia de Firebase y Firestore (inicializada más abajo, pero declarada aquí)
let db;
let sessionId = localStorage.getItem('sessionId') || null; // Carga el ID de sesión del localStorage al inicio

// Función para redirigir al usuario a la URL acortada.
function redirectToAdPage(shortenedUrl) {
    window.location.href = shortenedUrl;
}

// Función para generar una clave aleatoria.
function generateRandomKey(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Función para obtener el número de checkpoint del parámetro de la URL.
function getCheckpointFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return parseInt(urlParams.get('return_to_checkpoint')) || 0;
}

// Función para generar un sessionId único.
function generateUniqueSessionId() {
    return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}


// --- Funciones para interactuar con Firestore ---

async function initializeFirebaseAndFirestore() {
    console.log('DEBUG: Paso 1.1 - Iniciando initializeFirebaseAndFirestore.');
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('DEBUG: Paso 1.2 - Firebase app inicializada.');
        db = firebase.firestore(); // Asigna la instancia de Firestore a la variable global 'db'
        console.log('DEBUG: Paso 1.3 - Firestore inicializado.');
    } catch (error) {
        console.error('ERROR EN INICIALIZACIÓN DE FIREBASE:', error);
        alert('Error crítico al iniciar la aplicación. Revisa la consola y tu configuración de Firebase.');
        return false;
    }
    console.log('DEBUG: Paso 1.4 - initializeFirebaseAndFirestore completado con éxito.');
    return true;
}


async function initializeSession() {
    console.log('DEBUG: Paso 2.1 - Iniciando initializeSession.');
    if (!sessionId) {
        sessionId = generateUniqueSessionId();
        localStorage.setItem('sessionId', sessionId);
        console.log('DEBUG: Paso 2.2 - Nuevo sessionId generado:', sessionId);
    } else {
        console.log('DEBUG: Paso 2.2 - Usando sessionId existente:', sessionId);
    }

    try {
        const sessionRef = db.collection('sessions').doc(sessionId);
        const doc = await sessionRef.get();
        console.log('DEBUG: Paso 2.3 - Intento de obtener documento de sesión.');

        if (!doc.exists) {
            console.log('DEBUG: Paso 2.4 - Documento de sesión NO existe, creando nuevo.');
            await sessionRef.set({
                currentCheckpoint: 0, // Inicia el progreso en 0 (no iniciado).
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                keyRef: null
            });
            console.log('DEBUG: Paso 2.5 - Documento de sesión creado.');
            return { currentCheckpoint: 0 };
        } else {
            console.log('DEBUG: Paso 2.4 - Documento de sesión existe, actualizando lastActivity.');
            await sessionRef.update({ lastActivity: firebase.firestore.FieldValue.serverTimestamp() });
            console.log('DEBUG: Paso 2.5 - Documento de sesión actualizado. Datos:', doc.data());
            return doc.data();
        }
    } catch (error) {
        console.error('ERROR EN initializeSession:', error);
        alert('Hubo un error al conectar con el servidor de progreso. Por favor, inténtalo de nuevo.');
        return { currentCheckpoint: 0 };
    }
}

async function checkAndDisplayExistingKey() {
    console.log('DEBUG: Paso 3.1 - Iniciando checkAndDisplayExistingKey.');
    if (!sessionId) {
        console.log('DEBUG: Paso 3.2 - No hay sessionId, saliendo de checkAndDisplayExistingKey.');
        return false;
    }

    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        console.log('DEBUG: Paso 3.3 - Documento de sesión obtenido para verificación de clave.');
        if (!sessionDoc.exists) {
            console.log('DEBUG: Paso 3.4 - Sesión no existe, no hay clave activa.');
            return false;
        }

        const sessionData = sessionDoc.data();
        
        if (sessionData.currentCheckpoint >= 4 && sessionData.keyRef) {
            console.log('DEBUG: Paso 3.5 - Sesión indica progreso finalizado y keyRef, intentando obtener clave.');
            const keyDoc = await sessionData.keyRef.get();
            if (keyDoc.exists) {
                const keyData = keyDoc.data();
                const now = new Date().getTime();

                if (keyData.expiresAt.toDate().getTime() > now) {
                    console.log('DEBUG: Paso 3.6 - Clave activa encontrada:', keyData.value);
                    generatedKeyParagraph.textContent = keyData.value;
                    keyDisplay.style.display = 'block';
                    checkpointButtonsDiv.style.display = 'none';
                    checkpointStatusSpan.textContent = "¡Tu clave está activa!";
                    return true;
                } else {
                    console.log('DEBUG: Paso 3.6 - Clave expirada, limpiando sesión.');
                    await sessionDoc.ref.update({
                        currentCheckpoint: 0, // Clave expirada, reinicia el progreso
                        keyRef: null
                    });
                    await keyDoc.ref.delete(); 
                }
            }
        }
        console.log('DEBUG: Paso 3.7 - No hay clave activa o expiró.');
        return false;
    } catch (error) {
        console.error('ERROR EN checkAndDisplayExistingKey:', error);
        return false;
    }
}

async function generateAndDisplayKey() {
    console.log('DEBUG: Paso 4.1 - Iniciando generateAndDisplayKey.');
    const keyLength = 25;
    let uniqueKey = '';
    let keyExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    let lastGeneratedKey = localStorage.getItem('lastGeneratedKeyAttempt') || null;

    while (keyExists && attempts < maxAttempts) {
        uniqueKey = generateRandomKey(keyLength);
        const keyQuery = await db.collection('keys').where('value', '==', uniqueKey).limit(1).get();
        if (keyQuery.empty) {
            keyExists = false;
        }
        attempts++;
    }

    if (keyExists) {
        alert('No se pudo generar una clave única. Por favor, inténtalo de nuevo.');
        return;
    }

    const expirationTimeMs = 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expirationTimeMs);

    try {
        const newKeyRef = await db.collection('keys').add({
            value: uniqueKey,
            generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            sessionId: sessionId
        });

        await db.collection('sessions').doc(sessionId).update({
            currentCheckpoint: 4, // Marca el progreso como "finalizado" (clave generada).
            keyRef: newKeyRef
        });

        generatedKeyParagraph.textContent = uniqueKey;
        keyDisplay.style.display = 'block';
        checkpointStatusSpan.textContent = "¡Clave generada!";
        checkpointButtonsDiv.style.display = 'none';

        localStorage.setItem('generatedKey', uniqueKey);
        localStorage.setItem('keyExpiration', expiresAt.toString());
        localStorage.setItem('lastGeneratedKeyAttempt', uniqueKey);

    } catch (error) {
        console.error('ERROR EN generateAndDisplayKey:', error);
        alert('Error al generar la clave. Por favor, inténtalo de nuevo.');
    }
}


// --- Función para actualizar la interfaz de usuario ---
function updateUI(checkpointActual) { 
    console.log('DEBUG: Paso 5.1 - Iniciando updateUI con checkpointActual:', checkpointActual);
    keyDisplay.style.display = 'none'; // Asegura que la clave esté oculta

    if (checkpointActual <= 3) {
        checkpointStatusSpan.textContent = `Checkpoint ${checkpointActual}`;
        checkpointButtonsDiv.style.display = 'flex';

        option1Button.textContent = `Opción 1: Cuty.io`;
        option2Button.textContent = `Opción 2: LinkVertice`;

        // Asigna la función de redirección a cada botón usando las URLs correctas.
        // Se valida que checkpointUrls[checkpointActual] no sea undefined.
        if (checkpointUrls[checkpointActual] && checkpointUrls[checkpointActual][0]) {
            option1Button.onclick = () => redirectToAdPage(checkpointUrls[checkpointActual][0]);
            option1Button.disabled = false;
        } else {
            console.error(`ERROR: URL para Checkpoint ${checkpointActual}, Opción 1 no encontrada. Deshabilitando botón.`);
            option1Button.disabled = true; // Deshabilita el botón si no hay URL
            option1Button.textContent = "Error URL";
        }

        if (checkpointUrls[checkpointActual] && checkpointUrls[checkpointActual][1]) {
            option2Button.onclick = () => redirectToAdPage(checkpointUrls[checkpointActual][1]);
            option2Button.disabled = false;
        } else {
            console.error(`ERROR: URL para Checkpoint ${checkpointActual}, Opción 2 no encontrada. Deshabilitando botón.`);
            option2Button.disabled = true; // Deshabilita el botón si no hay URL
            option2Button.textContent = "Error URL";
        }

    } else { // Si el checkpoint es 4 (o mayor), significa que se completaron todos.
        checkpointStatusSpan.textContent = "¡Proceso Completado!";
        checkpointButtonsDiv.style.display = 'none';
        generateAndDisplayKey(); // Llama a la función de generación de clave.
    }
    console.log('DEBUG: Paso 5.3 - updateUI completado.');
}


// --- Lógica de inicialización al cargar la página (el punto de entrada del script) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DEBUG: Paso 0.0 - DOMContentLoaded iniciado.');
    // 1. Inicializar Firebase y Firestore primero
    const firebaseInitialized = await initializeFirebaseAndFirestore();
    if (!firebaseInitialized) {
        checkpointStatusSpan.textContent = "Error al cargar la aplicación.";
        console.log('DEBUG: Paso 0.1 - Firebase no inicializado, saliendo.');
        return; 
    }
    console.log('DEBUG: Paso 0.2 - Firebase inicializado, continuando.');

    // 2. Inicializar la sesión del usuario con Firebase
    const sessionData = await initializeSession();
    let currentCheckpointFromDB = sessionData.currentCheckpoint;
    console.log('DEBUG: Paso 0.3 - Sesión inicializada. currentCheckpointFromDB:', currentCheckpointFromDB);
    
    // 3. Intenta mostrar la clave si ya está activa y válida (según Firestore).
    const keyActive = await checkAndDisplayExistingKey();
    if (keyActive) {
        console.log('DEBUG: Paso 0.4 - Clave activa encontrada, terminando flujo.');
        return; 
    }
    console.log('DEBUG: Paso 0.4 - No hay clave activa, continuando con flujo de checkpoints.');

    // 4. Si no hay clave activa, procede con la lógica de los checkpoints.
    const urlCheckpointParam = getCheckpointFromURL();
    console.log('DEBUG: Paso 0.5 - urlCheckpointParam (desde URL):', urlCheckpointParam);

    if (urlCheckpointParam > 0) { // Si el usuario regresó de un acortador (hay parámetro en la URL).
        console.log(`DEBUG: Paso 0.6 - URL tiene parámetro. Comparando: URL ${urlCheckpointParam} vs DB ${currentCheckpointFromDB}.`);
        
        // LÓGICA CLAVE DE AVANCE: Si el checkpoint de la URL es el que sigue al progreso en DB.
        if (urlCheckpointParam === currentCheckpointFromDB + 1) { 
            console.log('DEBUG: Paso 0.7 - Avance de checkpoint válido detectado. URL param es el siguiente esperado.');
            const newCheckpointValue = urlCheckpointParam; // El nuevo progreso es el checkpoint que ACABA de completar.
            
            try {
                console.log('DEBUG: Paso 0.8 - Intentando actualizar progreso en Firestore a:', newCheckpointValue);
                await db.collection('sessions').doc(sessionId).update({
                    currentCheckpoint: newCheckpointValue,
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentCheckpointFromDB = newCheckpointValue; // Actualiza la variable local.
                localStorage.setItem('userCheckpointProgress', newCheckpointValue.toString()); // Actualiza localStorage para UI
                console.log('DEBUG: Paso 0.9 - Progreso en Firestore y localStorage actualizado a:', newCheckpointValue);
            } catch (error) {
                console.error('ERROR AL ACTUALIZAR PROGRESO EN FIRESTORE:', error);
                alert('Hubo un error al guardar tu progreso. Revisa las reglas de seguridad de Firestore.');
            }
        } else {
            console.warn(`ADVERTENCIA: Paso 0.7 - Intento de salto o redirección incorrecta/repetida. Progreso en DB: ${currentCheckpointFromDB}, en URL: ${urlCheckpointParam}. Manteniendo progreso de DB.`);
            localStorage.setItem('userCheckpointProgress', currentCheckpointFromDB.toString()); // Ajusta localStorage al real
        }

        console.log('DEBUG: Paso 0.10 - Limpiando parámetro de URL.');
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        console.log('DEBUG: Paso 0.6 - URL sin parámetro de retorno. Sincronizando localStorage con DB.');
        localStorage.setItem('userCheckpointProgress', currentCheckpointFromDB.toString());
    }

    // Determina el checkpoint final a mostrar en la UI.
    let checkpointForUI = parseInt(localStorage.getItem('userCheckpointProgress')) || 1; 
    if (checkpointForUI > 3) {
        checkpointForUI = 4;
        localStorage.setItem('userCheckpointProgress', '4');
    }
    console.log('DEBUG: Paso 0.11 - Checkpoint final para UI:', checkpointForUI);

    // Finalmente, actualiza la interfaz de usuario según el checkpoint determinado.
    updateUI(checkpointForUI); // Llama a la función de actualización de UI.
    
    // Event listener para el botón de copiar clave
    if (copyKeyButton) {
        copyKeyButton.addEventListener('click', () => {
            const keyText = generatedKeyParagraph.textContent;
            navigator.clipboard.writeText(keyText).then(() => {
                alert('¡Clave copiada al portapapeles!');
            }).catch(err => {
                console.error('Error al copiar la clave: ', err);
                alert('No se pudo copiar la clave al portapapeles.');
            });
        });
    }
    console.log('DEBUG: Paso 0.12 - DOMContentLoaded finalizado.');
});