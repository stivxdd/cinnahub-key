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
// sessionId se genera y guarda localmente, solo para asociar la clave en Firestore.
let sessionId = localStorage.getItem('sessionId') || null; 

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


// --- Funciones para interactuar con Firestore (SOLO PARA LA CLAVE FINAL) ---

// Inicializa Firebase y Firestore. Solo se hace una vez.
async function initializeFirebaseAndFirestore() {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log('DEBUG: Firebase y Firestore inicializados correctamente.');
    } catch (error) {
        console.error('ERROR EN INICIALIZACIÓN DE FIREBASE:', error);
        alert('Error crítico al iniciar la aplicación. Revisa la consola y tu configuración de Firebase.');
        return false;
    }
    return true;
}

// Verifica si existe una clave activa en localStorage y la valida con Firestore.
async function checkAndDisplayExistingKey() {
    const storedKey = localStorage.getItem('generatedKey');
    const storedExpiration = localStorage.getItem('keyExpiration');
    const storedSessionId = localStorage.getItem('sessionId'); // Necesitamos el sessionId para buscar en DB

    if (storedKey && storedExpiration && storedSessionId) {
        const now = new Date().getTime();
        const expirationDate = parseInt(storedExpiration);

        if (now < expirationDate) {
            // Clave activa localmente, verificar que aún existe en Firestore y pertenece a esta sesión.
            try {
                // Busca la clave en Firestore por su valor y sessionId.
                const keyQuery = await db.collection('keys')
                                         .where('value', '==', storedKey)
                                         .where('sessionId', '==', storedSessionId)
                                         .limit(1) // Solo necesitamos encontrar una.
                                         .get();

                if (!keyQuery.empty) {
                    // La clave fue encontrada en Firestore y coincide con la sesión.
                    // Esto indica que es una clave válida y no fue manipulada localmente.
                    generatedKeyParagraph.textContent = storedKey;
                    keyDisplay.style.display = 'block';
                    checkpointButtonsDiv.style.display = 'none';
                    checkpointStatusSpan.textContent = "¡Tu clave está activa!";
                    localStorage.setItem('userCheckpointProgress', '4'); // Aseguramos el progreso local como finalizado.
                    return true; // Clave activa y verificada.
                } else {
                    // Clave local no encontrada en Firestore o no coincide (posible manipulación/borrado en DB).
                    console.warn('ADVERTENCIA: Clave local no encontrada o no válida en Firestore. Reseteando progreso local.');
                    localStorage.clear(); // Limpia todo el progreso local si hay inconsistencia.
                }
            } catch (error) {
                console.error('ERROR verificando clave en Firestore:', error);
                alert('Hubo un error al verificar tu clave. Por favor, reinicia la página.');
                localStorage.clear(); // Ante un error, es mejor resetear.
            }
        } else {
            // Clave expirada localmente.
            console.log('DEBUG: Clave local expirada.');
            localStorage.clear(); // Limpia todo el progreso local.
        }
    }
    return false; // No hay clave válida localmente o no pasó la verificación de Firestore.
}

// Genera una nueva clave, la guarda en Firestore y actualiza la UI.
async function generateAndDisplayKey() {
    const keyLength = 25;
    let uniqueKey = '';
    let keyExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    let lastGeneratedKeyAttempt = localStorage.getItem('lastGeneratedKeyAttempt') || null;

    // Genera una clave única (evitando repeticiones *locales* consecutivas)
    while (keyExists && attempts < maxAttempts) {
        uniqueKey = generateRandomKey(keyLength);
        // Verifica unicidad en la base de datos de Firestore.
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
        // Asegúrate de que haya un sessionId local para asociar la clave.
        if (!sessionId) {
            sessionId = generateUniqueSessionId();
            localStorage.setItem('sessionId', sessionId);
        }

        // Guarda la nueva clave en la colección 'keys' de Firestore.
        await db.collection('keys').add({
            value: uniqueKey,
            generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            sessionId: sessionId // Asocia la clave con la sesión local.
        });

        generatedKeyParagraph.textContent = uniqueKey;
        keyDisplay.style.display = 'block';
        checkpointStatusSpan.textContent = "¡Clave generada!";
        checkpointButtonsDiv.style.display = 'none';

        // Guarda la clave y su expiración en localStorage.
        localStorage.setItem('generatedKey', uniqueKey);
        localStorage.setItem('keyExpiration', expiresAt.toString());
        localStorage.setItem('lastGeneratedKeyAttempt', uniqueKey);
        localStorage.setItem('userCheckpointProgress', '4'); // Marca el progreso local como finalizado.

    } catch (error) {
        console.error('ERROR al generar o guardar clave en Firestore:', error);
        alert('Error al generar la clave. Por favor, inténtalo de nuevo.');
    }
}


// --- Función para actualizar la interfaz de usuario (basada SOLO en localStorage para checkpoints) ---
function updateUI() { 
    keyDisplay.style.display = 'none'; // Asegura que la clave esté oculta.

    // Obtener el progreso directamente de localStorage para la UI más reciente.
    // userCheckpointProgress ahora es la única fuente de verdad para el progreso de la UI.
    let currentProgressForUI = parseInt(localStorage.getItem('userCheckpointProgress')) || 1; 

    // Ajusta el progreso si es mayor a 3, marcándolo como el estado final.
    if (currentProgressForUI > 3) {
        currentProgressForUI = 4;
        localStorage.setItem('userCheckpointProgress', '4'); // Mantener consistencia.
    }

    if (currentProgressForUI <= 3) { // Si estamos en un checkpoint activo (1, 2 o 3).
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

    } else { // Si el progreso es 4, significa que se completaron todos los checkpoints.
        checkpointStatusSpan.textContent = "¡Proceso Completado!";
        checkpointButtonsDiv.style.display = 'none';
        generateAndDisplayKey(); // Llama a la función de generación de clave.
    }
    console.log('DEBUG: updateUI completado con UI para checkpoint:', currentProgressForUI);
}


// --- Lógica de inicialización al cargar la página (el punto de entrada del script) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DEBUG: DOMContentLoaded iniciado.');
    
    // 1. Inicializar Firebase y Firestore. (Solo para la gestión de la clave final).
    const firebaseInitialized = await initializeFirebaseAndFirestore();
    if (!firebaseInitialized) {
        checkpointStatusSpan.textContent = "Error al cargar la aplicación (Firebase).";
        console.error('DEBUG: Firebase no inicializado, saliendo.');
        return; 
    }
    console.log('DEBUG: Firebase inicializado, continuando.');

    // 2. Intentar mostrar la clave si ya está activa (verifica local y en Firestore).
    const keyActive = await checkAndDisplayExistingKey();
    if (keyActive) {
        console.log('DEBUG: Clave activa encontrada, terminando flujo.');
        return; // Si la clave está activa y se mostró, terminamos.
    }
    console.log('DEBUG: No hay clave activa, continuando con flujo de checkpoints.');

    // 3. Manejar el progreso de los checkpoints (AHORA SOLO CON URL Y localStorage).
    let currentProgress = parseInt(localStorage.getItem('userCheckpointProgress')) || 1; // Obtiene el progreso local.
    const urlCheckpointParam = getCheckpointFromURL(); // Obtiene el checkpoint de la URL de retorno.
    
    console.log(`DEBUG: Carga - Progreso local: ${currentProgress}, Parámetro URL: ${urlCheckpointParam}`);

    if (urlCheckpointParam > 0) { // Si regresó de un acortador (hay parámetro en la URL).
        // Si el parámetro de la URL indica el checkpoint que el usuario acaba de completar
        // Y es el checkpoint que estaba intentando (currentProgress)
        if (urlCheckpointParam === currentProgress) { 
            currentProgress++; // Avanza al siguiente checkpoint.
            localStorage.setItem('userCheckpointProgress', currentProgress.toString()); // Guarda el nuevo progreso local.
            console.log('DEBUG: Progreso local avanzado a:', currentProgress);
        } else {
            // Si hay un salto en la URL o una redirección inesperada, mantenemos el progreso local.
            console.warn(`ADVERTENCIA: Intento de salto o redirección inesperada. Progreso local: ${currentProgress}, en URL: ${urlCheckpointParam}. Manteniendo progreso local.`);
        }
        // Limpia el parámetro de la URL después de procesarlo.
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Si no hay parámetro de URL, simplemente usamos el progreso local actual.
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