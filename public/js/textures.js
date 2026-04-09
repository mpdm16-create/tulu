// ===== FABRIC TEXTURE GENERATOR WITH REALISTIC MATERIALS =====

// Simplex-like noise for organic wrinkles
const _perm = new Uint8Array(512);
(function() { for (let i = 0; i < 256; i++) _perm[i] = i; for (let i = 255; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [_perm[i], _perm[j]] = [_perm[j], _perm[i]]; } for (let i = 0; i < 256; i++) _perm[i + 256] = _perm[i]; })();

function noise2D(x, y) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = _perm[xi] + yi, b = _perm[xi + 1] + yi;
    const aa = _perm[a], ab = _perm[a + 1], ba = _perm[b], bb = _perm[b + 1];
    const g = (h, dx, dy) => { const k = h & 3; return (k < 2 ? (k === 0 ? dx : -dx) : 0) + (k < 2 ? 0 : (k === 2 ? dy : -dy)); };
    return (1 + (g(aa, xf, yf) * (1 - u) * (1 - v) + g(ba, xf - 1, yf) * u * (1 - v) +
            g(ab, xf, yf - 1) * (1 - u) * v + g(bb, xf - 1, yf - 1) * u * v)) / 2;
}

function fbm(x, y, octaves) {
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
        val += amp * noise2D(x * freq, y * freq);
        amp *= 0.5; freq *= 2;
    }
    return val;
}

// Generate normal map from height data
function generateNormalMap(size, heightFn, strength) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    const s = strength || 2.0;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const hL = heightFn((x - 1 + size) % size, y);
            const hR = heightFn((x + 1) % size, y);
            const hU = heightFn(x, (y - 1 + size) % size);
            const hD = heightFn(x, (y + 1) % size);
            let nx = (hL - hR) * s;
            let ny = (hU - hD) * s;
            let nz = 1.0;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            nx /= len; ny /= len; nz /= len;
            const i = (y * size + x) * 4;
            d[i]     = Math.floor((nx * 0.5 + 0.5) * 255);
            d[i + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
            d[i + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
            d[i + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

// Fabric weave normal maps per type
function createFabricNormalMap(pattern, size) {
    size = size || 256;
    switch (pattern) {
        case 'denim':
            return generateNormalMap(size, (x, y) => {
                const tw = Math.sin((x + y) * 0.3) * 0.3 + noise2D(x * 0.05, y * 0.05) * 0.4;
                return tw + fbm(x * 0.08, y * 0.08, 3) * 0.3;
            }, 3.0);
        case 'linen':
            return generateNormalMap(size, (x, y) => {
                const warpH = Math.sin(x * 0.8 + noise2D(x * 0.02, y * 0.03) * 4) * 0.3;
                const weftH = Math.sin(y * 0.8 + noise2D(x * 0.03, y * 0.02) * 4) * 0.25;
                return warpH + weftH + fbm(x * 0.06, y * 0.06, 2) * 0.15;
            }, 2.5);
        case 'plaid':
        case 'stripes':
        case 'hstripes':
            return generateNormalMap(size, (x, y) => {
                const weave = (Math.sin(x * 0.5) * 0.5 + 0.5) * (Math.sin(y * 0.5) * 0.5 + 0.5);
                return weave * 0.4 + fbm(x * 0.04, y * 0.04, 2) * 0.2;
            }, 2.0);
        default:
            // Generic cotton/jersey weave
            return generateNormalMap(size, (x, y) => {
                const knit = Math.sin(x * 1.2) * Math.sin(y * 0.8) * 0.15;
                return knit + fbm(x * 0.06, y * 0.06, 3) * 0.25;
            }, 1.8);
    }
}

// Generate wrinkle/fold displacement data for garment vertices
function generateWrinkleMap(size) {
    size = size || 256;
    return generateNormalMap(size, (x, y) => {
        // Large folds
        const fold = fbm(x * 0.015, y * 0.02, 4) * 0.6;
        // Medium creases
        const crease = Math.abs(Math.sin(fbm(x * 0.04, y * 0.03, 3) * 6)) * 0.25;
        // Fine wrinkles
        const fine = fbm(x * 0.1, y * 0.1, 2) * 0.15;
        return fold + crease + fine;
    }, 3.5);
}

function createFabricTexture(pattern, baseColor, size) {
    size = size || 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const c = baseColor || '#FFFFFF';

    const hex = c.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const dark = `rgb(${Math.max(0,r-40)},${Math.max(0,g-40)},${Math.max(0,b-40)})`;
    const light = `rgb(${Math.min(255,r+30)},${Math.min(255,g+30)},${Math.min(255,b+30)})`;

    switch (pattern) {
        case 'solid':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            // Realistic fabric grain (jersey knit texture)
            for (let y = 0; y < size; y += 2) {
                for (let x = 0; x < size; x += 2) {
                    const n = noise2D(x * 0.08, y * 0.08);
                    const v = Math.floor(n * 12 - 6);
                    ctx.fillStyle = `rgba(${Math.min(255,r+v)},${Math.min(255,g+v)},${Math.min(255,b+v)},0.3)`;
                    ctx.fillRect(x, y, 2, 2);
                }
            }
            // Subtle horizontal knit lines
            for (let i = 0; i < size; i += 3) {
                const offset = noise2D(i * 0.1, 0) * 2;
                ctx.strokeStyle = `rgba(${Math.min(255,r+8)},${Math.min(255,g+8)},${Math.min(255,b+8)},0.06)`;
                ctx.beginPath();
                ctx.moveTo(0, i + offset);
                ctx.lineTo(size, i + offset);
                ctx.stroke();
            }
            break;

        case 'stripes':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            const stripeW = size / 8;
            for (let x = 0; x < size; x += stripeW * 2) {
                ctx.fillStyle = dark;
                ctx.fillRect(x, 0, stripeW, size);
            }
            // Weave texture overlay
            for (let y = 0; y < size; y += 2) {
                ctx.strokeStyle = `rgba(255,255,255,0.03)`;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
            }
            break;

        case 'hstripes':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            const hstripeW = size / 8;
            for (let y = 0; y < size; y += hstripeW * 2) {
                ctx.fillStyle = dark;
                ctx.fillRect(0, y, size, hstripeW);
            }
            for (let x = 0; x < size; x += 2) {
                ctx.strokeStyle = `rgba(255,255,255,0.03)`;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
            }
            break;

        case 'plaid':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            const plaidS = size / 6;
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = dark;
            for (let x = 0; x < size; x += plaidS * 2) ctx.fillRect(x, 0, plaidS, size);
            for (let y = 0; y < size; y += plaidS * 2) ctx.fillRect(0, y, size, plaidS);
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = light;
            for (let x = plaidS; x < size; x += plaidS * 2) ctx.fillRect(x, 0, 2, size);
            for (let y = plaidS; y < size; y += plaidS * 2) ctx.fillRect(0, y, size, 2);
            ctx.globalAlpha = 1;
            break;

        case 'dots':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            const dotSpacing = size / 10;
            ctx.fillStyle = dark;
            for (let x = dotSpacing; x < size; x += dotSpacing) {
                for (let y = dotSpacing; y < size; y += dotSpacing) {
                    const ox = (Math.floor(y / dotSpacing) % 2) * dotSpacing / 2;
                    ctx.beginPath();
                    ctx.arc(x + ox, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;

        case 'denim':
            const dr = 40, dg = 70, db = 140;
            ctx.fillStyle = `rgb(${dr},${dg},${db})`;
            ctx.fillRect(0, 0, size, size);
            // Twill weave pattern
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j += 2) {
                    const n = noise2D(j * 0.04, i * 0.04) * 18 - 9;
                    ctx.fillStyle = `rgb(${dr+n},${dg+n},${db+n})`;
                    ctx.fillRect(j, i, 2, 1);
                }
            }
            // Diagonal twill lines
            ctx.strokeStyle = `rgba(${dr+25},${dg+25},${db+25},0.12)`;
            ctx.lineWidth = 0.8;
            for (let i = -size; i < size * 2; i += 3) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
            }
            // Subtle fading/wear
            const fadeGrad = ctx.createRadialGradient(size*0.5, size*0.5, size*0.1, size*0.5, size*0.5, size*0.5);
            fadeGrad.addColorStop(0, `rgba(${dr+15},${dg+15},${db+15},0.08)`);
            fadeGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fadeGrad;
            ctx.fillRect(0, 0, size, size);
            break;

        case 'linen':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < size; i += 2) {
                ctx.strokeStyle = `rgba(${Math.max(0,r-15)},${Math.max(0,g-15)},${Math.max(0,b-15)},${0.08 + Math.random()*0.06})`;
                ctx.lineWidth = 0.5 + Math.random() * 1.2;
                ctx.beginPath();
                ctx.moveTo(0, i + Math.random() * 3);
                ctx.lineTo(size, i + Math.random() * 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(i + Math.random() * 3, 0);
                ctx.lineTo(i + Math.random() * 3, size);
                ctx.stroke();
            }
            // Random slubs (irregular thick spots in linen)
            for (let i = 0; i < 30; i++) {
                ctx.fillStyle = `rgba(${Math.max(0,r-20)},${Math.max(0,g-20)},${Math.max(0,b-20)},0.1)`;
                const sx = Math.random() * size, sy = Math.random() * size;
                ctx.fillRect(sx, sy, 1 + Math.random() * 3, 1);
            }
            break;

        case 'floral':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            // Background texture
            for (let y = 0; y < size; y += 3) {
                for (let x = 0; x < size; x += 3) {
                    const n = noise2D(x * 0.05, y * 0.05) * 8;
                    ctx.fillStyle = `rgba(${r+n},${g+n},${b+n},0.15)`;
                    ctx.fillRect(x, y, 3, 3);
                }
            }
            const spacing = size / 4;
            for (let fx = spacing / 2; fx < size; fx += spacing) {
                for (let fy = spacing / 2; fy < size; fy += spacing) {
                    const ox = (Math.floor(fy / spacing) % 2) * spacing / 2;
                    const cx = fx + ox, cy = fy;
                    // Petals with gradient
                    for (let p = 0; p < 6; p++) {
                        const angle = (p / 6) * Math.PI * 2 + noise2D(cx * 0.01, cy * 0.01) * 0.5;
                        ctx.save();
                        ctx.translate(cx + Math.cos(angle) * 7, cy + Math.sin(angle) * 7);
                        ctx.rotate(angle);
                        ctx.fillStyle = light;
                        ctx.beginPath();
                        ctx.ellipse(0, 0, 6, 3.5, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                    // Center
                    ctx.fillStyle = `rgb(${Math.min(255,r+60)},${Math.max(0,g-20)},${Math.max(0,b-20)})`;
                    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
                    // Leaf
                    ctx.fillStyle = `rgba(50,120,50,0.4)`;
                    ctx.beginPath();
                    ctx.ellipse(cx + 10, cy + 8, 6, 2.5, 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;

        case 'camo':
            ctx.fillStyle = '#4A5C3A';
            ctx.fillRect(0, 0, size, size);
            const colors = ['#3B4A2F', '#5A6B48', '#2F3E25', '#6B7D56', '#445533'];
            for (let i = 0; i < 35; i++) {
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                ctx.beginPath();
                const cx = Math.random() * size, cy = Math.random() * size;
                // Organic blob shapes
                ctx.moveTo(cx, cy);
                for (let a = 0; a < Math.PI * 2; a += 0.3) {
                    const rad = 12 + Math.random() * 25 + Math.sin(a * 3) * 8;
                    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
                }
                ctx.closePath(); ctx.fill();
            }
            break;

        default:
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
    }

    return canvas;
}

function makeTextureMaterial(pattern, color, roughnessOverride) {
    const canvas = createFabricTexture(pattern, color, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);

    // Fabric-specific physical properties
    const fabricProps = {
        solid:    { roughness: 0.72, metalness: 0.0,  clearcoat: 0.0  },
        linen:    { roughness: 0.88, metalness: 0.0,  clearcoat: 0.0  },
        denim:    { roughness: 0.8,  metalness: 0.0,  clearcoat: 0.05 },
        stripes:  { roughness: 0.68, metalness: 0.0,  clearcoat: 0.02 },
        hstripes: { roughness: 0.68, metalness: 0.0,  clearcoat: 0.02 },
        plaid:    { roughness: 0.75, metalness: 0.0,  clearcoat: 0.01 },
        dots:     { roughness: 0.65, metalness: 0.0,  clearcoat: 0.03 },
        floral:   { roughness: 0.6,  metalness: 0.0,  clearcoat: 0.04 },
        camo:     { roughness: 0.85, metalness: 0.0,  clearcoat: 0.0  },
    };
    const props = fabricProps[pattern] || fabricProps.solid;
    const roughness = roughnessOverride || props.roughness;

    // Normal map for fabric weave micro-detail
    const normalCanvas = createFabricNormalMap(pattern, 256);
    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(4, 4);

    // MeshPhysicalMaterial compatible with Three.js r128
    const mat = new THREE.MeshPhysicalMaterial({
        map: texture,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(0.3, 0.3),
        roughness: roughness,
        metalness: props.metalness,
        side: THREE.DoubleSide,
        clearcoat: props.clearcoat,
        clearcoatRoughness: 0.8,
        reflectivity: 0.2,
    });

    return mat;
}
