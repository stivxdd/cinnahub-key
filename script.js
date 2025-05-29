document.addEventListener('DOMContentLoaded', async () => { // Hacemos la función asíncrona

    // --- CONFIGURACIÓN DE FIREBASE (PEGA TU firebaseConfig AQUÍ) ---
    // ¡IMPORTANTE!: Reemplaza estos valores con los de TU PROYECTO FIREBASE
    const firebaseConfig = {
      apiKey: "AIzaSyBsE7Hzu_AQHduFk46Srqly89WP4n4vPew", 
      authDomain: "Ycinnahub-keygen.firebaseapp.com",
      projectId: "cinnahub-keygen",
      storageBucket: "cinnahub-keygen.firebasestorage.app",
      messagingSenderId: "865047507078",
      appId: "1:865047507078:web:8f90873cfd716d21a1a107"
    };

    // Inicializa Firebase
    firebase.initializeApp(firebaseConfig);

    // Obtiene una referencia a la instancia de Firestore
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

    // sessionId se guardará en localStorage para identificar al usuario a través de visitas
    let sessionId = localStorage.getItem('sessionId') || null;

    // --- Configuración de URLs Acortadas para cada Checkpoint ---
    // ¡IMPORTANTE!: Estas URLs acortadas deben redirigir de vuelta a:
    // https://TuUsuario.github.io/nombre-de-tu-repositorio/index.html?return_to_checkpoint=X
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


    // Función para obtener el número de checkpoint del parámetro de la URL
    function getCheckpointFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return parseInt(urlParams.get('return_to_checkpoint')) || 0;
    }

    // Función para generar un sessionId único si no existe
    function generateUniqueSessionId() {
        return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }


    // --- Funciones para interactuar con Firestore ---

    // Función para iniciar o retomar la sesión con el backend
    async function initializeSession() {
        if (!sessionId) {
            sessionId = generateUniqueSessionId();
            localStorage.setItem('sessionId', sessionId);
        }

        try {
            const sessionRef = db.collection('sessions').doc(sessionId);
            const doc = await sessionRef.get();

            if (!doc.exists) {
                // Nueva sesión
                await sessionRef.set({
                    currentCheckpoint: 0, // 0 significa no iniciado
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                    keyRef: null // Referencia a la clave generada
                });
                return { currentCheckpoint: 0 };
            } else {
                // Sesión existente
                await sessionRef.update({ lastActivity: firebase.firestore.FieldValue.serverTimestamp() });
                return doc.data();
            }
        } catch (error) {
            console.error('Error al inicializar la sesión con Firestore:', error);
            alert('Hubo un error al conectar con el servidor. Por favor, inténtalo de nuevo.');
            return { currentCheckpoint: 0 }; // Fallback
        }
    }

    // Función para verificar y mostrar la clave si ya está activa
    async function checkAndDisplayExistingKey() {
        if (!sessionId) return false;

        try {
            const sessionDoc = await db.collection('sessions').doc(sessionId).get();
            if (!sessionDoc.exists) {
                return false; // No hay sesión, no hay clave activa
            }

            const sessionData = sessionDoc.data();
            // Si la sesión ha completado los checkpoints (currentCheckpoint es 4 o más)
            if (sessionData.currentCheckpoint >= 4 && sessionData.keyRef) {
                const keyDoc = await sessionData.keyRef.get();
                if (keyDoc.exists) {
                    const keyData = keyDoc.data();
                    const now = new Date().getTime();

                    // Verificar si la clave aún no ha expirado
                    if (keyData.expiresAt.toDate().getTime() > now) {
                        generatedKeyParagraph.textContent = keyData.value;
                        keyDisplay.style.display = 'block';
                        checkpointButtonsDiv.style.display = 'none';
                        checkpointStatusSpan.textContent = "¡Tu clave está activa!";
                        return true; // Clave activa encontrada y mostrada
                    } else {
                        // Clave expirada, limpiar progreso
                        await sessionDoc.ref.update({
                            currentCheckpoint: 0,
                            keyRef: null
                        });
                        await keyDoc.ref.delete(); // Opcional: borrar la clave expirada de la DB
                    }
                }
            }
            return false; // No hay clave activa o expiró
        } catch (error) {
            console.error('Error al verificar clave activa con Firestore:', error);
            return false;
        }
    }

    // Función para generar la clave en Firestore (solo después de completar CPs)
    async function generateAndDisplayKey() {
        const keyLength = 25;
        let uniqueKey = '';
        let keyExists = true;
        let attempts = 0;
        const maxAttempts = 10;

        // Generar una clave y verificar unicidad en la base de datos
        while (keyExists && attempts < maxAttempts) {
            uniqueKey = generateRandomKey(keyLength); // Usa tu función local
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
            // Guardar la nueva clave en la colección 'keys'
            const newKeyRef = await db.collection('keys').add({
                value: uniqueKey,
                generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: expiresAt,
                sessionId: sessionId
            });

            // Actualizar la sesión del usuario para vincularla a la clave generada
            await db.collection('sessions').doc(sessionId).update({
                currentCheckpoint: 4, // Marcar como "finalizado"
                keyRef: newKeyRef // Guardar referencia a la clave
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


    // --- Funciones de Lógica de UI (similares a antes, pero ahora usan el estado de la sesión) ---

    // Función para actualizar la interfaz de usuario (qué botones mostrar, qué texto)
    function updateUIForCheckpoint(checkpoint) {
        keyDisplay.style.display = 'none'; // Asegura que la clave esté oculta

        if (checkpoint <= 3) { // Si estamos en un checkpoint activo (1, 2 o 3)
            checkpointStatusSpan.textContent = `Checkpoint ${checkpoint}`;
            checkpointButtonsDiv.style.display = 'flex';

            option1Button.textContent = `Opción 1: Cuty.io`;
            option2Button.textContent = `Opción 2: LinkVertice`;

            option1Button.onclick = () => redirectToAdPage(checkpointUrls[checkpoint][0], checkpoint);
            option2Button.onclick = () => redirectToAdPage(checkpointUrls[checkpoint][1], checkpoint);

        } else { // Si el checkpoint es 4 (o mayor), significa que se completaron todos
            checkpointStatusSpan.textContent = "¡Proceso Completado!";
            checkpointButtonsDiv.style.display = 'none';
            generateAndDisplayKey(); // Llama a la función de generación (que interactúa con Firestore)
        }
    }

    // Función para generar una clave aleatoria (utilizada por generateAndDisplayKey)
    function generateRandomKey(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }


    // --- Lógica de inicialización al cargar la página ---

    // 1. Inicializa la sesión con Firebase y obtén el progreso actual del usuario
    const sessionData = await initializeSession();
    let currentCheckpointFromDB = sessionData.currentCheckpoint;
    
    // 2. Intenta mostrar la clave si ya está activa (según Firestore)
    const keyActive = await checkAndDisplayExistingKey();
    if (keyActive) {
        return; // Si la clave está activa y se mostró, terminamos aquí.
    }

    // 3. Si no hay clave activa, procede con la lógica de los checkpoints
    const urlCheckpointParam = getCheckpointFromURL(); // Checkpoint de la URL

    if (urlCheckpointParam > 0) { // Si el usuario regresó de un acortador (hay parámetro en la URL)
        // Solo si el parámetro de la URL coincide con el progreso esperado en DB, avanzamos.
        // Esto previene saltos manipulando la URL.
        if (urlCheckpointParam === currentCheckpointFromDB) {
            const newCheckpointValue = urlCheckpointParam + 1; // Avanzamos 1 checkpoint
            
            try {
                // Actualiza el progreso en Firestore
                await db.collection('sessions').doc(sessionId).update({
                    currentCheckpoint: newCheckpointValue,
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentCheckpoint = newCheckpointValue; // Actualiza el local
            } catch (error) {
                console.error('Error al actualizar progreso en Firestore:', error);
                alert('Hubo un error al guardar tu progreso.');
            }
        } else {
            // Si hay un salto o un parámetro inválido, usamos el progreso de la DB.
            currentCheckpoint = currentCheckpointFromDB;
        }

        // Limpia el parámetro de la URL para evitar comportamientos inesperados en futuras recargas.
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Si no hay parámetro en la URL (primera carga, recarga sin venir de acortador),
        // usamos el progreso de la DB.
        currentCheckpoint = currentCheckpointFromDB;
    }

    // Asegurarse de que el estado final sea 4 si ya se completaron los CPs
    if (currentCheckpoint > 3) {
        currentCheckpoint = 4;
        // La DB ya debería reflejar esto, pero forzamos la UI
    }

    // Finalmente, actualiza la interfaz de usuario según el checkpoint determinado.
    updateUIForCheckpoint(currentCheckpoint);

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