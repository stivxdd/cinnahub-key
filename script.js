// --- FUNCIONES GLOBALES (Declaradas al principio para asegurar accesibilidad) ---

// Función para redirigir al usuario a la URL acortada.
function redirectToAdPage(shortenedUrl) { // Ya no necesitamos checkpointNum aquí
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

// --- INICIO DEL CÓDIGO QUE SE EJECUTA CUANDO EL DOM ESTÁ CARGADO ---
document.addEventListener('DOMContentLoaded', async () => {
    // --- CONFIGURACIÓN DE FIREBASE ---
    const firebaseConfig = {
      apiKey: "AIzaSyBsE7Hzu_AQHduFk46Srqly89WP4n4vPew",
      authDomain: "cinnahub-keygen.firebaseapp.com",
      projectId: "cinnahub-keygen",
      storageBucket: "cinnahub-keygen.firebasestorage.app",
      messagingSenderId: "865047507078",
      appId: "1:865047507078:web:8f90873cfd716d21a1a107"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    // --- FIN CONFIGURACIÓN DE FIREBASE ---


    // Obtenemos referencias a los elementos HTML
    const checkpointStatusSpan = document.getElementById('current-checkpoint');
    const checkpointButtonsDiv = document.getElementById('checkpoint-buttons');
    const option1Button = document.getElementById('option-1-button');
    const option2Button = document.getElementById('option-2-button');
    const keyDisplay = document.getElementById('key-display');
    const generatedKeyParagraph = document.getElementById('generated-key');
    const copyKeyButton = document.getElementById('copy-key-button');

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


    // --- Funciones para interactuar con Firestore ---

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


    // --- Función para actualizar la interfaz de usuario (qué botones mostrar, qué texto) ---
    // Esta función usa las variables de ámbito superior (closure) que se definen en DOMContentLoaded.
    function updateUI() { // Renombrada para evitar confusión con el parámetro 'checkpoint'
        keyDisplay.style.display = 'none'; // Asegura que la clave esté oculta al cambiar de estado.

        // Aseguramos que currentCheckpoint es el valor real y actualizado
        const actualCheckpoint = parseInt(localStorage.getItem('userCheckpointProgress')) || 1;
        
        if (actualCheckpoint <= 3) {
            checkpointStatusSpan.textContent = `Checkpoint ${actualCheckpoint}`;
            checkpointButtonsDiv.style.display = 'flex';

            option1Button.textContent = `Opción 1: Cuty.io`;
            option2Button.textContent = `Opción 2: LinkVertice`;

            // Asigna la función de redirección a cada botón usando las URLs correctas
            option1Button.onclick = () => redirectToAdPage(checkpointUrls[actualCheckpoint][0]);
            option2Button.onclick = () => redirectToAdPage(checkpointUrls[actualCheckpoint][1]);

        } else { // Si el checkpoint es 4 (o mayor), significa que se completaron todos.
            checkpointStatusSpan.textContent = "¡Proceso Completado!";
            checkpointButtonsDiv.style.display = 'none';
            generateAndDisplayKey(); // Llama a la función de generación de clave (que interactúa con Firestore).
        }
    }


    // --- Lógica de inicialización al cargar la página ---

    // 1. Al cargar la página, primero inicializa la sesión con Firebase.
    const sessionData = await initializeSession();
    let currentCheckpointFromDB = sessionData.currentCheckpoint;
    
    // 2. Intenta mostrar la clave si ya está activa y válida (según Firestore).
    const keyActive = await checkAndDisplayExistingKey();
    if (keyActive) {
        // Si la clave está activa y se mostró correctamente, terminamos la ejecución aquí.
        // updateUI() ya se habrá llamado implícitamente por checkAndDisplayExistingKey
        return; 
    }

    // 3. Si no hay clave activa, procede con la lógica de los checkpoints.
    const urlCheckpointParam = getCheckpointFromURL();

    if (urlCheckpointParam > 0) { // Si el usuario regresó de un acortador (hay parámetro en la URL).
        if (urlCheckpointParam === currentCheckpointFromDB) {
            const newCheckpointValue = urlCheckpointParam + 1;
            
            try {
                await db.collection('sessions').doc(sessionId).update({
                    currentCheckpoint: newCheckpointValue,
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentCheckpointFromDB = newCheckpointValue; // Actualiza la variable local.
                // También actualizamos localStorage para la lógica de visualización inmediata
                localStorage.setItem('userCheckpointProgress', newCheckpointValue.toString());
            } catch (error) {
                console.error('Error al actualizar progreso en Firestore:', error);
                alert('Hubo un error al guardar tu progreso.');
            }
        } else {
            console.warn(`Intento de salto o redirección incorrecta. Progreso en DB: ${currentCheckpointFromDB}, en URL: ${urlCheckpointParam}.`);
            // Mantenemos el progreso local según la DB
            localStorage.setItem('userCheckpointProgress', currentCheckpointFromDB.toString());
        }

        // Limpia el parámetro de la URL para evitar comportamientos inesperados en futuras recargas.
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Asegúrate de que el localStorage refleje el estado de la DB al inicio si no hay URL param
        localStorage.setItem('userCheckpointProgress', currentCheckpointFromDB.toString());
    }

    // Asegurarse de que el estado local de currentCheckpoint esté alineado con el de la DB,
    // y si es mayor a 3, forzarlo al estado final (4).
    if (currentCheckpointFromDB > 3) {
        localStorage.setItem('userCheckpointProgress', '4');
    }

    // Finalmente, actualiza la interfaz de usuario según el checkpoint determinado.
    updateUI(); // Llama a la función de actualización de UI
    
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