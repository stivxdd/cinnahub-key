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


// --- FUNCIONES GLOBALES ---
// Instancia de Firebase y Firestore (inicializada más abajo)
let db;

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


// --- Funciones para interactuar con Firestore (SOLO PARA LA CLAVE FINAL) ---

async function initializeFirebaseAndFirestore() {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log('Firebase y Firestore inicializados correctamente.');
    } catch (error) {
        console.error('ERROR EN INICIALIZACIÓN DE FIREBASE:', error);
        alert('Error crítico al iniciar la aplicación. Revisa la consola y tu configuración de Firebase.');
        return false;
    }
    return true;
}

// Función para verificar y mostrar la clave si ya está activa (ahora solo de localStorage)
// y verificar su existencia en Firestore.
async function checkAndDisplayExistingKey() {
    const storedKey = localStorage.getItem('generatedKey');
    const storedExpiration = localStorage.getItem('keyExpiration');
    const storedSessionId = localStorage.getItem('sessionId'); // Necesitamos el sessionId para buscar en DB

    if (storedKey && storedExpiration && storedSessionId) {
        const now = new Date().getTime();
        const expirationDate = parseInt(storedExpiration);

        if (now < expirationDate) {
            // Clave activa localmente, pero verificar en Firestore si realmente existe y pertenece a esta sesión
            try {
                // Asume que la clave tiene el sessionId como un campo, o un ID único
                const keyQuery = await db.collection('keys')
                                         .where('value', '==', storedKey)
                                         .where('sessionId', '==', storedSessionId)
                                         .limit(1)
                                         .get();

                if (!keyQuery.empty) {
                    // Clave encontrada en Firestore y es la misma sesión.
                    generatedKeyParagraph.textContent = storedKey;
                    keyDisplay.style.display = 'block';
                    checkpointButtonsDiv.style.display = 'none';
                    checkpointStatusSpan.textContent = "¡Tu clave está activa!";
                    return true; // Clave activa y verificada
                } else {
                    // Clave no encontrada en Firestore o no coincide con sessionId (manipulación, borrado en DB)
                    console.warn('Clave local no encontrada o no válida en Firestore. Reseteando.');
                    localStorage.clear(); // Limpia todo el progreso local si hay inconsistencia
                    // No hay 'sessions' aquí para resetear el progreso, se empieza desde cero.
                }
            } catch (error) {
                console.error('Error verificando clave en Firestore:', error);
                localStorage.clear(); // Ante un error, es mejor resetear.
            }
        } else {
            // Clave expirada localmente
            localStorage.clear(); // Limpia todo el progreso local
        }
    }
    return false; // No hay clave válida localmente o no pasó la verificación de Firestore
}

// Función para generar la clave y guardarla en Firestore (el único rol de la DB para el usuario)
async function generateAndDisplayKey() {
    const keyLength = 25;
    let uniqueKey = '';
    let keyExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    let lastGeneratedKeyAttempt = localStorage.getItem('lastGeneratedKeyAttempt') || null;

    while (keyExists && attempts < maxAttempts) {
        uniqueKey = generateRandomKey(keyLength);
        // Verificar unicidad en Firestore
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
    const expiresAt = new Date().getTime() + expirationTimeMs;

    try {
        // Generar un sessionId si no existe, solo para asociar la clave. No para el progreso de CPs.
        let currentSessionId = localStorage.getItem('sessionId');
        if (!currentSessionId) {
            currentSessionId = 'session_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('sessionId', currentSessionId);
        }

        await db.collection('keys').add({
            value: uniqueKey,
            generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            sessionId: currentSessionId // Asocia la clave con esta sesión local
        });

        generatedKeyParagraph.textContent = uniqueKey;
        keyDisplay.style.display = 'block';
        checkpointStatusSpan.textContent = "¡Clave generada!";
        checkpointButtonsDiv.style.display = 'none';

        // Guardar la clave y su expiración en localStorage
        localStorage.setItem('generatedKey', uniqueKey);
        localStorage.setItem('keyExpiration', expiresAt.toString());
        localStorage.setItem('lastGeneratedKeyAttempt', uniqueKey);
        localStorage.setItem('userCheckpointProgress', '4'); // Marcar progreso local como completado

    } catch (error) {
        console.error('Error al generar o guardar clave en Firestore:', error);
        alert('Error al generar la clave. Por favor, inténtalo de nuevo.');
    }
}


// --- Función para actualizar la interfaz de usuario ---
// Esta función ahora depende SOLO del localStorage para el progreso de los checkpoints.
function updateUI() {
    keyDisplay.style.display = 'none'; // Asegura que la clave esté oculta

    // Obtener el progreso directamente de localStorage para la UI más reciente
    let currentProgressForUI = parseInt(localStorage.getItem('userCheckpointProgress')) || 1; 

    if (currentProgressForUI > 3) { // Si el progreso es 4 o más, significa que se completaron todos.
        currentProgressForUI = 4;
        localStorage.setItem('userCheckpointProgress', '4'); // Mantener consistencia local
    }

    if (currentProgressForUI <= 3) {
        checkpointStatusSpan.textContent = `Checkpoint ${currentProgressForUI}`;
        checkpointButtonsDiv.style.display = 'flex';

        option1Button.textContent = `Opción 1: Cuty.io`;
        option2Button.textContent = `Opción 2: LinkVertice`;

        // Asigna la función de redirección a cada botón usando las URLs correctas.
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

    } else { // Si el progreso es 4, se completaron todos.
        checkpointStatusSpan.textContent = "¡Proceso Completado!";
        checkpointButtonsDiv.style.display = 'none';
        generateAndDisplayKey(); // Llama a la función de generación de clave.
    }
    console.log('DEBUG: updateUI completado con UI para checkpoint:', currentProgressForUI);
}


// --- Lógica de inicialización al cargar la página (el punto de entrada del script) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DEBUG: DOMContentLoaded iniciado.');
    
    // 1. Inicializar Firebase y Firestore
    const firebaseInitialized = await initializeFirebaseAndFirestore();
    if (!firebaseInitialized) {
        checkpointStatusSpan.textContent = "Error al cargar la aplicación.";
        console.error('DEBUG: Firebase no inicializado, saliendo.');
        return; 
    }
    console.log('DEBUG: Firebase inicializado, continuando.');

    // 2. Intentar mostrar la clave si ya está activa (verificando local y en Firestore).
    const keyActive = await checkAndDisplayExistingKey();
    if (keyActive) {
        console.log('DEBUG: Clave activa encontrada, terminando flujo.');
        return; // Si la clave está activa y se mostró, terminamos.
    }
    console.log('DEBUG: No hay clave activa, continuando con flujo de checkpoints.');

    // 3. Manejar el progreso de los checkpoints (ahora solo con URL y localStorage)
    const urlCheckpointParam = getCheckpointFromURL();
    let currentProgress = parseInt(localStorage.getItem('userCheckpointProgress')) || 1;
    
    console.log(`DEBUG: Carga inicial - Progreso actual local: ${currentProgress}, Parámetro URL: ${urlCheckpointParam}`);

    if (urlCheckpointParam > 0) { // Si regresó de un acortador (hay parámetro en la URL)
        // Solo avanzamos si el checkpoint de la URL es el siguiente lógico.
        if (urlCheckpointParam === currentProgress) { // Usuario completó el checkpoint que estaba intentando
            currentProgress++; // Avanza al siguiente checkpoint
            localStorage.setItem('userCheckpointProgress', currentProgress.toString()); // Guarda el nuevo progreso
            console.log('DEBUG: Progreso avanzado en localStorage a:', currentProgress);
        } else {
            // Si el parámetro de la URL no coincide (salto, o volver a un ya completado),
            // lo dejamos en el progreso que tenía antes de la redirección.
            console.warn(`ADVERTENCIA: Intento de salto o redirección inesperada. Progreso local: ${currentProgress}, en URL: ${urlCheckpointParam}. Manteniendo progreso local.`);
        }
        // Limpia el parámetro de la URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Si no hay parámetro en la URL, simplemente usa el progreso local actual.
        console.log('DEBUG: No hay parámetro de URL. Usando progreso local:', currentProgress);
    }

    // Finalmente, actualiza la interfaz de usuario.
    updateUI(); 
    
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