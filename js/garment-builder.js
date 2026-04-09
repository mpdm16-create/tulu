// ===== GARMENT DEFINITIONS =====
const GARMENTS = {
    tshirt:   { name:'Camiseta',  icon:'fa-tshirt',  cat:'top',    price:35000 },
    shirt:    { name:'Camisa',    icon:'fa-tshirt',  cat:'top',    price:55000 },
    blouse:   { name:'Blusa',     icon:'fa-tshirt',  cat:'top',    price:48000 },
    hoodie:   { name:'Sudadera',  icon:'fa-tshirt',  cat:'top',    price:78000 },
    tank:     { name:'Tank Top',  icon:'fa-tshirt',  cat:'top',    price:28000 },
    jacket:   { name:'Chaqueta',  icon:'fa-vest',    cat:'top',    price:95000 },
    dress:    { name:'Vestido',   icon:'fa-tshirt',  cat:'dress',  price:72000 },
    pants:    { name:'Pantalon',  icon:'fa-socks',   cat:'bottom', price:68000 },
    jeans:    { name:'Jeans',     icon:'fa-socks',   cat:'bottom', price:85000 },
    skirt:    { name:'Falda',     icon:'fa-socks',   cat:'bottom', price:45000 },
    shorts:   { name:'Short',     icon:'fa-socks',   cat:'bottom', price:35000 },
    jogger:   { name:'Jogger',    icon:'fa-socks',   cat:'bottom', price:58000 },
    leggings: { name:'Leggins',   icon:'fa-socks',   cat:'bottom', price:48000 },
};

// Options per section
const OPTIONS = {
    neckline: {
        label: 'Escote / Cuello',
        icon: 'fa-circle-notch',
        values: [
            { id:'round',  name:'Redondo' },
            { id:'v',      name:'Cuello V' },
            { id:'polo',   name:'Polo' },
            { id:'turtle', name:'Tortuga' },
            { id:'square', name:'Cuadrado' },
            { id:'boat',   name:'Barco' },
        ],
        appliesTo: ['top','dress']
    },
    sleeve: {
        label: 'Tipo de Manga',
        icon: 'fa-hand-paper',
        values: [
            { id:'none',     name:'Sin manga' },
            { id:'cap',      name:'Casquillo' },
            { id:'short',    name:'Corta' },
            { id:'3quarter', name:'3/4' },
            { id:'long',     name:'Larga' },
            { id:'bell',     name:'Campana' },
        ],
        appliesTo: ['top','dress']
    },
    length: {
        label: 'Largo',
        icon: 'fa-ruler-vertical',
        values: [
            { id:'crop',    name:'Crop' },
            { id:'normal',  name:'Normal' },
            { id:'long',    name:'Largo' },
            { id:'oversize',name:'Oversize' },
        ],
        appliesTo: ['top','dress','bottom']
    },
    fit: {
        label: 'Corte / Silueta',
        icon: 'fa-expand-alt',
        values: [
            { id:'tight',   name:'Ajustado' },
            { id:'regular', name:'Regular' },
            { id:'loose',   name:'Holgado' },
            { id:'flared',  name:'Acampanado' },
        ],
        appliesTo: ['top','dress','bottom']
    },
    waist: {
        label: 'Tipo de Cintura',
        icon: 'fa-minus',
        values: [
            { id:'normal',   name:'Normal' },
            { id:'high',     name:'Tiro alto' },
            { id:'low',      name:'Tiro bajo' },
            { id:'elastic',  name:'Elastica' },
        ],
        appliesTo: ['bottom']
    },
    pocket: {
        label: 'Bolsillos',
        icon: 'fa-inbox',
        values: [
            { id:'none',     name:'Sin bolsillos' },
            { id:'front',    name:'Frontal' },
            { id:'kangaroo', name:'Canguro' },
            { id:'side',     name:'Laterales' },
        ],
        appliesTo: ['top','dress','bottom']
    }
};

const COLORS = [
    '#FFFFFF','#F5F5F4','#D4D4D8','#000000','#1E1E2E',
    '#DC2626','#F43F5E','#EC4899','#D946EF','#A855F7',
    '#7C3AED','#2563EB','#0EA5E9','#06B6D4','#14B8A6',
    '#16A34A','#84CC16','#F59E0B','#EA580C','#92400E',
    '#FDE68A','#86EFAC','#93C5FD','#FCA5A5'
];

const TEXTURES = [
    { id:'solid',    name:'Liso',     preview:'background:#888' },
    { id:'linen',    name:'Lino',     preview:'background:repeating-linear-gradient(0deg,#888 0,#888 2px,#777 2px,#777 3px)' },
    { id:'denim',    name:'Denim',    preview:'background:linear-gradient(135deg,#4472C4,#2B5797)' },
    { id:'stripes',  name:'Rayas V',  preview:'background:repeating-linear-gradient(90deg,#888 0,#888 4px,#666 4px,#666 8px)' },
    { id:'hstripes', name:'Rayas H',  preview:'background:repeating-linear-gradient(0deg,#888 0,#888 4px,#666 4px,#666 8px)' },
    { id:'plaid',    name:'Cuadros',  preview:'background:repeating-conic-gradient(#888 0% 25%,#666 0% 50%) 0 0/8px 8px' },
    { id:'dots',     name:'Puntos',   preview:'background:radial-gradient(circle,#666 1.5px,#888 1.5px);background-size:6px 6px' },
    { id:'floral',   name:'Floral',   preview:'background:#888' },
    { id:'camo',     name:'Camuflaje',preview:'background:linear-gradient(135deg,#4A5C3A,#3B4A2F,#5A6B48)' },
];

function defaultGarmentState(type) {
    const cat = GARMENTS[type].cat;
    return {
        type,
        neckline: cat !== 'bottom' ? 'round' : null,
        sleeve: type === 'tank' ? 'none' : (cat !== 'bottom' ? 'short' : null),
        length: 'normal',
        fit: type === 'leggings' ? 'tight' : (type === 'jogger' || type === 'hoodie' ? 'loose' : 'regular'),
        waist: cat === 'bottom' ? 'normal' : null,
        pocket: 'none',
        color: '#FFFFFF',
        texture: 'solid',
    };
}

function garmentPrice(g) {
    let p = GARMENTS[g.type]?.price || 0;
    if (g.sleeve === 'long' || g.sleeve === 'bell') p += 5000;
    if (g.neckline === 'turtle') p += 4000;
    if (g.pocket !== 'none') p += 3000;
    if (g.length === 'long' || g.length === 'oversize') p += 5000;
    return p;
}

function formatPrice(n) { return '$' + n.toLocaleString('es-CO'); }

function outfitPrice(garments) {
    return garments.reduce((s, g) => s + garmentPrice(g), 0);
}

function buildConstructorHTML(garment) {
    const def = GARMENTS[garment.type];
    const cat = def.cat;
    let html = `<h3 class="step-title" style="font-size:.95rem;margin-bottom:16px"><i class="fas ${def.icon}" style="color:var(--pl)"></i> ${def.name}</h3>`;

    // Modular options
    Object.entries(OPTIONS).forEach(([key, opt]) => {
        if (!opt.appliesTo.includes(cat)) return;
        if (key === 'sleeve' && garment.type === 'tank') return; // no sleeves for tank
        html += `<div class="con-section"><label class="con-label"><i class="fas ${opt.icon}"></i> ${opt.label}</label><div class="con-options">`;
        opt.values.forEach(v => {
            const active = garment[key] === v.id ? 'active' : '';
            html += `<button class="con-opt ${active}" data-key="${key}" data-val="${v.id}">${v.name}</button>`;
        });
        html += '</div></div>';
    });

    // Color
    html += `<div class="con-section"><label class="con-label"><i class="fas fa-palette"></i> Color</label><div class="con-colors">`;
    COLORS.forEach(c => {
        const active = garment.color === c ? 'active' : '';
        html += `<button class="con-clr ${active}" data-color="${c}" style="background:${c}"></button>`;
    });
    html += `</div><div class="con-custom-color"><label>Personalizado:</label><input type="color" class="custom-clr" value="${garment.color}"></div></div>`;

    // Textures
    html += `<div class="con-section"><label class="con-label"><i class="fas fa-th-large"></i> Textura / Estampado</label><div class="con-textures">`;
    TEXTURES.forEach(t => {
        const active = garment.texture === t.id ? 'active' : '';
        html += `<button class="con-tex ${active}" data-tex="${t.id}"><div class="con-tex-preview" style="${t.preview}"></div>${t.name}</button>`;
    });
    html += '</div></div>';

    return html;
}
