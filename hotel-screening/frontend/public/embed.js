/**
 * Hotel Screening Embed Script
 *
 * Este script permite incrustar la aplicación Hotel Screening en Kajabi mediante un iframe.
 *
 * USO EN KAJABI:
 * 1. Incluir este script en el custom code de Kajabi:
 *    <script src="https://ma.thetotalprofitjourney.com/embed.js"></script>
 *
 * 2. Crear un div con la clase 'ma-hotel-screening' donde quieres que aparezca el iframe:
 *    <div class="ma-hotel-screening"></div>
 *
 * 3. Opcionalmente, puedes definir una variable global MA con información del usuario:
 *    <script>
 *      var TPJ = {
 *        user: {
 *          email: 'usuario@ejemplo.com',
 *          kajabiUserId: '12345'
 *        }
 *      };
 *    </script>
 */

(function(undefined) {
	// Función para incrustar el iframe
	function insertIframes(selector, iframeUrl) {
		// Seleccionar todos los divs que coincidan con el selector
		const targetDivs = document.querySelectorAll(selector);
		targetDivs.forEach(function(div) {
			insertIframe(div, iframeUrl);
		});
	}

	function insertIframe(targetDiv, iframeUrl) {
		targetDiv.style.width = "100%";
		targetDiv.style.border = "none";
		targetDiv.style.overflow = "hidden";

		// Crear el iframe
		const iframe = document.createElement('iframe');
		iframe.src = iframeUrl;
		iframe.style.width = "100%";
		iframe.style.height = "100%";
		iframe.style.border = "none";
		iframe.style.overflow = "hidden";
		iframe.setAttribute("scrolling", "no");
		iframe.setAttribute("allow", "clipboard-read; clipboard-write");

		let height = 0;

		// Escuchar mensajes del iframe para ajustar la altura dinámicamente
		window.addEventListener('message', (event) => {
			// Verificar que el mensaje viene de nuestro dominio
            if (event.origin !== 'https://ma.thetotalprofitjourney.com') {
				return;
			}

			// Evitar actualizaciones innecesarias si la altura no ha cambiado
			if (event.data.height == height) {
				return;
			}

			height = event.data.height;
			// Añadir 30px de margen extra para evitar scroll
            targetDiv.style.height = (height + 30) + 'px';
        });

		// Limpiar el contenido existente en el div y añadir el iframe
		targetDiv.innerHTML = '';
		targetDiv.appendChild(iframe);
	}

	// Construir la URL base de la aplicación
	let url = 'https://ma.thetotalprofitjourney.com/';

	// Si hay información del usuario disponible, añadirla a la URL
	if (typeof TPJ !== 'undefined' && TPJ.user) {
		const params = new URLSearchParams();
	
		if (TPJ.user.email) {
			params.append('email', TPJ.user.email);
		}

		if (TPJ.user.kajabiUserId) {
			params.append('userid', TPJ.user.kajabiUserId);
		}

		if (params.toString()) {
			url += '?' + params.toString();
		}
	}

	// Incrustar iframes en todos los divs con clase 'ma-hotel-screening'
	insertIframes('.ma-hotel-screening', url);
})();



