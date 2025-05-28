document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos referencias a los elementos HTML
    const checkpointStatusSpan = document.getElementById('current-checkpoint');
    const checkpointButtonsDiv = document.getElementById('checkpoint-buttons');
    const option1Button = document.getElementById('option-1-button');
    const option2Button = document.getElementById('option-2-button');
    const keyDisplay = document.getElementById('key-display');
    const generatedKeyParagraph = document.getElementById('generated-key');

    let currentCheckpoint = 1; // Variable para controlar el checkpoint actual

    // --- Configuración de URLs Acortadas para cada Checkpoint ---
    // ¡IMPORTANTE!: Reemplaza 'URL_ACORTADA_1_CP1', 'URL_ACORTADA_2_CP1', etc.,
    // con tus URLs acortadas reales.
    // Estas URLs deben redirigir de vuelta a 'index.html?return_to_checkpoint=X'
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


    // Función para obtener el número de checkpoint desde la URL
    function getCheckpointFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return parseInt(urlParams.get('return_to_checkpoint')) || 0; // Usamos 0 si no hay parámetro, para un inicio limpio
    }

    // Función para actualizar la interfaz de usuario (qué botones mostrar, qué texto)
    function updateUIForCheckpoint(checkpoint) {
        checkpointStatusSpan.textContent = `Checkpoint ${checkpoint}`; // Actualiza el texto del estado
        keyDisplay.style.display = 'none'; // Asegura que la clave esté oculta

        if (checkpoint <= 3) { // Si estamos en un checkpoint activo (1, 2 o 3)
            checkpointButtonsDiv.style.display = 'flex'; // Muestra el contenedor de botones
            option1Button.textContent = `Opción 1: Visitar Anuncio ${checkpoint}`;
            option2Button.textContent = `Opción 2: Ver Publicidad ${checkpoint}`;

            // Asignamos la función de redirección a cada botón, pasando la URL correspondiente
            option1Button.onclick = () => redirectToAdPage(checkpointUrls[checkpoint][0], checkpoint);
            option2Button.onclick = () => redirectToAdPage(checkpointUrls[checkpoint][1], checkpoint);

        } else { // Si el checkpoint es 4 (o mayor), significa que se completaron todos
            checkpointButtonsDiv.style.display = 'none'; // Oculta los botones
            generateAndDisplayKey(); // Genera y muestra la clave
        }
    }

    // Función para redirigir a la URL acortada
    // Recibe la URL acortada y el número de checkpoint que se está intentando completar
    function redirectToAdPage(shortenedUrl, checkpointNum) {
        // Redirige al usuario a la URL acortada
        // ¡IMPORTANTE!: Tu servicio de acortamiento de URL DEBE redirigir de vuelta
        // a `index.html?return_to_checkpoint=${checkpointNum}` después de que el usuario vea el anuncio.
        window.location.href = shortenedUrl;
    }

    // --- Funciones para la generación de la clave ---

    // Función para generar una clave aleatoria de una longitud dada
    function generateRandomKey(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    // Función para generar y mostrar la clave final
    function generateAndDisplayKey() {
        const keyLength = 20; // Define la longitud de tu clave (ej. 20 caracteres)
        const key = generateRandomKey(keyLength);
        generatedKeyParagraph.textContent = key; // Muestra la clave en el párrafo
        keyDisplay.style.display = 'block';     // Muestra el contenedor de la clave
    }

    // --- Lógica de inicialización al cargar la página ---

    const completedCheckpoint = getCheckpointFromURL();

    if (completedCheckpoint > 0) { // Si hay un parámetro de checkpoint (es decir, regresó de un acortador)
        currentCheckpoint = completedCheckpoint + 1; // Avanza al siguiente checkpoint
        // Si regresó del checkpoint 3, la siguiente etapa es mostrar la clave
        if (completedCheckpoint === 3) {
            currentCheckpoint = 4; // Indica que se completaron todos
        }
        // Limpia el parámetro de la URL para evitar que se muestre la clave de nuevo al recargar
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Si no hay parámetro o el parámetro es 0, es la primera vez que carga index.html
        currentCheckpoint = 1;
    }

    updateUIForCheckpoint(currentCheckpoint); // Actualiza la interfaz con el checkpoint actual
});