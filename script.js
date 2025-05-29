// --- FUNCIONES GLOBALES / FUERA DEL DOMContentLoaded ---
// Estas funciones necesitan ser accesibles por los elementos HTML que tienen onclick.

// Función para redirigir al usuario a la URL acortada.
// Recibe la URL acortada y el número de checkpoint que se está intentando completar.
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


document.addEventListener('DOMContentLoaded', async () => { // Hacemos la función principal asíncrona para usar await
    // --- CONFIGURACIÓN DE FIREBASE (PEGA TU firebaseConfig AQUÍ) ---
    // ¡IMPORTANTE!: Reemplaza estos valores con los de TU PROYECTO FIREBASE
    const firebaseConfig = {
      apiKey: "AIzaSyBsE7Hzu_AQHduFk46Srqly89WP4n4vPew", // <-- TU API KEY
      authDomain: "cinnahub-keygen.firebaseapp.com", // <-- TU AUTH DOMAIN
      projectId: "cinnahub-keygen", // <-- TU PROJECT ID
      storageBucket: "cinnahub-keygen.firebasestorage.app", // <-- TU STORAGE BUCKET
      messagingSenderId: "865047507078", // <-- TU MESSAGING SENDER ID
      appId: "1:865047507078:web:8f90873cfd716d21a1a107" // <-- TU APP ID
    };

    // Inicializa Firebase
    firebase.initializeApp(firebaseConfig);

    // Obtiene una referencia a la instancia de Firestore
    const db = firebase.firestore(); // Usa firebase.firestore() para la v8
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
    // Es crucial para mantener el progreso del usuario y asociar claves.
    let sessionId = localStorage.getItem('sessionId') || null;

    // --- Configuración de URLs Acortadas para cada Checkpoint ---
    // ¡IMPORTANTE!: Estas URLs acortadas deben redirigir de vuelta a la URL de tu página en GitHub Pages
    // con el parámetro `?return_to_checkpoint=X` (ej. index.html?return_to_checkpoint=1).
    const checkpointUrls = {
        1: [
            'https://cuty.io/OP2onuNk', // URL acortada para Opción 1, Checkpoint 1
            'https://link-center.net/1355276/mhLzCyqwizBa' // URL acortada para Opción 2, Checkpoint 1
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
    // Esto es vital para saber de qué página de acortador regresó el usuario.
    function getCheckpointFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        // Si no hay parámetro 'return_to_checkpoint', asumimos 0 para un inicio limpio.
        return parseInt(urlParams.get('return_to_checkpoint')) || 0;
    }

    // Función para generar un sessionId único si el navegador no tiene uno guardado.
    function generateUniqueSessionId() {
        return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }


    // --- Funciones para interactuar con Firestore (el "Backend") ---

    // Función asíncrona para iniciar o retomar la sesión del usuario con Firestore.
    // Carga el progreso del usuario desde la base de datos.
    async function initializeSession() {
        if (!sessionId) {
            sessionId = generateUniqueSessionId(); // Genera un nuevo ID si no existe.
            localStorage.setItem('sessionId', sessionId); // Guárdalo en localStorage.
        }

        try {
            const sessionRef = db.collection('sessions').doc(sessionId); // Referencia al documento de la sesión.
            const doc = await sessionRef.get(); // Intenta obtener el documento.

            if (!doc.exists) {
                // Si el documento de la sesión no existe, es una nueva sesión.
                await sessionRef.set({
                    currentCheckpoint: 0, // Inicia el progreso en 0 (no iniciado).
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Marca de tiempo de creación.
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp(), // Última actividad.
                    keyRef: null // No hay clave generada aún.
                });
                return { currentCheckpoint: 0 }; // Devuelve el estado inicial.
            } else {
                // Si la sesión existe, la actualiza y devuelve sus datos.
                await sessionRef.update({ lastActivity: firebase.firestore.FieldValue.serverTimestamp() });
                return doc.data(); // Devuelve los datos de la sesión existente.
            }
        } catch (error) {
            console.error('Error al inicializar la sesión con Firestore:', error);
            alert('Hubo un error al conectar con el servidor de progreso. Por favor, inténtalo de nuevo.');
            return { currentCheckpoint: 0 }; // En caso de error, devuelve un estado por defecto.
        }
    }

    // Función asíncrona para verificar si el usuario ya tiene una clave activa y mostrarla.
    // Esta función se ejecuta al inicio de la página.
    async function checkAndDisplayExistingKey() {
        if (!sessionId) return false; // Si no hay sessionId, no hay clave que verificar.

        try {
            const sessionDoc = await db.collection('sessions').doc(sessionId).get(); // Obtiene el documento de la sesión.
            if (!sessionDoc.exists) {
                return false; // Si la sesión no existe, no hay clave activa para este ID.
            }

            const sessionData = sessionDoc.data(); // Obtiene los datos de la sesión.
            
            // Si la sesión indica que ya se completaron los checkpoints (currentCheckpoint >= 4)
            // y tiene una referencia a una clave.
            if (sessionData.currentCheckpoint >= 4 && sessionData.keyRef) {
                const keyDoc = await sessionData.keyRef.get(); // Obtiene el documento de la clave.
                if (keyDoc.exists) {
                    const keyData = keyDoc.data();
                    const now = new Date().getTime(); // Tiempo actual en milisegundos.

                    // Verifica si la clave aún no ha expirado.
                    // .toDate() convierte el Timestamp de Firestore a un objeto Date.
                    if (keyData.expiresAt.toDate().getTime() > now) {
                        // La clave es válida y activa.
                        generatedKeyParagraph.textContent = keyData.value; // Muestra la clave.
                        keyDisplay.style.display = 'block'; // Hace visible el contenedor de la clave.
                        checkpointButtonsDiv.style.display = 'none'; // Oculta los botones de checkpoint.
                        checkpointStatusSpan.textContent = "¡Tu clave está activa!"; // Mensaje de estado.
                        return true; // Indica que se encontró una clave válida y se mostró.
                    } else {
                        // Clave ha expirado. Limpia el progreso en Firestore y opcionalmente borra la clave.
                        await sessionDoc.ref.update({
                            currentCheckpoint: 0, // Reinicia el progreso en la DB.
                            keyRef: null // Elimina la referencia a la clave expirada.
                        });
                        // Opcional: Borra la clave expirada de la colección 'keys'
                        await keyDoc.ref.delete(); 
                    }
                }
            }
            return false; // No hay clave activa, o expiró, o no se encontró la clave referenciada.
        } catch (error) {
            console.error('Error al verificar clave activa con Firestore:', error);
            return false; // En caso de error, asume que no hay clave activa.
        }
    }

    // Función asíncrona para generar una nueva clave única y guardarla en Firestore.
    // También actualiza la sesión del usuario para vincularla a esta clave.
    async function generateAndDisplayKey() {
        const keyLength = 25; // Longitud de la clave a generar.
        let uniqueKey = '';
        let keyExists = true;
        let attempts = 0;
        const maxAttempts = 10; // Límite de intentos para asegurar unicidad.

        // Bucle para generar una clave y verificar que sea única en la base de datos de Firestore.
        while (keyExists && attempts < maxAttempts) {
            uniqueKey = generateRandomKey(keyLength); // Genera una clave aleatoria localmente.
            // Consulta Firestore para ver si esta clave ya existe.
            const keyQuery = await db.collection('keys').where('value', '==', uniqueKey).limit(1).get();
            if (keyQuery.empty) { // Si la consulta no devuelve documentos, la clave es única.
                keyExists = false;
            }
            attempts++;
        }

        if (keyExists) { // Si no se pudo generar una clave única después de varios intentos.
            alert('No se pudo generar una clave única. Por favor, inténtalo de nuevo.');
            return;
        }

        const expirationTimeMs = 24 * 60 * 60 * 1000; // 24 horas en milisegundos.
        const expiresAt = new Date(Date.now() + expirationTimeMs); // Calcula la fecha de expiración.

        try {
            // Guarda la nueva clave en la colección 'keys' de Firestore.
            const newKeyRef = await db.collection('keys').add({
                value: uniqueKey,
                generatedAt: firebase.firestore.FieldValue.serverTimestamp(), // Marca de tiempo del servidor.
                expiresAt: expiresAt,
                sessionId: sessionId // Asocia la clave con la sesión actual.
            });

            // Actualiza el documento de la sesión del usuario para vincularlo a la clave generada.
            await db.collection('sessions').doc(sessionId).update({
                currentCheckpoint: 4, // Marca el progreso como "finalizado" (clave generada).
                keyRef: newKeyRef // Almacena la referencia a la clave generada.
            });

            generatedKeyParagraph.textContent = uniqueKey; // Muestra la clave en la UI.
            keyDisplay.style.display = 'block'; // Hace visible el contenedor de la clave.
            checkpointStatusSpan.textContent = "¡Clave generada!"; // Actualiza el mensaje de estado.
            checkpointButtonsDiv.style.display = 'none'; // Oculta los botones de checkpoint.

        } catch (error) {
            console.error('Error al guardar clave o actualizar sesión en Firestore:', error);
            alert('Error al generar la clave. Por favor, inténtalo de nuevo.');
        }
    }


    // --- Funciones de Lógica de UI (similares a antes, pero ahora usan el estado de la sesión de Firestore) ---

    // Función para actualizar la interfaz de usuario (qué botones mostrar, qué texto).
    function updateUIForCheckpoint(checkpoint) {
        keyDisplay.style.display = 'none'; // Asegura que la clave esté oculta al cambiar de estado.

        if (checkpoint <= 3) { // Si estamos en un checkpoint activo (1, 2 o 3).
            // Muestra el mensaje del checkpoint actual.
            checkpointStatusSpan.textContent = `Checkpoint ${checkpoint}`;
            // Muestra el contenedor de los botones de checkpoint.
            checkpointButtonsDiv.style.display = 'flex';

            // Asigna el texto a cada botón con los nombres personalizados.
            option1Button.textContent = `Opción 1: Cuty.io`;
            option2Button.textContent = `Opción 2: LinkVertice`;

            // Asigna la función de redirección a cada botón, usando las URLs acortadas.
            option1Button.onclick = () => redirectToAdPage(checkpointUrls[checkpoint][0], checkpoint);
            option2Button.onclick = ()s => redirectToAdPage(checkpointUrls[checkpoint][1], checkpoint);

        } else { // Si el checkpoint es 4 (o mayor), significa que se completaron todos.
            checkpointStatusSpan.textContent = "¡Proceso Completado!"; // Mensaje de estado final.
            checkpointButtonsDiv.style.display = 'none'; // Oculta los botones de checkpoint.
            generateAndDisplayKey(); // Llama a la función de generación de clave (que interactúa con Firestore).
        }
    }


    // --- Lógica de inicialización al cargar la página (el punto de entrada del script) ---

    // 1. Al cargar la página, primero inicializa la sesión con Firebase.
    // Esto obtiene el ID de la sesión y el progreso guardado del usuario desde Firestore.
    const sessionData = await initializeSession();
    let currentCheckpointFromDB = sessionData.currentCheckpoint;
    
    // 2. Intenta mostrar la clave si ya está activa y válida (según Firestore).
    const keyActive = await checkAndDisplayExistingKey();
    if (keyActive) {
        // Si la clave está activa y se mostró correctamente, terminamos la ejecución aquí.
        return; 
    }

    // 3. Si no hay clave activa, procede con la lógica de los checkpoints.
    // Esto maneja si el usuario está iniciando, o regresando de un acortador.
    const urlCheckpointParam = getCheckpointFromURL(); // Obtiene el checkpoint del parámetro de la URL.

    if (urlCheckpointParam > 0) { // Si el usuario regresó de un acortador (hay parámetro en la URL).
        // Comparamos el checkpoint de la URL con el progreso guardado.
        // Solo avanzamos si el checkpoint de la URL es el que el usuario DEBERÍA haber completado.
        if (urlCheckpointParam === currentCheckpointFromDB) {
            const newCheckpointValue = urlCheckpointParam + 1; // Avanzamos 1 checkpoint.
            
            try {
                // Actualiza el progreso del usuario en Firestore.
                await db.collection('sessions').doc(sessionId).update({
                    currentCheckpoint: newCheckpointValue,
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentCheckpointFromDB = newCheckpointValue; // Actualiza la variable local.
            } catch (error) {
                console.error('Error al actualizar progreso en Firestore:', error);
                alert('Hubo un error al guardar tu progreso.');
            }
        } else {
            // Si el parámetro de la URL no coincide (salto o error), usamos el progreso de la DB.
            console.warn(`Intento de salto o redirección incorrecta. Progreso en DB: ${currentCheckpointFromDB}, en URL: ${urlCheckpointParam}.`);
            // El currentCheckpointFromDB ya tiene el valor correcto.
        }

        // Limpia el parámetro de la URL para evitar comportamientos inesperados en futuras recargas.
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Si no hay parámetro en la URL (por ejemplo, si la página se carga por primera vez
        // o si el usuario la recarga desde la URL base sin venir de un acortador),
        // simplemente usamos el 'currentCheckpointFromDB' que ya fue cargado al inicio.
    }

    // Asegurarse de que el estado local de currentCheckpoint esté alineado con el de la DB,
    // y si es mayor a 3, forzarlo al estado final (4).
    let currentCheckpoint = currentCheckpointFromDB; // Usa esta variable para la UI
    if (currentCheckpoint > 3) {
        currentCheckpoint = 4; // Asegura que el estado final sea 4.
        // No actualizamos la DB aquí, ya debería estar en 4 si se generó la clave.
    }

    // Finalmente, actualiza la interfaz de usuario según el checkpoint determinado.
    updateUIForCheckpoint(currentCheckpoint);

    // Event listener para el botón de copiar clave
    // Se asegura de que el botón exista antes de intentar añadir un event listener.
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