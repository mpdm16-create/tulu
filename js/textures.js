// ===== FABRIC TEXTURE GENERATOR =====
function createFabricTexture(pattern, baseColor, size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const c = baseColor || '#FFFFFF';

    // Parse color to get RGB
    const hex = c.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Darker/lighter variants
    const dark = `rgb(${Math.max(0,r-40)},${Math.max(0,g-40)},${Math.max(0,b-40)})`;
    const light = `rgb(${Math.min(255,r+30)},${Math.min(255,g+30)},${Math.min(255,b+30)})`;

    switch (pattern) {
        case 'solid':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            // Subtle fabric grain
            for (let i = 0; i < size; i += 2) {
                ctx.strokeStyle = `rgba(${r+10},${g+10},${b+10},0.08)`;
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(size, i);
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
            break;

        case 'hstripes':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            const hstripeW = size / 8;
            for (let y = 0; y < size; y += hstripeW * 2) {
                ctx.fillStyle = dark;
                ctx.fillRect(0, y, size, hstripeW);
            }
            break;

        case 'plaid':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            const plaidS = size / 6;
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = dark;
            for (let x = 0; x < size; x += plaidS * 2) {
                ctx.fillRect(x, 0, plaidS, size);
            }
            for (let y = 0; y < size; y += plaidS * 2) {
                ctx.fillRect(0, y, size, plaidS);
            }
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = light;
            for (let x = plaidS; x < size; x += plaidS * 2) {
                ctx.fillRect(x, 0, 2, size);
            }
            for (let y = plaidS; y < size; y += plaidS * 2) {
                ctx.fillRect(0, y, size, 2);
            }
            ctx.globalAlpha = 1;
            break;

        case 'dots':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            const dotSpacing = size / 10;
            ctx.fillStyle = dark;
            for (let x = dotSpacing; x < size; x += dotSpacing) {
                for (let y = dotSpacing; y < size; y += dotSpacing) {
                    ctx.beginPath();
                    ctx.arc(x + (y % (dotSpacing*2) === 0 ? dotSpacing/2 : 0), y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;

        case 'denim':
            // Blue-ish weave
            const dr = 40, dg = 70, db = 140;
            ctx.fillStyle = `rgb(${dr},${dg},${db})`;
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < size; i += 1) {
                for (let j = 0; j < size; j += 3) {
                    const noise = Math.random() * 20 - 10;
                    ctx.fillStyle = `rgb(${dr+noise},${dg+noise},${db+noise})`;
                    ctx.fillRect(j, i, 2, 1);
                }
            }
            // Diagonal weave
            ctx.strokeStyle = `rgba(${dr+20},${dg+20},${db+20},0.15)`;
            for (let i = -size; i < size * 2; i += 4) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + size, size);
                ctx.stroke();
            }
            break;

        case 'linen':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            // Irregular weave
            for (let i = 0; i < size; i += 3) {
                ctx.strokeStyle = `rgba(${r-15},${g-15},${b-15},0.12)`;
                ctx.lineWidth = 0.5 + Math.random() * 1;
                ctx.beginPath();
                ctx.moveTo(0, i + Math.random() * 2);
                ctx.lineTo(size, i + Math.random() * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(i + Math.random() * 2, 0);
                ctx.lineTo(i + Math.random() * 2, size);
                ctx.stroke();
            }
            break;

        case 'floral':
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
            const petalColor = light;
            const centerColor = `rgb(${Math.min(255,r+60)},${Math.max(0,g-20)},${Math.max(0,b-20)})`;
            const spacing = size / 4;
            for (let fx = spacing/2; fx < size; fx += spacing) {
                for (let fy = spacing/2; fy < size; fy += spacing) {
                    const ox = (fy % (spacing*2) === spacing/2) ? spacing/2 : 0;
                    // Petals
                    for (let p = 0; p < 5; p++) {
                        const angle = (p / 5) * Math.PI * 2;
                        ctx.fillStyle = petalColor;
                        ctx.beginPath();
                        ctx.ellipse(fx + ox + Math.cos(angle) * 6, fy + Math.sin(angle) * 6, 5, 3, angle, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.fillStyle = centerColor;
                    ctx.beginPath();
                    ctx.arc(fx + ox, fy, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;

        case 'camo':
            ctx.fillStyle = '#4A5C3A';
            ctx.fillRect(0, 0, size, size);
            const colors = ['#3B4A2F', '#5A6B48', '#2F3E25', '#6B7D56'];
            for (let i = 0; i < 25; i++) {
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                ctx.beginPath();
                const cx = Math.random() * size;
                const cy = Math.random() * size;
                ctx.ellipse(cx, cy, 15 + Math.random() * 30, 10 + Math.random() * 20, Math.random() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        default:
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, size, size);
    }

    return canvas;
}

function makeTextureMaterial(pattern, color, roughness) {
    const canvas = createFabricTexture(pattern, color, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);

    // Adjust roughness per fabric type for realism
    const fabricRoughness = {
        solid: 0.7, linen: 0.85, denim: 0.78, stripes: 0.68,
        hstripes: 0.68, plaid: 0.72, dots: 0.65, floral: 0.65, camo: 0.8
    };
    const r = roughness || fabricRoughness[pattern] || 0.72;

    // Create bump effect for fabric depth
    const bumpCanvas = createFabricTexture(pattern, '#808080', 256);
    const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.RepeatWrapping;
    bumpTexture.repeat.set(3, 3);

    return new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: bumpTexture,
        bumpScale: 0.003,
        roughness: r,
        metalness: 0.01,
        side: THREE.DoubleSide
    });
}
