// ===== CATALOGO DE PRODUCTOS =====
const PRODUCTS = [
    // --- PARTE SUPERIOR ---
    {
        id: 1,
        name: "Camiseta Clasica",
        category: "superior",
        price: 35000,
        badge: "Popular",
        icon: "tshirt",
        svgType: "tshirt",
        description: "Camiseta de algodon unisex, ideal para personalizar"
    },
    {
        id: 2,
        name: "Camiseta Cuello V",
        category: "superior",
        price: 38000,
        badge: null,
        icon: "tshirt",
        svgType: "tshirt-v",
        description: "Camiseta con cuello en V elegante"
    },
    {
        id: 3,
        name: "Camisa Manga Larga",
        category: "superior",
        price: 55000,
        badge: null,
        icon: "tshirt",
        svgType: "shirt-long",
        description: "Camisa formal de manga larga"
    },
    {
        id: 4,
        name: "Blusa Mujer",
        category: "superior",
        price: 45000,
        badge: "Nuevo",
        icon: "tshirt",
        svgType: "blouse",
        description: "Blusa femenina con corte moderno"
    },
    {
        id: 5,
        name: "Polo Clasico",
        category: "superior",
        price: 48000,
        badge: null,
        icon: "tshirt",
        svgType: "polo",
        description: "Polo con cuello ideal para casual o corporativo"
    },
    {
        id: 6,
        name: "Sudadera con Capucha",
        category: "superior",
        price: 75000,
        badge: "Popular",
        icon: "tshirt",
        svgType: "hoodie",
        description: "Hoodie comodo y calido para personalizar"
    },
    {
        id: 7,
        name: "Crop Top",
        category: "superior",
        price: 32000,
        badge: "Nuevo",
        icon: "tshirt",
        svgType: "croptop",
        description: "Top corto moderno y juvenil"
    },
    {
        id: 8,
        name: "Tank Top",
        category: "superior",
        price: 28000,
        badge: null,
        icon: "tshirt",
        svgType: "tanktop",
        description: "Camiseta sin mangas deportiva"
    },

    // --- PARTE INFERIOR ---
    {
        id: 9,
        name: "Jean Clasico",
        category: "inferior",
        price: 85000,
        badge: "Popular",
        icon: "tshirt",
        svgType: "jeans",
        description: "Jean de mezclilla corte recto"
    },
    {
        id: 10,
        name: "Pantalon Jogger",
        category: "inferior",
        price: 65000,
        badge: null,
        icon: "tshirt",
        svgType: "jogger",
        description: "Jogger comodo para el dia a dia"
    },
    {
        id: 11,
        name: "Falda Corta",
        category: "inferior",
        price: 42000,
        badge: "Nuevo",
        icon: "tshirt",
        svgType: "skirt",
        description: "Falda corta con estilo moderno"
    },
    {
        id: 12,
        name: "Short Deportivo",
        category: "inferior",
        price: 35000,
        badge: null,
        icon: "tshirt",
        svgType: "shorts",
        description: "Short ligero para deporte o casual"
    },

    // --- VESTIDOS ---
    {
        id: 13,
        name: "Vestido Casual",
        category: "vestidos",
        price: 72000,
        badge: "Popular",
        icon: "tshirt",
        svgType: "dress",
        description: "Vestido casual hasta la rodilla"
    },
    {
        id: 14,
        name: "Vestido Largo",
        category: "vestidos",
        price: 95000,
        badge: null,
        icon: "tshirt",
        svgType: "dress-long",
        description: "Vestido largo elegante para ocasiones especiales"
    },
    {
        id: 15,
        name: "Vestido Corto",
        category: "vestidos",
        price: 62000,
        badge: "Nuevo",
        icon: "tshirt",
        svgType: "dress-short",
        description: "Vestido corto juvenil y fresco"
    },

    // --- DEPORTIVO ---
    {
        id: 16,
        name: "Jersey Deportivo",
        category: "deportivo",
        price: 55000,
        badge: null,
        icon: "tshirt",
        svgType: "jersey",
        description: "Jersey para tu equipo deportivo"
    },
    {
        id: 17,
        name: "Leggins",
        category: "deportivo",
        price: 48000,
        badge: "Nuevo",
        icon: "tshirt",
        svgType: "leggings",
        description: "Leggins deportivos de alta compresion"
    },
    {
        id: 18,
        name: "Conjunto Deportivo",
        category: "deportivo",
        price: 110000,
        badge: "Popular",
        icon: "tshirt",
        svgType: "sportset",
        description: "Conjunto top + leggins para entrenar"
    },

    // --- ACCESORIOS ---
    {
        id: 19,
        name: "Gorra Clasica",
        category: "accesorios",
        price: 25000,
        badge: null,
        icon: "hat-cowboy",
        svgType: "cap",
        description: "Gorra de 5 paneles personalizable"
    },
    {
        id: 20,
        name: "Tote Bag",
        category: "accesorios",
        price: 22000,
        badge: "Nuevo",
        icon: "shopping-bag",
        svgType: "totebag",
        description: "Bolsa de tela ecologica"
    },
    {
        id: 21,
        name: "Delantal",
        category: "accesorios",
        price: 30000,
        badge: null,
        icon: "tshirt",
        svgType: "apron",
        description: "Delantal para cocina o trabajo"
    }
];

// ===== SVG GARMENT SHAPES =====
function getGarmentSVG(type, color = '#FFFFFF') {
    const svgs = {
        'tshirt': `<svg viewBox="0 0 200 220" class="garment-svg">
            <path d="M60,10 L30,30 L10,70 L35,80 L45,50 L45,210 L155,210 L155,50 L165,80 L190,70 L170,30 L140,10 L120,25 C110,35 90,35 80,25 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
        </svg>`,
        'tshirt-v': `<svg viewBox="0 0 200 220" class="garment-svg">
            <path d="M60,10 L30,30 L10,70 L35,80 L45,50 L45,210 L155,210 L155,50 L165,80 L190,70 L170,30 L140,10 L115,40 L100,55 L85,40 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
        </svg>`,
        'shirt-long': `<svg viewBox="0 0 200 230" class="garment-svg">
            <path d="M65,10 L30,25 L5,85 L5,180 L25,185 L30,90 L40,55 L40,220 L160,220 L160,55 L170,90 L175,185 L195,180 L195,85 L170,25 L135,10 L120,25 C110,35 90,35 80,25 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <line x1="100" y1="25" x2="100" y2="220" stroke="#555" stroke-width="1" stroke-dasharray="5,5"/>
        </svg>`,
        'blouse': `<svg viewBox="0 0 200 220" class="garment-svg">
            <path d="M65,10 L30,30 L15,65 L35,72 L42,48 L38,210 L162,210 L158,48 L165,72 L185,65 L170,30 L135,10 L118,28 C110,38 90,38 82,28 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <ellipse cx="100" cy="20" rx="22" ry="6" fill="none" stroke="#555" stroke-width="1.5"/>
        </svg>`,
        'polo': `<svg viewBox="0 0 200 220" class="garment-svg">
            <path d="M60,15 L30,32 L12,72 L37,80 L46,52 L46,210 L154,210 L154,52 L163,80 L188,72 L170,32 L140,15 L125,28 L115,20 L100,30 L85,20 L75,28 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <rect x="93" y="18" width="14" height="18" rx="2" fill="none" stroke="#555" stroke-width="1.5"/>
        </svg>`,
        'hoodie': `<svg viewBox="0 0 200 230" class="garment-svg">
            <path d="M55,15 L25,35 L5,95 L5,180 L25,185 L30,100 L38,60 L38,220 L162,220 L162,60 L170,100 L175,185 L195,180 L195,95 L175,35 L145,15 L130,30 C115,45 85,45 70,30 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M70,30 C85,50 115,50 130,30" fill="none" stroke="#555" stroke-width="1.5"/>
            <path d="M80,60 L85,120 L100,130 L115,120 L120,60" fill="none" stroke="#555" stroke-width="1"/>
        </svg>`,
        'croptop': `<svg viewBox="0 0 200 160" class="garment-svg">
            <path d="M60,10 L30,28 L15,58 L35,65 L44,42 L44,140 L156,140 L156,42 L165,65 L185,58 L170,28 L140,10 L118,28 C108,38 92,38 82,28 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
        </svg>`,
        'tanktop': `<svg viewBox="0 0 200 220" class="garment-svg">
            <path d="M70,10 L55,15 L48,40 L48,210 L152,210 L152,40 L145,15 L130,10 L115,25 C108,32 92,32 85,25 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
        </svg>`,
        'jeans': `<svg viewBox="0 0 200 260" class="garment-svg">
            <path d="M40,10 L35,100 L30,250 L90,250 L95,140 L100,130 L105,140 L110,250 L170,250 L165,100 L160,10 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <line x1="100" y1="10" x2="100" y2="130" stroke="#555" stroke-width="1.5"/>
            <path d="M40,10 L160,10" fill="none" stroke="#555" stroke-width="2"/>
            <rect x="85" y="15" width="30" height="8" rx="1" fill="none" stroke="#555" stroke-width="1"/>
        </svg>`,
        'jogger': `<svg viewBox="0 0 200 260" class="garment-svg">
            <path d="M40,10 L32,100 L35,230 L42,245 L88,245 L85,140 L100,125 L115,140 L112,245 L158,245 L165,230 L168,100 L160,10 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <line x1="100" y1="10" x2="100" y2="125" stroke="#555" stroke-width="1"/>
            <path d="M38,10 L162,10" stroke="#555" stroke-width="3"/>
        </svg>`,
        'skirt': `<svg viewBox="0 0 200 200" class="garment-svg">
            <path d="M55,10 L25,190 L175,190 L145,10 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M55,10 L145,10" stroke="#555" stroke-width="3"/>
            <rect x="88" y="12" width="24" height="8" rx="1" fill="none" stroke="#555" stroke-width="1"/>
        </svg>`,
        'shorts': `<svg viewBox="0 0 200 160" class="garment-svg">
            <path d="M35,10 L25,140 L88,140 L95,80 L100,70 L105,80 L112,140 L175,140 L165,10 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <line x1="100" y1="10" x2="100" y2="70" stroke="#555" stroke-width="1.5"/>
            <path d="M35,10 L165,10" stroke="#555" stroke-width="3"/>
        </svg>`,
        'dress': `<svg viewBox="0 0 200 280" class="garment-svg">
            <path d="M70,10 L55,20 L45,50 L40,80 L25,270 L175,270 L160,80 L155,50 L145,20 L130,10 L118,25 C110,35 90,35 82,25 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M40,80 L160,80" fill="none" stroke="#555" stroke-width="1" stroke-dasharray="4,4"/>
        </svg>`,
        'dress-long': `<svg viewBox="0 0 200 300" class="garment-svg">
            <path d="M70,10 L55,20 L45,50 L38,85 L15,290 L185,290 L162,85 L155,50 L145,20 L130,10 L118,25 C110,35 90,35 82,25 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M38,85 L162,85" fill="none" stroke="#555" stroke-width="1" stroke-dasharray="4,4"/>
        </svg>`,
        'dress-short': `<svg viewBox="0 0 200 220" class="garment-svg">
            <path d="M70,10 L55,20 L48,45 L42,75 L30,200 L170,200 L158,75 L152,45 L145,20 L130,10 L118,25 C110,35 90,35 82,25 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M42,75 L158,75" fill="none" stroke="#555" stroke-width="1" stroke-dasharray="4,4"/>
        </svg>`,
        'jersey': `<svg viewBox="0 0 200 220" class="garment-svg">
            <path d="M55,10 L25,30 L8,75 L35,82 L44,52 L44,210 L156,210 L156,52 L165,82 L192,75 L175,30 L145,10 L125,25 C112,36 88,36 75,25 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <text x="100" y="135" text-anchor="middle" font-size="36" font-weight="bold" fill="#555" opacity="0.3">10</text>
        </svg>`,
        'leggings': `<svg viewBox="0 0 200 280" class="garment-svg">
            <path d="M45,10 L38,100 L35,260 L40,270 L90,270 L92,140 L100,125 L108,140 L110,270 L160,270 L165,260 L162,100 L155,10 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M45,10 L155,10" stroke="#555" stroke-width="3"/>
        </svg>`,
        'sportset': `<svg viewBox="0 0 200 300" class="garment-svg">
            <path d="M70,5 L55,12 L48,35 L48,95 L152,95 L152,35 L145,12 L130,5 L115,18 C108,25 92,25 85,18 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M48,110 L42,200 L38,285 L42,290 L88,290 L92,195 L100,180 L108,195 L112,290 L158,290 L162,285 L158,200 L152,110 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
        </svg>`,
        'cap': `<svg viewBox="0 0 200 140" class="garment-svg">
            <ellipse cx="100" cy="90" rx="75" ry="30" fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M25,90 C25,40 175,40 175,90" fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M25,90 L5,100 C0,102 5,110 15,108 L45,100" fill="${color}" stroke="#555" stroke-width="2"/>
            <line x1="100" y1="38" x2="100" y2="90" stroke="#555" stroke-width="1"/>
        </svg>`,
        'totebag': `<svg viewBox="0 0 180 220" class="garment-svg">
            <rect x="20" y="60" width="140" height="155" rx="5" fill="${color}" stroke="#555" stroke-width="2"/>
            <path d="M55,60 L55,30 C55,15 125,15 125,30 L125,60" fill="none" stroke="#555" stroke-width="3"/>
        </svg>`,
        'apron': `<svg viewBox="0 0 200 260" class="garment-svg">
            <path d="M60,10 C60,10 80,0 100,0 C120,0 140,10 140,10 L145,30 L160,30 L175,25 L180,35 L155,50 L150,45 L150,250 L50,250 L50,45 L45,50 L20,35 L25,25 L40,30 L55,30 Z"
                  fill="${color}" stroke="#555" stroke-width="2"/>
            <rect x="70" y="120" width="60" height="50" rx="5" fill="none" stroke="#555" stroke-width="1.5"/>
        </svg>`
    };
    return svgs[type] || svgs['tshirt'];
}

function formatPrice(price) {
    return '$' + price.toLocaleString('es-CO');
}
