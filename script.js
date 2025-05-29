document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos referencias a los elementos HTML
    const checkpointStatusSpan = document.getElementById('current-checkpoint');
    const checkpointButtonsDiv = document.getElementById('checkpoint-buttons');
    const option1Button = document.getElementById('option-1-button');
    const option2Button = document.getElementById('option-2-button');
    const keyDisplay = document.getElementById('key-display');
    const generatedKeyParagraph = document.getElementById('generated-key');
    const copyKeyButton = document.getElementById('copy-key-button'); // Referencia al botón de copiar

    // Variable para controlar el checkpoint actual.
    // Intentamos cargar el progreso guardado en localStorage. Si no hay nada, iniciamos en 1.
    let currentCheckpoint = parseInt(localStorage.getItem('userCheckpointProgress')) || 1;

    // Variable para almacenar la última clave generada por este usuario en este navegador.
    // La obtenemos de localStorage al inicio para mantener la persistencia.
    let lastGeneratedKey = localStorage.getItem('lastGeneratedKeyAttempt') || null;

    // --- Configuración de URLs Acortadas para cada Checkpoint ---
    // ¡IMPORTANTE!: Reemplaza estas URLs con tus URLs acortadas reales.
    // Asegúrate de que los acortadores estén configurados para redirigir de vuelta a:
    // https://TuUsuario.github.io/nombre-de-tu-repositorio/index.html?return_to_checkpoint=X
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


    // Función para obtener el número de checkpoint desde el parámetro de la URL.
    // Esto es crucial para saber de qué página de acortador regresó el usuario.
    function getCheckpointFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        // Si no hay parámetro 'return_to_checkpoint', asumimos 0 para un inicio limpio.
        return parseInt(urlParams.get('return_to_checkpoint')) || 0;
    }

    // Función para actualizar la interfaz de usuario (qué botones mostrar, qué texto).
    function updateUIForCheckpoint(checkpoint) {
        // Aseguramos que la sección de la clave esté oculta al cambiar de checkpoint.
        keyDisplay.style.display = 'none';

        if (checkpoint <= 3) { // Si estamos en un checkpoint activo (1, 2 o 3)
            // Si el checkpoint que se intenta mostrar es menor que el progreso real guardado,
            // forzamos la UI a mostrar el progreso real para evitar saltos.
            if (checkpoint < parseInt(localStorage.getItem('userCheckpointProgress')) || 1) {
                 currentCheckpoint = parseInt(localStorage.getItem('userCheckpointProgress')) || 1;
            }

            checkpointStatusSpan.textContent = `Checkpoint ${currentCheckpoint}`; // Actualiza el texto del estado.
            checkpointButtonsDiv.style.display = 'flex'; // Muestra el contenedor de los botones de checkpoint.

            // Asignamos el texto a cada botón con los nombres personalizados.
            option1Button.textContent = `Opción 1: Cuty.io`;
            option2Button.textContent = `Opción 2: LinkVertice`;

            // Asignamos la función de redirección a cada botón, pasando la URL correspondiente
            // de las URLs acortadas que definimos.
            option1Button.onclick = () => redirectToAdPage(checkpointUrls[currentCheckpoint][0], currentCheckpoint);
            option2Button.onclick = () => redirectToAdPage(checkpointUrls[currentCheckpoint][1], currentCheckpoint);

        } else { // Si el checkpoint es 4 (o mayor), significa que se completaron todos.
            checkpointStatusSpan.textContent = "¡Proceso Completado!"; // Mensaje de estado final.
            checkpointButtonsDiv.style.display = 'none'; // Oculta los botones de checkpoint.
            generateAndDisplayKey(); // Genera y muestra la clave final.
        }
    }

    // Función para redirigir al usuario a la URL acortada.
    function redirectToAdPage(shortenedUrl, checkpointNum) {
        // La redirección ocurre simplemente cambiando la ubicación de la ventana del navegador.
        // ¡RECUERDA!: El servicio de acortamiento de URL debe redirigir DE VUELTA
        // a tu `index.html?return_to_checkpoint=${checkpointNum}` después de su proceso.
        window.location.href = shortenedUrl;
    }

    // --- Funciones para la generación de la clave con validación de unicidad básica ---

    // Función para generar una clave aleatoria de una longitud dada.
    // Se han añadido más caracteres para aumentar la aleatoriedad y reducir colisiones.
    function generateRandomKey(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    // Función principal para generar y mostrar la clave, incluyendo la lógica de expiración
    // y la prevención de repetición (a nivel de usuario/navegador).
    function generateAndDisplayKey() {
        const keyLength = 25; // Aumentamos la longitud de la clave para mayor unicidad.
        let key = '';
        let attempts = 0;
        const maxAttempts = 10; // Límite de intentos para evitar bucles infinitos si la generación es muy repetitiva.

        // Bucle para generar una clave hasta que sea diferente de la última generada por este usuario
        // (dentro de este navegador).
        do {
            key = generateRandomKey(keyLength);
            attempts++;
            if (attempts > maxAttempts) {
                console.warn("Demasiados intentos para generar una clave única. Podría repetirse.");
                break; // Salir para evitar un bucle infinito si hay colisiones constantes.
            }
        } while (key === lastGeneratedKey); // Compara con la última clave generada y guardada.

        // --- Lógica de Expiración (24 horas) ---
        const expirationTimeMs = 24 * 60 * 60 * 1000; // 24 horas en milisegundos.
        const expirationDate = new Date().getTime() + expirationTimeMs; // Calcula el tiempo de expiración.

        // Guardamos la clave generada, su fecha de expiración y la última clave intentada
        // en el almacenamiento local (localStorage) del navegador.
        localStorage.setItem('generatedKey', key);
        localStorage.setItem('keyExpiration', expirationDate.toString());
        localStorage.setItem('lastGeneratedKeyAttempt', key); // Actualizamos la última clave generada.
        localStorage.setItem('userCheckpointProgress', '4'); // Marcamos el progreso como completado.
        lastGeneratedKey = key; // También actualizamos la variable en memoria.
        // --- FIN Lógica de Expiración ---

        generatedKeyParagraph.textContent = key; // Muestra la clave en el párrafo HTML.
        keyDisplay.style.display = 'block';     // Hace visible la sección donde se muestra la clave.
    }


    // --- Función para verificar si hay una clave válida guardada y mostrarla ---
    // Esta función se ejecuta al inicio para ver si el usuario ya tiene una clave activa.
    function checkAndDisplayExistingKey() {
        const storedKey = localStorage.getItem('generatedKey');
        const storedExpiration = localStorage.getItem('keyExpiration');

        // Verificamos si hay una clave y una fecha de expiración guardadas.
        if (storedKey && storedExpiration) {
            const now = new Date().getTime(); // Obtenemos el tiempo actual en milisegundos.
            const expirationDate = parseInt(storedExpiration); // Convertimos la fecha de expiración guardada a número.

            // Si la clave existe y el tiempo actual es menor que la fecha de expiración:
            if (now < expirationDate) {
                // La clave es válida y activa.
                keyDisplay.style.display = 'block'; // Muestra la sección de la clave.
                generatedKeyParagraph.textContent = storedKey; // Muestra la clave guardada.
                checkpointButtonsDiv.style.display = 'none'; // Oculta los botones de checkpoint (no son necesarios).
                // Aseguramos que el estado del progreso sea 'finalizado' si hay una clave activa.
                checkpointStatusSpan.textContent = "¡Tu clave está activa!"; // Actualiza el mensaje de estado.
                localStorage.setItem('userCheckpointProgress', '4'); // Aseguramos que el progreso se guarde como finalizado.
                return true; // Indica que se encontró una clave válida y se mostró.
            } else {
                // La clave ha expirado, la eliminamos de localStorage para que se pueda generar una nueva.
                localStorage.removeItem('generatedKey');
                localStorage.removeItem('keyExpiration');
                localStorage.removeItem('lastGeneratedKeyAttempt'); // También limpiamos la última clave intentada.
                localStorage.removeItem('userCheckpointProgress'); // Reiniciamos el progreso del checkpoint.
            }
        }
        return false; // No se encontró una clave válida o ha expirado.
    }


    // --- Lógica de inicialización al cargar la página (el punto de entrada del script) ---

    // 1. Lo primero que hacemos al cargar la página es verificar si ya hay una clave activa y válida.
    if (checkAndDisplayExistingKey()) {
        // Si checkAndDisplayExistingKey() devuelve 'true', significa que se encontró y mostró una clave válida.
        // En este caso, no necesitamos pasar por los checkpoints, así que salimos de la función.
        return;
    }

    // 2. Si no hay una clave válida existente (o la que había expiró),
    // procedemos con la lógica de los checkpoints.

    const urlCheckpointParam = getCheckpointFromURL(); // Obtenemos el checkpoint del parámetro de la URL.

    if (urlCheckpointParam > 0) { // Si el usuario regresó de un acortador (hay parámetro en la URL).
        // Comparamos el checkpoint de la URL con el progreso guardado.
        // Solo avanzamos si el checkpoint de la URL es el que el usuario DEBERÍA haber completado.
        if (urlCheckpointParam === currentCheckpoint) {
            currentCheckpoint++; // Avanzamos al siguiente checkpoint.
            // Guardamos el nuevo progreso en localStorage.
            localStorage.setItem('userCheckpointProgress', currentCheckpoint.toString());
        } else {
            // Si el parámetro de la URL no coincide con el checkpoint actual esperado (posible manipulación
            // o error en el redireccionamiento), no avanzamos el progreso guardado.
            // La UI se actualizará con el 'currentCheckpoint' que viene de localStorage.
        }

        // Limpiamos el parámetro de la URL para evitar comportamientos inesperados en futuras recargas.
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Si no hay parámetro en la URL (por ejemplo, si la página se carga por primera vez
        // o si el usuario la recarga desde la URL base), simplemente usamos el
        // 'currentCheckpoint' que ya fue cargado de localStorage al inicio del script.
    }

    // Si 'currentCheckpoint' ha llegado a 4 o más, significa que todos los checkpoints se completaron.
    // Esto asegura que, aunque el usuario recargue después de completar el CP3, la UI vaya al estado final.
    if (currentCheckpoint > 3) {
        currentCheckpoint = 4; // Aseguramos que el estado final sea 4.
        localStorage.setItem('userCheckpointProgress', '4'); // Guardamos el estado finalizado.
    }

    // Finalmente, actualizamos la interfaz de usuario según el checkpoint determinado.
    updateUIForCheckpoint(currentCheckpoint);

    // Event listener para el botón de copiar clave
    // Se asegura de que el botón exista antes de intentar añadir un event listener
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