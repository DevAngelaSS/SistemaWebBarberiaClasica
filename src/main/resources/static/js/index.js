// ══════════════ index.js — Landing page ══════════════
const CSRF_TOKEN = document.querySelector('meta[name="_csrf"]')?.content || '';
const ES_CLIENTE = window.ES_CLIENTE === true; // se define en index.html con th:inline
const IMG_DEFAULT = 'https://thebarbercompany.pe/wp-content/uploads/2019/04/serv4.webp';

// ── Hero slider ───────────────────────────────────────────
(function () {
    var slides = document.querySelectorAll('.slide-bg-item');
    var dots = document.querySelectorAll('.slider-dot');
    var titulo = document.getElementById('heroTitulo');
    var desc = document.getElementById('heroDesc');
    var DEFAULT_TITULO = 'El Arte del Buen Corte';
    var DEFAULT_DESC = 'Reserva tu cita con los mejores barberos de la ciudad. Experiencia, precisión y estilo en cada visita.';
    if (!slides.length) return;
    var current = 0, timer = null, total = slides.length;

    function activar(idx) {
        slides[current].classList.remove('active');
        if (dots[current]) dots[current].classList.remove('active');
        current = ((idx % total) + total) % total;
        slides[current].classList.add('active');
        if (dots[current]) dots[current].classList.add('active');
        var t = slides[current].dataset.titulo;
        var d = slides[current].dataset.desc;
        if (titulo && total > 1) titulo.textContent = (t && t.trim() !== '') ? t : DEFAULT_TITULO;
        if (desc && total > 1) desc.textContent = (d && d.trim() !== '') ? d : DEFAULT_DESC;
    }
    function resetTimer() {
        clearInterval(timer);
        if (total > 1) timer = setInterval(function () { activar(current + 1); }, 5000);
    }
    window.sliderGoTo = function (idx) { activar(idx); resetTimer(); };
    window.sliderNext = function () { activar(current + 1); resetTimer(); };
    window.sliderPrev = function () { activar(current - 1); resetTimer(); };
    resetTimer();
    var heroEl = document.querySelector('.hero-slider');
    if (heroEl) {
        heroEl.addEventListener('mouseenter', function () { clearInterval(timer); });
        heroEl.addEventListener('mouseleave', resetTimer);
    }
})();

// ── Carrito (localStorage + sincronización con el servidor) ─
function getCarrito() {
    try { return JSON.parse(localStorage.getItem('carrito_barberia') || '[]'); }
    catch { return []; }
}
function saveCarrito(carrito) {
    localStorage.setItem('carrito_barberia', JSON.stringify(carrito));
    sincronizarConServidor(carrito);
}
async function sincronizarConServidor(carrito) {
    try {
        await fetch('/api/carrito/sincronizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': CSRF_TOKEN },
            body: JSON.stringify(carrito)
        });
    } catch { }
}

function abrirCarrito() {
    document.getElementById('carritoDrawer').classList.add('open');
    document.getElementById('carritoOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function cerrarCarrito() {
    document.getElementById('carritoDrawer').classList.remove('open');
    document.getElementById('carritoOverlay').classList.remove('open');
    document.body.style.overflow = '';
}
function irAlCarrito() {
    if (getCarrito().length === 0) { mostrarToast('⚠ Tu carrito está vacío', '#c0392b'); return; }
    abrirCarrito();
}

function actualizarContadorNavbar(count) {
    ['carritoCount', 'carritoCountAnon'].forEach(function (id) {
        var badge = document.getElementById(id);
        if (!badge) return;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    });
}

function renderCarrito() {
    const carrito = getCarrito();
    const body = document.getElementById('carritoDrawerBody');
    const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const count = carrito.reduce((s, i) => s + i.cantidad, 0);

    document.getElementById('drawerTotal').textContent = 'S/ ' + total.toFixed(2);
    document.getElementById('drawerCount').textContent = count;
    actualizarContadorNavbar(count);

    if (carrito.length === 0) {
        body.innerHTML = '<div class="carrito-vacio" id="carritoVacio"><i class="fa-solid fa-cart-shopping"></i><p>Tu carrito está vacío</p></div>';
        return;
    }

    body.innerHTML = carrito.map((item, idx) => `
        <div class="carrito-item">
            <img class="carrito-item-img" src="${item.imagen || IMG_DEFAULT}" alt="${item.nombre}"
                 onerror="this.src='${IMG_DEFAULT}'">
            <div class="carrito-item-info">
                <div class="carrito-item-nombre" title="${item.nombre}">${item.nombre}</div>
                <div class="carrito-item-precio">S/ ${item.precio.toFixed(2)} c/u</div>
                <div class="carrito-item-controles">
                    <button class="ctrl-btn" onclick="cambiarCantidad(${idx}, -1)"><i class="fa-solid fa-minus"></i></button>
                    <span class="ctrl-cantidad">${item.cantidad}</span>
                    <button class="ctrl-btn" onclick="cambiarCantidad(${idx}, 1)"><i class="fa-solid fa-plus"></i></button>
                    <button class="ctrl-btn-del" onclick="eliminarItem(${idx})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="carrito-item-subtotal">S/ ${(item.precio * item.cantidad).toFixed(2)}</div>
        </div>`).join('');
}

function cambiarCantidad(idx, delta) {
    const carrito = getCarrito();
    const item = carrito[idx];
    if (!item) return;
    const nueva = item.cantidad + delta;
    if (nueva <= 0) { eliminarItem(idx); return; }
    if (nueva > item.stock) { mostrarToast('⚠ Solo hay ' + item.stock + ' unidades disponibles', '#c0392b'); return; }
    carrito[idx].cantidad = nueva;
    saveCarrito(carrito);
    renderCarrito();
}

function eliminarItem(idx) {
    const carrito = getCarrito();
    carrito.splice(idx, 1);
    saveCarrito(carrito);
    renderCarrito();
}

function agregarAlCarrito(productoId, stock) {
    const btn = event.currentTarget;
    const card = btn.closest('.card-producto-premium');
    const nombre = card.querySelector('.prod-titulo')?.textContent?.trim() || '';
    const precio = parseFloat(card.querySelector('.prod-precio')?.textContent?.replace('S/ ', '') || 0);
    const imagen = card.querySelector('img')?.src || '';

    const carrito = getCarrito();
    const existe = carrito.findIndex(i => i.id == productoId);
    if (existe >= 0) {
        const nueva = carrito[existe].cantidad + 1;
        if (nueva > stock) { mostrarToast('⚠ Solo hay ' + stock + ' unidades disponibles', '#c0392b'); return; }
        carrito[existe].cantidad = nueva;
    } else {
        carrito.push({ id: productoId, nombre, precio, imagen, cantidad: 1, stock });
    }
    saveCarrito(carrito);
    renderCarrito();
    abrirCarrito();
    mostrarToast('✓ ' + nombre + ' agregado');
}

function irAPagar() {
    if (getCarrito().length === 0) { mostrarToast('⚠ Tu carrito está vacío', '#c0392b'); return; }
    fetch('/api/auth/check')
        .then(r => r.json())
        .then(data => {
            if (data.logueado) {
                window.location.href = '/cliente/carrito/pago';
            } else {
                cerrarCarrito();
                setTimeout(() => new bootstrap.Modal(document.getElementById('modalAuthCarrito')).show(), 300);
            }
        })
        .catch(() => { window.location.href = '/cliente/carrito/pago'; });
}

function mostrarToast(mensaje, color = '#8b5a2b') {
    const toast = document.getElementById('toastCarrito');
    const span = document.getElementById('toastMensaje');
    if (!toast || !span) return;
    span.textContent = mensaje;
    toast.style.borderColor = color;
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(100px)'; }, 3000);
}

// ── Filtro de productos por subcategoría ──────────────────
function filtrarSubcategoria(nombre, event) {
    document.querySelectorAll('.item-producto-tarjeta').forEach(item => {
        item.style.display = (nombre === 'TODOS' || item.dataset.subcategoria === nombre) ? '' : 'none';
    });
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event?.target) event.target.classList.add('active');
}

// ── Menú móvil ────────────────────────────────────────────
function toggleMobileMenu() {
    const menu = document.getElementById('navbarActions');
    const icon = document.getElementById('hamburgerBtn').querySelector('i');
    menu.classList.toggle('show-menu');
    const abierto = menu.classList.contains('show-menu');
    icon.classList.toggle('fa-xmark', abierto);
    icon.classList.toggle('fa-bars', !abierto);
}
window.addEventListener('resize', () => {
    if (window.innerWidth > 991) {
        document.getElementById('navbarActions').classList.remove('show-menu');
        const icon = document.getElementById('hamburgerBtn').querySelector('i');
        icon.classList.remove('fa-xmark'); icon.classList.add('fa-bars');
    }
});

// ── Efectos: navbar, progreso, contadores, reveal, carruseles ─
document.addEventListener('DOMContentLoaded', function () {
    renderCarrito();

    var nb = document.querySelector('.nb'), bar = document.getElementById('scrollBar');
    function onScroll() {
        if (nb) nb.classList.toggle('scrolled', window.scrollY > 50);
        if (bar) {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = (h > 0 ? window.scrollY / h * 100 : 0) + '%';
        }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Contadores animados
    var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            var el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = null;
            (function step(t) {
                t0 = t0 || t;
                var p = Math.min((t - t0) / 1600, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
                el.textContent = v.toLocaleString('es-PE') + suf;
                if (p < 1) requestAnimationFrame(step);
            })(performance.now());
            cio.unobserve(el);
        });
    }, { threshold: .6 });
    document.querySelectorAll('[data-count]').forEach(function (c) { cio.observe(c); });

    // Aparición al hacer scroll
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var rio = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add('in');
                setTimeout(function () { e.target.classList.remove('reveal', 'in'); }, 900);
                rio.unobserve(e.target);
            });
        }, { threshold: .12 });
        document.querySelectorAll('.info-card, .promo-ticket, .sec-header, .card-producto-premium, .testi-card')
            .forEach(function (el, i) {
                el.classList.add('reveal');
                el.style.transitionDelay = (i % 4) * 80 + 'ms';
                rio.observe(el);
            });
    }

    // Carruseles (servicios y testimonios)
    document.querySelectorAll('.carousel-wrap').forEach(function (wrap) {
        var track = wrap.querySelector('.snap-track'), items = track.children;
        var dotsBox = wrap.parentElement.querySelector('.car-dots');
        var auto = wrap.dataset.auto === 'true', timer;
        function step() { var i = items[0]; return i ? i.getBoundingClientRect().width + 20 : 300; }
        function go(d) {
            var max = track.scrollWidth - track.clientWidth;
            if (d > 0 && track.scrollLeft >= max - 4) track.scrollTo({ left: 0 });
            else track.scrollBy({ left: d * step() });
        }
        wrap.querySelector('.prev').onclick = function () { go(-1); };
        wrap.querySelector('.next').onclick = function () { go(1); };
        if (dotsBox) {
            for (var i = 0; i < items.length; i++) {
                var b = document.createElement('b'); b.dataset.i = i;
                b.onclick = function () { track.scrollTo({ left: this.dataset.i * step() }); };
                dotsBox.appendChild(b);
            }
            track.addEventListener('scroll', function () {
                var idx = Math.round(track.scrollLeft / step());
                dotsBox.querySelectorAll('b').forEach(function (d, k) { d.classList.toggle('active', k === idx); });
            }, { passive: true });
            track.dispatchEvent(new Event('scroll'));
        }
        if (auto) {
            var start = function () { timer = setInterval(function () { go(1); }, 4500); };
            wrap.addEventListener('mouseenter', function () { clearInterval(timer); });
            wrap.addEventListener('mouseleave', start);
            start();
        }
    });
});