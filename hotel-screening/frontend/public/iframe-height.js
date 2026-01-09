/**
 * Script para comunicar la altura del contenido al iframe padre
 *
 * Este script se ejecuta dentro del iframe y envía mensajes postMessage
 * al padre (Kajabi) para ajustar dinámicamente la altura del iframe
 * según el contenido de la aplicación.
 */

function postUpdateHeight() {
	if (window.parent && window.parent !== window) {
		const height = document.documentElement.scrollHeight;
		window.parent.postMessage({height: height}, '*');
	}
}

// Actualizar altura cuando la página carga completamente
window.addEventListener('load', function() {
	postUpdateHeight();

	// Observar cambios en el tamaño del contenido
	const observer = new ResizeObserver(() => postUpdateHeight());
	observer.observe(document.documentElement);
});

// También actualizar cuando cambia el DOM (por si React hace cambios)
if (typeof MutationObserver !== 'undefined') {
	const domObserver = new MutationObserver(() => {
		postUpdateHeight();
	});

	domObserver.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true
	});
}
