// ===== TULU 3D FASHION STUDIO =====
let model = null;      // shared BodyModel instance
let currentStep = 0;   // wizard step
let selectedLayerIdx = -1; // which garment layer is selected for editing

function toast(msg) {
    const t = document.getElementById('toast');
    t.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== WIZARD =====
function goToStep(step) {
    if (step < 0 || step > 2) return;
    currentStep = step;
    document.getElementById('wizardTrack').style.transform = `translateX(-${step * 100}vw)`;

    // Update indicators
    document.querySelectorAll('.step-dot').forEach((d, i) => {
        d.classList.toggle('active', i === step);
        d.classList.toggle('done', i < step);
    });
    document.querySelectorAll('.step-line').forEach((l, i) => {
        l.classList.toggle('done', i < step);
    });

    // Update mobile nav
    updateMobileNav();

    // Init 3D for the target viewport
    setTimeout(() => {
        if (step === 0) initViewport('viewport1');
        if (step === 1) initViewport('viewport2');
        if (step === 2) { initViewport('viewport3'); buildSummary(); }
    }, 100);
}

// ===== MOBILE NAV =====
function updateMobileNav() {
    const backBtn = document.getElementById('mobileBack');
    const nextBtn = document.getElementById('mobileNext');
    const fill = document.getElementById('mobileStepFill');
    if (!backBtn || !nextBtn || !fill) return;

    backBtn.disabled = currentStep === 0;
    if (currentStep === 2) {
        nextBtn.innerHTML = '<i class="fas fa-check"></i> Listo';
        nextBtn.disabled = true;
    } else {
        nextBtn.innerHTML = 'Siguiente <i class="fas fa-arrow-right"></i>';
        nextBtn.disabled = false;
    }
    fill.style.width = `${((currentStep + 1) / 3) * 100}%`;
}

function initViewport(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!model) {
        // First init
        model = new BodyModel(containerId);
        return;
    }

    // Move renderer to new container
    if (model.renderer && model.renderer.domElement.parentElement !== container) {
        if (model.renderer.domElement.parentElement) {
            model.renderer.domElement.parentElement.removeChild(model.renderer.domElement);
        }
        container.appendChild(model.renderer.domElement);
        model.container = container;
        setTimeout(() => model.onResize(), 50);
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    // Step navigation
    document.getElementById('goStep2').addEventListener('click', () => goToStep(1));
    document.getElementById('goStep1Back').addEventListener('click', () => goToStep(0));
    document.getElementById('goStep3').addEventListener('click', () => goToStep(2));
    document.getElementById('goStep2Back').addEventListener('click', () => goToStep(1));

    document.querySelectorAll('.step-dot').forEach(d => {
        d.addEventListener('click', () => goToStep(parseInt(d.dataset.step)));
    });

    // Body controls
    initBodyControls();

    // Garment modal
    initGarmentModal();

    // Summary actions
    initSummaryActions();

    // Mobile nav buttons
    document.getElementById('mobileBack')?.addEventListener('click', () => goToStep(currentStep - 1));
    document.getElementById('mobileNext')?.addEventListener('click', () => goToStep(currentStep + 1));

    // Constructor drawer (mobile)
    initDrawer();

    // Touch swipe support for wizard
    initTouchSwipe();

    // Resize handler for 3D viewport
    window.addEventListener('resize', () => {
        if (model) model.onResize();
    });

    // User auth UI
    updateUserUI();

    // Check for saved design in URL
    setTimeout(checkSavedDesign, 500);

    // Start at step 0
    goToStep(0);
});

// ===== CONSTRUCTOR DRAWER (MOBILE) =====
function initDrawer() {
    const panel = document.getElementById('constructorPanel');
    const toggle = document.getElementById('drawerToggle');
    const handle = document.getElementById('drawerHandle');
    if (!panel || !toggle) return;

    function toggleDrawer() {
        panel.classList.toggle('open');
        // Resize 3D when drawer opens/closes
        setTimeout(() => { if (model) model.onResize(); }, 400);
    }

    toggle.addEventListener('click', toggleDrawer);
    if (handle) handle.addEventListener('click', toggleDrawer);

    // Close drawer when clicking on 3D viewport (mobile)
    const vp = document.getElementById('viewport2');
    if (vp) {
        vp.addEventListener('click', (e) => {
            if (panel.classList.contains('open') && window.innerWidth <= 768) {
                panel.classList.remove('open');
            }
        });
    }
}

// Open drawer automatically when a garment is selected
const _origSelectLayer = selectLayer;
selectLayer = function(idx) {
    _origSelectLayer(idx);
    const panel = document.getElementById('constructorPanel');
    if (panel && window.innerWidth <= 768 && idx >= 0) {
        panel.classList.add('open');
    }
};

// ===== TOUCH SWIPE =====
function initTouchSwipe() {
    const viewport = document.querySelector('.wizard-viewport');
    if (!viewport) return;
    let startX = 0;
    let startY = 0;

    viewport.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        // Only trigger if horizontal swipe > 60px and more horizontal than vertical
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) goToStep(currentStep + 1);
            else goToStep(currentStep - 1);
        }
    }, { passive: true });
}

// ===== BODY CONTROLS (Step 1) =====
function initBodyControls() {
    // Gender
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (model) model.updateBody('gender', btn.dataset.gender);
        });
    });

    // Skin
    document.querySelectorAll('.tone').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tone').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (model) model.updateBody('skinTone', btn.dataset.tone);
        });
    });

    // Sliders
    const sliders = [
        { s:'sH', v:'vH', k:'height' },
        { s:'sC', v:'vC', k:'chest' },
        { s:'sW', v:'vW', k:'waist' },
        { s:'sHip', v:'vHip', k:'hips' },
        { s:'sSh', v:'vSh', k:'shoulders' },
    ];
    sliders.forEach(({ s, v, k }) => {
        document.getElementById(s).addEventListener('input', function() {
            document.getElementById(v).textContent = this.value;
            if (model) model.updateBody(k, parseInt(this.value));
        });
    });
}

// ===== GARMENT MODAL =====
function initGarmentModal() {
    const modal = document.getElementById('addGarmentModal');
    const picker = document.getElementById('garmentPicker');
    const addBtn = document.getElementById('addGarmentBtn');
    const closeBtn = document.getElementById('modalClose');

    // Fill picker
    let html = '';
    Object.entries(GARMENTS).forEach(([id, g]) => {
        html += `<div class="gp-item" data-type="${id}"><i class="fas ${g.icon}"></i>${g.name}<br><small style="color:var(--tx3)">${formatPrice(g.price)}+</small></div>`;
    });
    picker.innerHTML = html;

    addBtn.addEventListener('click', () => modal.classList.add('open'));
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

    picker.querySelectorAll('.gp-item').forEach(item => {
        item.addEventListener('click', () => {
            addGarment(item.dataset.type);
            modal.classList.remove('open');
        });
    });
}

// ===== GARMENT LAYERS =====
function addGarment(type) {
    if (!model) return;
    const g = defaultGarmentState(type);
    model.garments.push(g);
    model.buildAllGarments();
    selectedLayerIdx = model.garments.length - 1;
    renderLayers();
    renderConstructor();
    toast(`${GARMENTS[type].name} agregada`);
}

function removeGarment(idx) {
    if (!model) return;
    model.garments.splice(idx, 1);
    model.buildAllGarments();
    if (selectedLayerIdx >= model.garments.length) selectedLayerIdx = model.garments.length - 1;
    renderLayers();
    renderConstructor();
}

function selectLayer(idx) {
    selectedLayerIdx = idx;
    renderLayers();
    renderConstructor();
}

function renderLayers() {
    const list = document.getElementById('layersList');
    if (!model || model.garments.length === 0) {
        list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--tx3);font-size:.75rem"><i class="fas fa-plus-circle" style="font-size:1.5rem;display:block;margin-bottom:8px;opacity:.3"></i>Presiona + para agregar prendas</div>';
        return;
    }

    list.innerHTML = model.garments.map((g, i) => {
        const def = GARMENTS[g.type];
        const active = i === selectedLayerIdx ? 'active' : '';
        return `<div class="layer-card ${active}" onclick="selectLayer(${i})">
            <div class="lc-icon"><i class="fas ${def.icon}"></i></div>
            <div class="lc-info">
                <div class="lc-name">${def.name}</div>
                <div class="lc-detail">${g.sleeve?g.sleeve:''} ${g.neckline||''} ${g.fit}</div>
            </div>
            <div class="lc-color" style="background:${g.color}"></div>
            <button class="lc-del" onclick="event.stopPropagation();removeGarment(${i})"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }).join('');
}

// ===== CONSTRUCTOR PANEL =====
function renderConstructor() {
    const panel = document.getElementById('constructorContent');
    if (!model || selectedLayerIdx < 0 || selectedLayerIdx >= model.garments.length) {
        panel.innerHTML = '<div class="constructor-empty"><i class="fas fa-hand-pointer"></i><p>Selecciona una prenda de la lista o agrega una nueva para empezar a disenar</p></div>';
        return;
    }

    const g = model.garments[selectedLayerIdx];
    panel.innerHTML = buildConstructorHTML(g);
    bindConstructorEvents();
}

function bindConstructorEvents() {
    const g = model.garments[selectedLayerIdx];
    if (!g) return;

    // Modular options
    document.querySelectorAll('.con-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            const val = btn.dataset.val;
            g[key] = val;
            model.buildAllGarments();
            if (model.highlightZone) model.highlightZone(key);
            renderLayers();
            btn.closest('.con-options').querySelectorAll('.con-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Colors
    document.querySelectorAll('.con-clr').forEach(btn => {
        btn.addEventListener('click', () => {
            g.color = btn.dataset.color;
            model.buildAllGarments();
            if (model.highlightZone) model.highlightZone('color');
            renderLayers();
            document.querySelectorAll('.con-clr').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Custom color
    const cc = document.querySelector('.custom-clr');
    if (cc) {
        cc.addEventListener('input', () => {
            g.color = cc.value;
            model.buildAllGarments();
            renderLayers();
            document.querySelectorAll('.con-clr').forEach(b => b.classList.remove('active'));
        });
    }

    // Textures
    document.querySelectorAll('.con-tex').forEach(btn => {
        btn.addEventListener('click', () => {
            g.texture = btn.dataset.tex;
            model.buildAllGarments();
            document.querySelectorAll('.con-tex').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// ===== STEP 3: SUMMARY =====
function buildSummary() {
    if (!model) return;
    const container = document.getElementById('outfitSummary');
    if (model.garments.length === 0) {
        container.innerHTML = '<p style="color:var(--tx3);text-align:center;padding:30px">No has agregado prendas aun</p>';
        document.getElementById('totalPrice').textContent = '$0';
        return;
    }

    container.innerHTML = model.garments.map(g => {
        const def = GARMENTS[g.type];
        return `<div class="garment-summary-card">
            <h4><i class="fas ${def.icon}"></i> ${def.name}</h4>
            ${g.neckline ? `<div class="gsc-row"><span>Escote</span><span>${g.neckline}</span></div>` : ''}
            ${g.sleeve ? `<div class="gsc-row"><span>Manga</span><span>${g.sleeve}</span></div>` : ''}
            <div class="gsc-row"><span>Largo</span><span>${g.length}</span></div>
            <div class="gsc-row"><span>Corte</span><span>${g.fit}</span></div>
            ${g.waist ? `<div class="gsc-row"><span>Cintura</span><span>${g.waist}</span></div>` : ''}
            ${g.pocket!=='none' ? `<div class="gsc-row"><span>Bolsillos</span><span>${g.pocket}</span></div>` : ''}
            <div class="gsc-row"><span>Textura</span><span>${g.texture}</span></div>
            <div class="gsc-row"><span>Precio</span><span style="color:var(--pl);font-weight:700">${formatPrice(garmentPrice(g))}</span></div>
            <div class="gsc-colors"><div style="background:${g.color};width:20px;height:20px;border-radius:50%;border:2px solid var(--brd)"></div></div>
        </div>`;
    }).join('');

    document.getElementById('totalPrice').textContent = formatPrice(outfitPrice(model.garments));
}

// ===== USER AUTH STATE =====
function getAuthToken() { return localStorage.getItem('tulu_token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('tulu_user') || 'null'); } catch { return null; } }

function updateUserUI() {
    const user = getUser();
    const btn = document.getElementById('userBtn');
    const notifBtn = document.getElementById('notifBtn');
    if (!btn) return;
    if (user) {
        btn.innerHTML = `<i class="fas fa-user-check" style="color:var(--pl)"></i>`;
        btn.title = user.name;
        btn.onclick = () => {
            if (user.role === 'admin') window.location.href = '/admin.html';
            else window.location.href = '/orders.html';
        };
        // Show notifications bell
        if (notifBtn) {
            notifBtn.style.display = '';
            notifBtn.onclick = () => window.location.href = '/orders.html';
            pollNotifications();
        }
    } else {
        btn.innerHTML = `<i class="fas fa-user"></i>`;
        btn.title = 'Iniciar sesion';
        btn.onclick = () => { window.location.href = '/login.html'; };
        if (notifBtn) notifBtn.style.display = 'none';
    }
}

async function pollNotifications() {
    const token = getAuthToken();
    if (!token) return;
    try {
        const res = await fetch('/api/notifications/unread-count', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        const badge = document.getElementById('notifBadge');
        if (badge && data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = '';
        } else if (badge) {
            badge.style.display = 'none';
        }
    } catch(e) {}
    // Poll every 30s
    setTimeout(pollNotifications, 30000);
}

// Load saved design from URL param
function checkSavedDesign() {
    const params = new URLSearchParams(window.location.search);
    const designId = params.get('design');
    if (!designId) return;
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/designs', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(r => r.json())
        .then(designs => {
            const d = designs.find(x => x.id === parseInt(designId));
            if (!d || !model) return;
            // Restore body params
            Object.keys(d.body_params).forEach(k => { model.params[k] = d.body_params[k]; });
            model.buildBody();
            // Restore garments
            model.garments = d.garments;
            model.buildAllGarments();
            renderLayers();
            toast('Diseno cargado!');
            // Update sliders to match
            const sliderMap = {height:'sH',chest:'sC',waist:'sW',hips:'sHip',shoulders:'sSh'};
            const valMap = {height:'vH',chest:'vC',waist:'vW',hips:'vHip',shoulders:'vSh'};
            Object.entries(sliderMap).forEach(([k,s]) => {
                const el = document.getElementById(s);
                if (el) el.value = d.body_params[k] || el.value;
                const vel = document.getElementById(valMap[k]);
                if (vel) vel.textContent = d.body_params[k] || vel.textContent;
            });
        }).catch(() => {});
}

// ===== SUMMARY ACTIONS =====
function initSummaryActions() {
    // Place order via API
    document.getElementById('btnOrder')?.addEventListener('click', async () => {
        if (!model || !model.garments.length) { toast('Agrega al menos una prenda'); return; }
        const token = getAuthToken();
        if (!token) { window.location.href = '/login.html'; return; }
        const btn = document.getElementById('btnOrder');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        try {
            const screenshot = model.takeScreenshot();
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({
                    garments: model.garments,
                    bodyParams: model.params,
                    totalPrice: outfitPrice(model.garments),
                    screenshot: screenshot
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast('Pedido #' + data.id + ' creado exitosamente!');
            btn.innerHTML = '<i class="fas fa-check"></i> Pedido Enviado';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Hacer Pedido';
            }, 3000);
        } catch (err) {
            toast('Error: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Hacer Pedido';
        }
    });

    // Save design
    document.getElementById('btnSaveDesign')?.addEventListener('click', async () => {
        if (!model || !model.garments.length) { toast('Agrega al menos una prenda'); return; }
        const token = getAuthToken();
        if (!token) { window.location.href = '/login.html'; return; }
        const name = prompt('Nombre del diseño:', 'Mi Outfit') || 'Mi Outfit';
        try {
            const screenshot = model.takeScreenshot();
            const res = await fetch('/api/designs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ name, garments: model.garments, bodyParams: model.params, screenshot })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast('Diseño guardado!');
        } catch (err) { toast('Error: ' + err.message); }
    });

    document.getElementById('btnWhatsApp')?.addEventListener('click', () => {
        if (!model || !model.garments.length) return;
        const msg = buildOrderMessage();
        window.open(`https://wa.me/573001234567?text=${encodeURIComponent(msg)}`, '_blank');
    });

    document.getElementById('btnEmail')?.addEventListener('click', () => {
        if (!model || !model.garments.length) return;
        const msg = buildOrderMessage();
        window.open(`mailto:info@tulu.com?subject=${encodeURIComponent('Pedido TULU')}&body=${encodeURIComponent(msg)}`, '_blank');
    });

    document.getElementById('btnScreenshot')?.addEventListener('click', () => {
        if (!model) return;
        const data = model.takeScreenshot();
        const link = document.createElement('a');
        link.download = 'TULU_outfit_3d.png';
        link.href = data;
        link.click();
        toast('Captura descargada!');
    });
}

function buildOrderMessage() {
    let msg = '🛍️ *PEDIDO TULU - Outfit Personalizado 3D*\n\n';
    model.garments.forEach((g, i) => {
        const def = GARMENTS[g.type];
        msg += `*${i+1}. ${def.name}*\n`;
        if (g.neckline) msg += `   Escote: ${g.neckline}\n`;
        if (g.sleeve) msg += `   Manga: ${g.sleeve}\n`;
        msg += `   Largo: ${g.length} | Corte: ${g.fit}\n`;
        if (g.waist) msg += `   Cintura: ${g.waist}\n`;
        if (g.pocket !== 'none') msg += `   Bolsillos: ${g.pocket}\n`;
        msg += `   Textura: ${g.texture}\n`;
        msg += `   Precio: ${formatPrice(garmentPrice(g))}\n\n`;
    });
    msg += `*TOTAL: ${formatPrice(outfitPrice(model.garments))}*\n`;
    msg += `\nMedidas: ${model.params.height}cm | Pecho:${model.params.chest} | Cintura:${model.params.waist} | Cadera:${model.params.hips}\n`;
    msg += '\nPor favor confirmar disponibilidad. Gracias!';
    return msg;
}
