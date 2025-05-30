// --- VARIABLES GLOBALES (Declaradas al principio para asegurar accesibilidad) ---

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
        'https://shrinkme.ink/CinnaHubKey'
    ],
    2: [
        'https://cuty.io/77l7AqLI',
        'https://shrinkme.ink/CinnaHubKey2'
    ],
    3: [
        'https://cuty.io/HFgV8wWoG',
        'https://shrinkme.ink/CinnaHubKey3'
    ]
};


// --- FUNCIONES GLOBALES ---

// Instancia de Firebase y Firestore (inicializada más abajo)
let db;
let sessionId = localStorage.getItem('sessionId') || null; // Carga el ID de sesión del localStorage al inicio

// Función para redirigir al usuario a la URL acortada.
function redirectToAdPage(shortenedUrl) {
    window.location.href = shortenedUrl;
}

// Función para generar una clave aleatoria.
function generateRandomKey(length) {
    // --- CAMBIO AQUÍ: SOLO LETRAS DEL ABECEDARIO ---
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'; 
    // --- FIN CAMBIO ---
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
        db = firebase.firestore();
        console.log('DEBUG: Paso 1.3 - Firestore inicializado.');
    } catch (error) {
        console.error('ERROR EN INICIALIZACIÓN DE FIREBASE:', error);
        alert('Error crítico al iniciar la aplicación. Revisa la consola y tu configuración de Firebase.');
        return false;
    }
    console.log('DEBUG: Paso 1.4 - initializeFirebaseAndFirestore completado con éxito.');
    return true;
}

async function checkAndDisplayExistingKey() {
    console.log('DEBUG: Paso 3.1 - Iniciando checkAndDisplayExistingKey.');
    if (!sessionId) {
        console.log('DEBUG: Paso 3.2 - No hay sessionId, saliendo de checkAndDisplayExistingKey.');
        return false;
    }

    try {
        // La colección 'sessions' ya no se usa para el progreso, pero la verificamos para la keyRef
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) { // Si no existe la sesión, no hay key asociada en la DB.
             localStorage.clear(); // Limpiamos todo localmente si no hay sesión en DB
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
                    localStorage.setItem('userCheckpointProgress', '4'); // Sincroniza progreso local
                    return true;
                } else {
                    console.log('DEBUG: Paso 3.6 - Clave expirada, limpiando sesión.');
                    await sessionDoc.ref.update({
                        currentCheckpoint: 0, // Clave expirada, reinicia el progreso en la DB
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
        localStorage.clear(); // En caso de error, resetear el progreso local
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
    const expiresAt = firebase.firestore.Timestamp.fromMillis(new Date().getTime() + expirationTimeMs); 

    try {
        // Asegurarse de que el sessionId exista para asociar la clave.
        if (!sessionId) {
            sessionId = generateUniqueSessionId();
            localStorage.setItem('sessionId', sessionId);
        }

        const newKeyRef = await db.collection('keys').add({
            value: uniqueKey,
            generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt, 
            sessionId: sessionId
        });

        // Actualiza la sesión en Firestore para vincular la clave generada
        await db.collection('sessions').doc(sessionId).set(
            {
                currentCheckpoint: 4, 
                keyRef: newKeyRef,
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            },
            { merge: true } 
        );

        generatedKeyParagraph.textContent = uniqueKey;
        keyDisplay.style.display = 'block';
        checkpointStatusSpan.textContent = "¡Clave generada!";
        checkpointButtonsDiv.style.display = 'none';

        localStorage.setItem('generatedKey', uniqueKey);
        localStorage.setItem('keyExpiration', expiresAt.toMillis().toString()); 
        localStorage.setItem('lastGeneratedKeyAttempt', uniqueKey);
        localStorage.setItem('userCheckpointProgress', '4');

    } catch (error) {
        console.error('ERROR EN generateAndDisplayKey:', error);
        alert('Error al generar la clave. Por favor, inténtalo de nuevo.');
    }
}


// --- Función para actualizar la interfaz de usuario (basada SOLO en localStorage para checkpoints) ---
function updateUI(checkpointActual) { 
    console.log('DEBUG: Paso 5.1 - Iniciando updateUI con checkpointActual:', checkpointActual);
    keyDisplay.style.display = 'none';

    let currentProgressForUI = parseInt(localStorage.getItem('userCheckpointProgress')) || 1; 

    if (currentProgressForUI > 3) {
        currentProgressForUI = 4;
        localStorage.setItem('userCheckpointProgress', '4');
    }

    if (currentProgressForUI <= 3) {
        checkpointStatusSpan.textContent = `Checkpoint ${currentProgressForUI}`;
        checkpointButtonsDiv.style.display = 'flex';

        option1Button.textContent = `Opción 1: Cuty.io`;
        option2Button.textContent = `Opción 2: LinkVertice`;

        if (checkpointUrls[currentProgressForUI] && checkpointUrls[currentProgressForUI][0]) {
            option1Button.onclick = () => redirectToAdPage(checkpointUrls[currentProgressForUI][0]);
            option1Button.disabled = false;
        } else {
            console.error(`ERROR: URL para Checkpoint ${currentProgressForUI}, Opción 1 no encontrada. Deshabilitando botón.`);
            option1Button.disabled = true;
            option1Button.textContent = "Error URL";
        }

        if (checkpointUrls[currentProgressForUI] && checkpointUrls[currentProgressForUI][1]) {
            option2Button.onclick = () => redirectToAdPage(checkpointUrls[currentProgressForUI][1]);
            option2Button.disabled = false;
        } else {
            console.error(`ERROR: URL para Checkpoint ${currentProgressForUI}, Opción 2 no encontrada. Deshabilitando botón.`);
            option2Button.disabled = true;
            option2Button.textContent = "Error URL";
        }

    } else {
        checkpointStatusSpan.textContent = "¡Proceso Completado!";
        checkpointButtonsDiv.style.display = 'none';
        generateAndDisplayKey();
    }
    console.log('DEBUG: Paso 5.3 - updateUI completado.');
}


// --- Lógica de inicialización al cargar la página (el punto de entrada del script) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DEBUG: DOMContentLoaded iniciado.');
    
    // 1. Inicializar Firebase y Firestore.
    const firebaseInitialized = await initializeFirebaseAndFirestore();
    if (!firebaseInitialized) {
        checkpointStatusSpan.textContent = "Error al cargar la aplicación (Firebase).";
        console.log('DEBUG: Paso 0.1 - Firebase no inicializado, saliendo.');
        return; 
    }
    console.log('DEBUG: Paso 0.2 - Firebase inicializado, continuando.');

    // 2. Intentar mostrar la clave si ya está activa (verifica local y en Firestore).
    const keyActive = await checkAndDisplayExistingKey();
    if (keyActive) {
        console.log('DEBUG: Paso 0.4 - Clave activa encontrada, terminando flujo.');
        return; 
    }
    console.log('DEBUG: Paso 0.4 - No hay clave activa, continuando con flujo de checkpoints.');

    // 3. Manejar el progreso de los checkpoints (AHORA SOLO CON URL Y localStorage).
    let currentProgress = parseInt(localStorage.getItem('userCheckpointProgress')) || 1; 
    const urlCheckpointParam = getCheckpointFromURL();
    
    console.log(`DEBUG: Carga - Progreso local: ${currentProgress}, Parámetro URL: ${urlCheckpointParam}`);

    if (urlCheckpointParam > 0) { // Si regresó de un acortador (hay parámetro en la URL).
        if (urlCheckpointParam === currentProgress) { 
            currentProgress++; // Avanza al siguiente checkpoint.
            localStorage.setItem('userCheckpointProgress', currentProgress.toString()); // Guarda el nuevo progreso local.
            console.log('DEBUG: Progreso local avanzado a:', currentProgress);
        } else {
            console.warn(`ADVERTENCIA: Intento de salto o redirección inesperada. Progreso local: ${currentProgress}, en URL: ${urlCheckpointParam}. Manteniendo progreso local.`);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        console.log('DEBUG: No hay parámetro de URL. Usando progreso local:', currentProgress);
    }

    updateUI(currentProgress); // Actualiza la interfaz.
    
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
    console.log('DEBUG: DOMContentLoaded finalizado.');
});