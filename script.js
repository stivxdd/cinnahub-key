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


// --- Funciones para interactuar con Firestore ---

async function initializeFirebaseAndFirestore() {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(); // Asigna la instancia de Firestore a la variable global 'db'
        console.log('Firebase y Firestore inicializados correctamente.');
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
        alert('Error crítico al iniciar la aplicación. Revisa la consola y tu configuración de Firebase.');
        return false; // Indica fallo en la inicialización
    }
    return true; // Indica éxito
}


async function initializeSession() {
    if (!sessionId) {
        sessionId = generateUniqueSessionId();
        localStorage.setItem('sessionId', sessionId);
    }

    try {
        const sessionRef = db.collection('sessions').doc(sessionId);
        const doc = await sessionRef.get();

        if (!doc.exists) {
            await sessionRef.set({
                currentCheckpoint: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                keyRef: null
            });
            return { currentCheckpoint: 0 };
        } else {
            await sessionRef.update({ lastActivity: firebase.firestore.FieldValue.serverTimestamp() });
            return doc.data();
        }
    } catch (error) {
        console.error('Error al inicializar la sesión con Firestore:', error);
        alert('Hubo un error al conectar con el servidor de progreso. Por favor, inténtalo de nuevo.');
        return { currentCheckpoint: 0 };
    }
}

async function checkAndDisplayExistingKey() {
    if (!sessionId) return false;

    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return false;
        }

        const sessionData = sessionDoc.data();
        
        if (sessionData.currentCheckpoint >= 4 && sessionData.keyRef) {
            const keyDoc = await sessionData.keyRef.get();
            if (keyDoc.exists) {
                const keyData = keyDoc.data();
                const now = new Date().getTime();

                if (keyData.expiresAt.toDate().getTime() > now) {
                    generatedKeyParagraph.textContent = keyData.value;
                    keyDisplay.style.display = 'block';
                    checkpointButtonsDiv.style.display = 'none';
                    checkpointStatusSpan.textContent = "¡Tu clave está activa!";
                    return true;
                } else {
                    await sessionDoc.ref.update({
                        currentCheckpoint: 0,
                        keyRef: null
                    });
                    await keyDoc.ref.delete(); 
                }
            }
        }
        return false;
    } catch (error) {
        console.error('Error al verificar clave activa con Firestore:', error);
        return false;
    }
}

async function generateAndDisplayKey() {
    const keyLength = 25;
    let uniqueKey = '';
    let keyExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    // Obtener la última clave generada desde localStorage si existe (para unicidad cliente-side temporal)
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
            currentCheckpoint: 4,
            keyRef: newKeyRef
        });

        generatedKeyParagraph.textContent = uniqueKey;
        keyDisplay.style.display = 'block';
        checkpointStatusSpan.textContent = "¡Clave generada!";
        checkpointButtonsDiv.style.display = 'none';

        // Almacenar la clave generada en localStorage para la próxima vez
        localStorage.setItem('generatedKey', uniqueKey);
        localStorage.setItem('keyExpiration', expiresAt.toString());
        localStorage.setItem('lastGeneratedKeyAttempt', uniqueKey);

    } catch (error) {
        console.error('Error al guardar clave o actualizar sesión en Firestore:', error);
        alert('Error al generar la clave. Por favor, inténtalo de nuevo.');
    }
}


// --- Función principal que se ejecuta cuando el DOM está completamente cargado ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar Firebase y Firestore primero
    const firebaseInitialized = await initializeFirebaseAndFirestore();
    if (!firebaseInitialized) {
        // Si Firebase no se inicializa, salimos. Los errores ya se habrán mostrado.
        checkpointStatusSpan.textContent = "Error al cargar la aplicación.";
        return; 
    }

    // 2. Inicializar la sesión del usuario con Firebase
    const sessionData = await initializeSession();
    let currentCheckpointFromDB = sessionData.currentCheckpoint;
    
    // 3. Intenta mostrar la clave si ya está activa y válida (según Firestore).
    const keyActive = await checkAndDisplayExistingKey();
    if (keyActive) {
        return; // Si la clave está activa y se mostró correctamente, terminamos la ejecución aquí.
    }

    // 4. Si no hay clave activa, procede con la lógica de los checkpoints.
    const urlCheckpointParam = getCheckpointFromURL();

    if (urlCheckpointParam > 0) {
        if (urlCheckpointParam === currentCheckpointFromDB) {
            const newCheckpointValue = urlCheckpointParam + 1;
            
            try {
                await db.collection('sessions').doc(sessionId).update({
                    currentCheckpoint: newCheckpointValue,
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentCheckpointFromDB = newCheckpointValue;
                localStorage.setItem('userCheckpointProgress', newCheckpointValue.toString()); // Actualiza localStorage para UI
            } catch (error) {
                console.error('Error al actualizar progreso en Firestore:', error);
                alert('Hubo un error al guardar tu progreso.');
            }
        } else {
            console.warn(`Intento de salto o redirección incorrecta. Progreso en DB: ${currentCheckpointFromDB}, en URL: ${urlCheckpointParam}.`);
            localStorage.setItem('userCheckpointProgress', currentCheckpointFromDB.toString()); // Ajusta localStorage al real
        }

        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        localStorage.setItem('userCheckpointProgress', currentCheckpointFromDB.toString()); // Asegura que localStorage esté sincronizado
    }

    // Asegurarse de que el estado local de currentCheckpoint esté alineado con el de la DB,
    // y si es mayor a 3, forzarlo al estado final (4).
    let currentCheckpoint = parseInt(localStorage.getItem('userCheckpointProgress')) || 1; // Obtiene el último valor real.
    if (currentCheckpoint > 3) {
        currentCheckpoint = 4;
        localStorage.setItem('userCheckpointProgress', '4');
    }

    // Finalmente, actualiza la interfaz de usuario según el checkpoint determinado.
    updateUI(currentCheckpoint); // Llama a la función de actualización de UI.

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

    // --- Función para actualizar la interfaz de usuario (declarada aquí para usar variables del DOMContentLoaded) ---
    function updateUI(checkpointToShow) { 
        keyDisplay.style.display = 'none';

        if (checkpointToShow <= 3) {
            checkpointStatusSpan.textContent = `Checkpoint ${checkpointToShow}`;
            checkpointButtonsDiv.style.display = 'flex';

            option1Button.textContent = `Opción 1: Cuty.io`;
            option2Button.textContent = `Opción 2: LinkVertice`;

            // Asigna la función de redirección a cada botón usando las URLs correctas
            // y asegurándose de que checkpointUrls[checkpointToShow] sea válido.
            if (checkpointUrls[checkpointToShow] && checkpointUrls[checkpointToShow][0]) {
                option1Button.onclick = () => redirectToAdPage(checkpointUrls[checkpointToShow][0]);
            } else {
                console.error(`URL para Checkpoint ${checkpointToShow}, Opción 1 no encontrada.`);
                option1Button.disabled = true; // Deshabilita el botón si no hay URL
            }

            if (checkpointUrls[checkpointToShow] && checkpointUrls[checkpointToShow][1]) {
                option2Button.onclick = () => redirectToAdPage(checkpointUrls[checkpointToShow][1]);
            } else {
                console.error(`URL para Checkpoint ${checkpointToShow}, Opción 2 no encontrada.`);
                option2Button.disabled = true; // Deshabilita el botón si no hay URL
            }

        } else {
            checkpointStatusSpan.textContent = "¡Proceso Completado!";
            checkpointButtonsDiv.style.display = 'none';
            generateAndDisplayKey(); // Llama a la función de generación de clave.
        }
    }
});