let modalPagoInstance;

// Ruta base según el panel donde se está (admin o secretario)
const BASE_CITAS = window.location.pathname.startsWith('/admin')
    ? '/admin/citas'
    : '/secretario/citas';

function verComprobante(src) {
    const imgGrande = document.getElementById('comprobanteGrande');
    if (imgGrande) {
        imgGrande.src = src;
        new bootstrap.Modal(document.getElementById('modalComprobante')).show();
    }
}

function getCsrf() {
    return document.querySelector('meta[name="_csrf"]')?.content || '';
}

function abrirModalConfirmacion(button) {
    const id = button.getAttribute('data-id');
    const totalServicio = parseFloat(button.getAttribute('data-total')) || 0;

    const fila = document.getElementById('fila-' + id);
    const imgElement = fila ? fila.querySelector('.comprobante-thumb') : null;

    document.getElementById('modalCitaId').value = id;

    if (document.getElementById('txtTotalServicio')) {
        document.getElementById('txtTotalServicio').innerText = totalServicio.toFixed(2);
    }

    const txtCodigo = document.getElementById('txtCodigoDetectado');
    if (txtCodigo) txtCodigo.innerText = "Escaneando...";

    document.getElementById('formMontoYape').value = "";

    calcularCuadre();

    modalPagoInstance = new bootstrap.Modal(document.getElementById('modalConfirmarPago'));
    modalPagoInstance.show();

    if (imgElement && imgElement.src) {
        ejecutarOcrInteligente(imgElement.src);
    } else {
        if (txtCodigo) txtCodigo.innerText = "NO_DETECTADO";
    }
}

function ejecutarOcrInteligente(imgUrl) {
    if (typeof Tesseract === 'undefined') return;

    Tesseract.recognize(imgUrl, 'eng')
        .then(({ data: { text } }) => {
            const matchCodigo = text.match(/\b\d{8}\b/);
            let codigoDetectado = matchCodigo ? matchCodigo[0] : "NO_DETECTADO";

            if (codigoDetectado === "NO_DETECTADO") {
                const matchFlex = text.match(/(?:operación|nro\.?|nro)\s*:?\s*(\d+)/i);
                if (matchFlex && matchFlex[1]) codigoDetectado = matchFlex[1];
            }

            const txtCodigo = document.getElementById('txtCodigoDetectado');
            if (txtCodigo) txtCodigo.innerText = codigoDetectado;
        })
        .catch(() => {
            const txtCodigo = document.getElementById('txtCodigoDetectado');
            if (txtCodigo) txtCodigo.innerText = "NO_DETECTADO";
        });
}

function calcularCuadre() {
    const txtTotal = document.getElementById('txtTotalServicio');
    if (!txtTotal) return;

    const total = parseFloat(txtTotal.innerText) || 0;
    let yape = parseFloat(document.getElementById('formMontoYape').value) || 0;

    if (yape < 0) { yape = 0; document.getElementById('formMontoYape').value = 0; }

    const saldo = total - yape;
    const box = document.getElementById('boxStatusSaldo');

    if (box) {
        if (saldo === 0) {
            box.style.background = "rgba(46,139,87,0.12)";
            box.style.color = "#1f6f46";
            box.innerHTML = '<h6 class="m-0 font-monospace">✨ ¡SERVICIO CANCELADO COMPLETAMENTE! S/ 0.00</h6>';
        } else if (saldo < 0) {
            box.style.background = "rgba(192,57,43,0.12)";
            box.style.color = "#a52f23";
            box.innerHTML = '<h6 class="m-0">⚠️ ERROR: El monto supera el costo del servicio</h6>';
        } else {
            box.style.background = "rgba(139,90,43,0.12)";
            box.style.color = "#6f4420";
            box.innerHTML = `<h6 class="m-0 font-monospace">Saldo restante para cobrar en silla: S/ ${saldo.toFixed(2)}</h6>`;
        }
    }
}

async function enviarConfirmacionHibrida() {
    const id = document.getElementById('modalCitaId').value;
    const total = parseFloat(document.getElementById('txtTotalServicio').innerText) || 0;
    const yape = parseFloat(document.getElementById('formMontoYape').value) || 0;
    const efectivo = 0;
    const codigo = document.getElementById('txtCodigoDetectado').innerText;

    if (yape < 0) {
        alert("El monto no puede ser negativo.");
        return;
    }
    if (yape > total) {
        alert("Error: El monto ingresado no puede superar el costo del servicio.");
        return;
    }

    const saldo = total - yape;

    const mensajeTexto = saldo === 0
        ? `El servicio quedará marcado como TOTALMENTE PAGADO (Saldo: S/ 0.00).`
        : `Quedará un saldo pendiente por cobrar en la barbería de S/ ${saldo.toFixed(2)}.`;

    document.getElementById('txtMensajeSaldoPremium').innerText = mensajeTexto;

    const modalConfirmInstance = new bootstrap.Modal(document.getElementById('modalConfirmarSaldoPremium'));
    modalConfirmInstance.show();

    document.getElementById('btnAceptarSaldoPremium').onclick = async function () {
        modalConfirmInstance.hide();

        try {
            const url = `${BASE_CITAS}/${id}/aceptar?montoYape=${yape}&montoEfectivo=${efectivo}&codigoYape=${encodeURIComponent(codigo)}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': getCsrf() }
            });

            if (res.ok) {
                if (modalPagoInstance) modalPagoInstance.hide();
                const fila = document.getElementById('fila-' + id);
                if (fila) fila.remove();
                mostrarToast('ok', 'Reserva verificada con éxito.');
            } else {
                mostrarToast('err', 'Error al procesar el abono en el servidor.');
            }
        } catch (e) {
            mostrarToast('err', 'Error de conexión.');
        }
    };
}

async function accionCita(id, accion) {
    if (accion === 'aceptar') return;
    if (!confirm('¿Seguro que deseas cancelar esta cita?')) return;

    try {
        const res = await fetch(`${BASE_CITAS}/${id}/${accion}`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': getCsrf() }
        });
        if (res.ok) {
            const fila = document.getElementById('fila-' + id);
            if (fila) fila.remove();
            mostrarToast('ok', 'Cita cancelada.');
        } else {
            mostrarToast('err', 'No se pudo cancelar la cita.');
        }
    } catch (e) {
        mostrarToast('err', 'Error de conexión.');
    }
}

function mostrarToast(tipo, texto) {
    const box = document.getElementById('toastBox');
    if (box) {
        box.innerHTML = `<div class="toast-${tipo}"><span>${texto}</span></div>`;
        box.style.display = 'block';
        setTimeout(() => { box.style.display = 'none'; }, 4500);
    }
}