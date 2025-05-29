// --- FUNCIONES GLOBALES (Declaradas al principio para asegurar accesibilidad) ---

// Función para redirigir al usuario a la URL acortada.
function redirectToAdPage(shortenedUrl, checkpointNum) {
    // La redirección ocurre simplemente cambiando la ubicación de la ventana del navegador.
    // ¡RECUERDA!: El servicio de acortamiento de URL debe redirigir DE VUELTA
    // a tu `index.html?return_to_checkpoint=${checkpointNum}` después de su proceso.
    window.location.href = shortenedUrl;
}

// Función para generar una clave aleatoria (utilizada por generateAndDisplayKey).
function generateRandomKey(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Función para actualizar la interfaz de usuario (qué botones mostrar, qué texto).
// NOTA: Esta función ahora recibe las referencias a los elementos HTML como parámetros
// para asegurar que estén definidas cuando la función se llama desde cualquier lugar.
function updateUIForCheckpoint(checkpoint, checkpointStatusSpan, checkpointButtonsDiv, option1Button, option2Button, keyDisplay, generatedKeyParagraph, checkpointUrls, generateAndDisplayKey) {
    keyDisplay.style.display = 'none'; // Asegura que la clave esté oculta al cambiar de estado.

    if (checkpoint <= 3) { // Si estamos en un checkpoint activo (1, 2 o 3).
        // Si el checkpoint que se intenta mostrar es menor que el progreso real guardado,
        // forzamos la UI a mostrar el progreso real para evitar saltos.
        // Nota: currentCheckpoint es una variable local en DOMContentLoaded, aquí accedemos a userCheckpointProgress
        // para la lógica de visualización robusta.
        const userProgress = parseInt(localStorage.getItem('userCheckpointProgress')) || 1;
        if (checkpoint < userProgress) {
             checkpoint = userProgress; // Ajusta el checkpoint visual al progreso real.
        }

        checkpointStatusSpan.textContent = `Checkpoint ${checkpoint}`;
        checkpointButtonsDiv.style.display = 'flex';

        option1Button.textContent = `Opción 1: Cuty.io`;
        option2Button.textContent = `Opción 2: LinkVertice`;

        // Asigna la función de redirección a cada botón, usando las URLs acortadas.
        option1Button.onclick = () => redirectToAdPage(checkpointUrls[checkpoint][0], checkpoint);
        option2Button.onclick = () => redirectToAdPage(checkpointUrls[checkpoint][1], checkpoint);

    } else { // Si el checkpoint es 4 (o mayor), significa que se completaron todos.
        checkpointStatusSpan.textContent = "¡Proceso Completado!";
        checkpointButtonsDiv.style.display = 'none';
        generateAndDisplayKey(); // Llama a la función de generación de clave.
    }
}


// --- INICIO DEL CÓDIGO QUE SE EJECUTA CUANDO EL DOM ESTÁ CARGADO ---
document.addEventListener('DOMContentLoaded', async () => {
    // --- CONFIGURACIÓN DE FIREBASE (PEGA TU firebaseConfig AQUÍ) ---
    const firebaseConfig = {
      apiKey: "AIzaSyBsE7Hzu_AQHduFk46Srqly89WP4n4vPew", // <-- TU API KEY
      authDomain: "cinnahub-keygen.firebaseapp.com", // <-- TU AUTH DOMAIN
      projectId: "cinnahub-keygen", // <-- TU PROJECT ID
      storageBucket: "cinnahub-keygen.firebasestorage.app", // <-- TU STORAGE BUCKET
      messagingSenderId: "865047507078", // <-- TU MESSAGING SENDER ID
      appId: "1:865047507078:web:8f90873cfd716d21a1a107" // <-- TU APP ID
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    // --- FIN CONFIGURACIÓN DE FIREBASE ---


    // Obtenemos referencias a los elementos HTML de tu página
    const checkpointStatusSpan = document.getElementById('current-checkpoint');
    const checkpointButtonsDiv = document.getElementById('checkpoint-buttons');
    const option1Button = document.getElementById('option-1-button');
    const option2Button = document.getElementById('option-2-button');
    const keyDisplay = document.getElementById('key-display');
    const generatedKeyParagraph = document.getElementById('generated-key');
    const copyKeyButton = document.getElementById('copy-key-button');

    // sessionId se guardará en localStorage para identificar al usuario a través de visitas.
    let sessionId = localStorage.getItem('sessionId') || null;

    // --- Configuración de URLs Acortadas para cada Checkpoint ---
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
    // --- FIN de Configuración de URLs ---


    // Función para obtener el número de checkpoint del parámetro de la URL.
    function getCheckpointFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return parseInt(urlParams.get('return_to_checkpoint')) || 0;
    }

    // Función para generar un sessionId único si el navegador no tiene uno guardado.
    function generateUniqueSessionId() {
        return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }


    // --- Funciones para interactuar con Firestore (el "Backend") ---

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

        } catch (error) {
            console.error('Error al guardar clave o actualizar sesión en Firestore:', error);
            alert('Error al generar la clave. Por favor, inténtalo de nuevo.');
        }
    }


    // --- Lógica de inicialización al cargar la página (el punto de entrada del script) ---

    // 1. Al cargar la página, primero inicializa la sesión con Firebase.
    const sessionData = await initializeSession();
    let currentCheckpointFromDB = sessionData.currentCheckpoint;
    
    // 2. Intenta mostrar la clave si ya está activa y válida (según Firestore).
    const keyActive = await checkAndDisplayExistingKey();
    if (keyActive) {
        return; 
    }

    // 3. Si no hay clave activa, procede con la lógica de los checkpoints.
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
            } catch (error) {
                console.error('Error al actualizar progreso en Firestore:', error);
                alert('Hubo un error al guardar tu progreso.');
            }
        } else {
            console.warn(`Intento de salto o redirección incorrecta. Progreso en DB: ${currentCheckpointFromDB}, en URL: ${urlCheckpointParam}.`);
        }

        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // currentCheckpointFromDB ya tiene el valor correcto.
    }

    let currentCheckpoint = currentCheckpointFromDB;
    if (currentCheckpoint > 3) {
        currentCheckpoint = 4;
    }

    // Llamada a updateUIForCheckpoint pasando las dependencias necesarias.
    updateUIForCheckpoint(currentCheckpoint, checkpointStatusSpan, checkpointButtonsDiv, option1Button, option2Button, keyDisplay, generatedKeyParagraph, checkpointUrls, generateAndDisplayKey);

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
});