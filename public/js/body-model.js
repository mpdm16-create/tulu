// ===== 3D BODY MODEL WITH PATTERN-BASED GARMENTS =====
class BodyModel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.params = { gender:'female', height:170, chest:90, waist:70, hips:95, shoulders:42, skinTone:'#FDDCB5' };
        this.garments = [];
        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x08080F);
        this.scene.fog = new THREE.FogExp2(0x08080F, 0.07);

        const a = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(42, a, 0.1, 100);
        this.camera.position.set(0, 1.0, 3.8);

        this.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        if (this.renderer.outputEncoding !== undefined) this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.07;
        this.controls.target.set(0, 0.95, 0);
        this.controls.minDistance = 1.5;
        this.controls.maxDistance = 7;

        this.addLights();
        this.addFloor();

        this.bodyGroup = new THREE.Group();
        this.garmentGroup = new THREE.Group();
        this.scene.add(this.bodyGroup);
        this.scene.add(this.garmentGroup);

        this.buildBody();
        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    addLights() {
        this.scene.add(new THREE.AmbientLight(0x8888cc, 0.5));
        const k = new THREE.DirectionalLight(0xfff5ee, 0.9);
        k.position.set(3, 5, 4); k.castShadow = true;
        k.shadow.mapSize.width = 1024; k.shadow.mapSize.height = 1024;
        this.scene.add(k);
        const f = new THREE.DirectionalLight(0x7C3AED, 0.3); f.position.set(-4, 3, -2); this.scene.add(f);
        const r = new THREE.DirectionalLight(0xF43F5E, 0.2); r.position.set(0, 2, -5); this.scene.add(r);
        // Rim light for depth
        const rim = new THREE.DirectionalLight(0xaaaaff, 0.15); rim.position.set(-2, 4, -3); this.scene.add(rim);
    }

    addFloor() {
        this.scene.add(new THREE.GridHelper(10, 30, 0x222244, 0x111128));
        const pg = new THREE.CylinderGeometry(0.7, 0.75, 0.04, 64);
        const pm = new THREE.MeshStandardMaterial({ color:0x181830, metalness:0.4, roughness:0.6 });
        const p = new THREE.Mesh(pg, pm); p.position.y = 0.02; p.receiveShadow = true; this.scene.add(p);
        const rg = new THREE.TorusGeometry(0.72, 0.008, 8, 64);
        const rm = new THREE.MeshBasicMaterial({ color:0x7C3AED, transparent:true, opacity:0.35 });
        const ring = new THREE.Mesh(rg, rm); ring.rotation.x = Math.PI/2; ring.position.y = 0.045; this.scene.add(ring);
    }

    lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
    smoothstep(a, b, t) { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t); }

    clearGroup(g) {
        while (g.children.length) {
            const c = g.children[0];
            if (c.geometry) c.geometry.dispose();
            if (c.material) { if (Array.isArray(c.material)) c.material.forEach(m=>m.dispose()); else c.material.dispose(); }
            g.remove(c);
        }
    }

    // Create lathe geometry with front/back asymmetry for realistic garments
    lathe(profile, mat, yOff, sX, sZ) {
        const pts = profile.map(p => new THREE.Vector2(p[0], p[1]));
        const geo = new THREE.LatheGeometry(pts, 48);
        const m = new THREE.Mesh(geo, mat);
        m.position.y = yOff; m.scale.set(sX || 1, 1, sZ || 1); m.castShadow = true;
        return m;
    }

    // Apply wrinkles, gravity drape and organic noise to garment geometry
    applyFabricDeformation(geo, opts) {
        const {
            wrinkleAmount = 0.003,   // intensity of wrinkles
            gravityAmount = 0.0,     // how much loose fabric sags
            noiseAmount = 0.001,     // organic surface noise
            stressPoints = [],       // [{y, intensity}] where wrinkles concentrate (elbows, waist)
            fitType = 'regular',
            minY = -Infinity,        // only deform within Y range
            maxY = Infinity
        } = opts || {};

        const pos = geo.attributes.position;
        const fitMultiplier = fitType === 'tight' ? 0.3 : fitType === 'loose' ? 1.6 : fitType === 'flared' ? 1.3 : 1.0;

        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            if (y < minY || y > maxY) continue;

            const r = Math.sqrt(x * x + z * z);
            if (r < 0.001) continue;
            const angle = Math.atan2(z, x);

            // 1. Organic surface noise - nothing in real fabric is perfectly smooth
            const n = noise2D(angle * 3 + y * 40, y * 30) * noiseAmount * fitMultiplier;
            x += Math.cos(angle) * n;
            z += Math.sin(angle) * n;

            // 2. Wrinkles - concentrated at stress points
            let wrinkle = 0;
            // Procedural wrinkles based on position
            wrinkle += Math.sin(angle * 8 + y * 25) * wrinkleAmount * 0.4;
            wrinkle += Math.sin(angle * 13 + y * 40) * wrinkleAmount * 0.2;
            wrinkle += fbm(angle * 2 + 10, y * 15, 3) * wrinkleAmount * 0.6;

            // Extra wrinkles at stress points
            for (const sp of stressPoints) {
                const dist = Math.abs(y - sp.y);
                if (dist < 0.05) {
                    const factor = (1 - dist / 0.05) * sp.intensity;
                    wrinkle += Math.sin(angle * 12 + sp.y * 50) * wrinkleAmount * factor * 2;
                }
            }

            wrinkle *= fitMultiplier;
            x += Math.cos(angle) * wrinkle;
            z += Math.sin(angle) * wrinkle;

            // 3. Gravity drape - fabric sags between support points
            if (gravityAmount > 0) {
                const sag = gravityAmount * Math.sin(angle * 2) * 0.5;
                y -= Math.abs(sag) * fitMultiplier;
                // Loose areas droop outward slightly
                const droop = gravityAmount * 0.3 * fitMultiplier;
                x += Math.cos(angle) * droop * Math.sin(y * 10);
                z += Math.sin(angle) * droop * Math.sin(y * 10);
            }

            pos.setX(i, x);
            pos.setY(i, y);
            pos.setZ(i, z);
        }

        geo.computeVertexNormals();
    }

    // Create garment torso with flat panel look (not a tube)
    // Heavily flattens the lathe and adds seam edges for a "sewn fabric" appearance
    createTorsoGarment(profile, mat, yOff, params) {
        const { frontScale, backScale, sideScale, isFem, chestBulge } = params;
        const pts = profile.map(p => new THREE.Vector2(p[0], p[1]));
        const segments = 64; // More segments for smoother flattening
        const geo = new THREE.LatheGeometry(pts, segments);
        const pos = geo.attributes.position;

        const totalH = profile[0][1] - profile[profile.length - 2][1];

        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const angle = Math.atan2(z, x);
            const r = Math.sqrt(x * x + z * z);
            if (r < 0.001) continue;

            const frontness = Math.max(0, z / r);   // how much this vertex faces front
            const backness = Math.max(0, -z / r);
            const sideness = Math.abs(x / r);

            // 1. AGGRESSIVE FLATTENING - makes it look like flat panels, not a tube
            // Front and back are flattened (like ironed fabric), sides are the seam edges
            const flattenFront = 0.7; // 1=round, 0=completely flat
            const flattenBack = 0.65;
            if (frontness > 0.3) {
                z *= this.lerp(1, flattenFront, (frontness - 0.3) / 0.7);
            }
            if (backness > 0.3) {
                z *= this.lerp(1, flattenBack, (backness - 0.3) / 0.7);
            }

            // 2. Side seam pinch - creates visible edge where front meets back
            if (sideness > 0.85) {
                const pinch = (sideness - 0.85) / 0.15;
                z *= (1 - pinch * 0.3); // pinch at sides
                // Slight outward push for seam allowance
                x *= (1 + pinch * 0.02);
            }

            // 3. Front/back scaling (front wider for bust)
            let scale = 1;
            scale += (frontScale - 1) * frontness;
            scale += (backScale - 1) * backness;

            // 4. Bust shaping for female
            if (isFem && chestBulge > 0) {
                const relY = (y - profile[profile.length - 2][1]) / totalH;
                if (relY > 0.58 && relY < 0.82 && frontness > 0.2) {
                    const bustT = this.smoothstep(0.58, 0.70, relY) * (1 - this.smoothstep(0.70, 0.82, relY));
                    // Two distinct bust points (not centered)
                    const bustAngle = Math.abs(angle - Math.PI / 2);
                    const bustSide = Math.exp(-bustAngle * bustAngle * 4) * 0.6 + frontness * 0.4;
                    const leftBust = Math.exp(-Math.pow(angle - 1.2, 2) * 5);
                    const rightBust = Math.exp(-Math.pow(angle - 1.9, 2) * 5);
                    const bustShape = (leftBust + rightBust) * 0.7 + frontness * 0.3;
                    z += chestBulge * bustT * bustShape * 0.8;
                    // Slight horizontal spread
                    x *= 1 + chestBulge * bustT * bustShape * 0.15;
                }
            }

            // 5. Subtle drape folds (vertical lines like hanging fabric)
            const relY = (y - profile[profile.length - 2][1]) / totalH;
            if (relY < 0.5) { // below waist area
                const foldIntensity = (0.5 - relY) * 0.015;
                const folds = Math.sin(angle * 6) * foldIntensity + Math.sin(angle * 10) * foldIntensity * 0.3;
                x += Math.cos(angle) * folds;
                z += Math.sin(angle) * folds;
            }

            pos.setX(i, x * scale);
            pos.setZ(i, z * scale);
        }

        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, mat);
        m.position.y = yOff; m.castShadow = true;

        // Add visible side seam lines
        const group = new THREE.Group();
        group.add(m);
        const seamLineMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.25 });
        [-1, 1].forEach(side => {
            const seamPts = [];
            for (let i = 0; i < profile.length - 1; i++) {
                seamPts.push(new THREE.Vector3(side * profile[i][0] * (sideScale || 1), profile[i][1] + yOff, 0));
            }
            const seamGeo = new THREE.BufferGeometry().setFromPoints(seamPts);
            group.add(new THREE.Line(seamGeo, seamLineMat));
        });

        return group;
    }

    // Create a seam line (visible stitch)
    createSeamRing(radius, y, scaleZ, color) {
        const geo = new THREE.TorusGeometry(radius, 0.003, 6, 48);
        const mat = new THREE.MeshBasicMaterial({ color: color || 0x555555, transparent: true, opacity: 0.4 });
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y; m.rotation.x = Math.PI / 2; m.scale.z = scaleZ || 1;
        return m;
    }

    // Create hem (folded edge at bottom of garment)
    createHem(radius, y, scaleZ, mat) {
        const geo = new THREE.TorusGeometry(radius, 0.006, 8, 48);
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y; m.rotation.x = Math.PI / 2; m.scale.z = scaleZ || 1;
        m.castShadow = true;
        return m;
    }

    // Pattern-based sleeve with shoulder cap and arm curve
    createSleeve(params) {
        const { length, topRadius, bottomRadius, side, shoulderY, shoulderX, fitAdj, mat, isBell } = params;
        const sleeveGroup = new THREE.Group();

        // Shoulder cap (set-in sleeve based on patronaje armscye)
        const capGeo = new THREE.SphereGeometry(topRadius * 1.15, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.4);
        const cap = new THREE.Mesh(capGeo, mat);
        cap.castShadow = true;
        sleeveGroup.add(cap);

        // Sleeve tube with slight curve (arms aren't straight)
        const steps = 18;
        const pts = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            let r;
            if (isBell && t > 0.6) {
                // Bell sleeve flares out
                r = this.lerp(topRadius, bottomRadius, 0.6);
                const flare = this.lerp(1, 1.8, (t - 0.6) / 0.4);
                r *= flare;
            } else {
                r = this.lerp(topRadius, bottomRadius, t);
            }
            // Slight organic variation
            r += Math.sin(t * Math.PI) * 0.004;
            pts.push(new THREE.Vector2(r, length * (1 - t)));
        }
        pts.push(new THREE.Vector2(0.001, 0));

        const sleeveGeo = new THREE.LatheGeometry(pts, 24);

        // Deform sleeve to be slightly oval (not perfectly round)
        const pos = sleeveGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            pos.setZ(i, z * 0.85); // Flatten front-to-back
        }
        sleeveGeo.computeVertexNormals();

        const sleeve = new THREE.Mesh(sleeveGeo, mat);
        sleeve.position.y = -length;
        sleeve.castShadow = true;
        sleeveGroup.add(sleeve);

        // Hem at sleeve end
        const hemR = isBell ? bottomRadius * 1.4 : bottomRadius;
        const hemGeo = new THREE.TorusGeometry(hemR, 0.004, 6, 24);
        const hem = new THREE.Mesh(hemGeo, mat);
        hem.position.y = -length;
        hem.rotation.x = Math.PI / 2;
        hem.scale.z = 0.85;
        sleeveGroup.add(hem);

        // Position the whole sleeve
        sleeveGroup.position.set(side * shoulderX, shoulderY, 0);
        sleeveGroup.rotation.z = side * 0.1;

        return sleeveGroup;
    }

    // Create proper V-neckline using a triangular cut shape
    createVNeckline(params) {
        const { width, depth, y, frontZ, mat } = params;
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, 0);
        shape.lineTo(0, -depth);
        shape.lineTo(width / 2, 0);

        const extGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.002 });
        const m = new THREE.Mesh(extGeo, mat);
        m.position.set(0, y, frontZ);
        m.castShadow = true;
        return m;
    }

    // ===== BUILD BODY (same as before with minor improvements) =====
    buildBody() {
        this.clearGroup(this.bodyGroup);
        const p = this.params, S = p.height / 170, isFem = p.gender === 'female';
        const chF = p.chest / 90, waF = p.waist / (isFem ? 70 : 80), hiF = p.hips / (isFem ? 95 : 90), shF = p.shoulders / (isFem ? 42 : 46);
        const skin = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.skinTone), roughness: 0.55, metalness: 0.02 });

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.105 * S, 32, 32), skin);
        head.scale.set(1, 1.12, 0.95); head.position.y = 1.68 * S; head.castShadow = true; this.bodyGroup.add(head);
        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.075 * S, 24, 16, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.5), skin);
        jaw.position.y = 1.63 * S; jaw.scale.set(1, 0.8, 0.9); this.bodyGroup.add(jaw);
        [-1, 1].forEach(s => {
            const e = new THREE.Mesh(new THREE.SphereGeometry(0.025 * S, 12, 8), skin);
            e.position.set(s * 0.105 * S, 1.69 * S, 0); e.scale.set(0.5, 1, 0.7);
            this.bodyGroup.add(e);
        });

        // Neck
        this.bodyGroup.add(this.lathe([[0.055 * S, 0], [0.052 * S, 0.02 * S], [0.05 * S, 0.05 * S], [0.048 * S, 0.07 * S], [0.045 * S, 0.09 * S], [0.001, 0.09 * S]], skin, 1.48 * S));

        // Torso with front/back shaping
        const nB = 0.065 * S * shF, shW = 0.2 * S * shF, chW = 0.18 * S * chF;
        const waW = isFem ? 0.13 * S * waF : 0.15 * S * waF;
        const hiW = isFem ? 0.185 * S * hiF : 0.16 * S * hiF;
        const lhW = isFem ? 0.17 * S * hiF : 0.14 * S * hiF;
        const tH = 0.58 * S, tZ = isFem ? 0.72 : 0.8;

        const tp = [];
        const tSteps = 24;
        for (let i = 0; i <= tSteps; i++) {
            const t = i / tSteps;
            let w;
            if (t < 0.05) w = nB;
            else if (t < 0.15) w = this.lerp(nB, shW, (t - 0.05) / 0.1);
            else if (t < 0.3) w = this.lerp(shW, chW, (t - 0.15) / 0.15);
            else if (t < 0.5) w = this.lerp(chW, waW, this.smoothstep(0, 1, (t - 0.3) / 0.2));
            else if (t < 0.7) w = this.lerp(waW, hiW, this.smoothstep(0, 1, (t - 0.5) / 0.2));
            else w = this.lerp(hiW, lhW, (t - 0.7) / 0.3);
            tp.push([w, tH * (1 - t)]);
        }
        tp.push([0.001, 0]);
        this.bodyGroup.add(this.lathe(tp, skin, 0.9 * S, 1, tZ));

        if (isFem) {
            [-1, 1].forEach(s => {
                const b = new THREE.Mesh(new THREE.SphereGeometry(0.058 * S * chF, 24, 18), skin);
                b.position.set(s * 0.065 * S, 1.35 * S, 0.085 * S * chF);
                b.scale.set(0.95, 0.88, 0.82);
                b.castShadow = true;
                this.bodyGroup.add(b);
            });
        }

        // Arms with better proportions
        [-1, 1].forEach(side => {
            const ag = new THREE.Group();
            // Shoulder ball
            const shBall = new THREE.Mesh(new THREE.SphereGeometry(0.052 * S, 24, 18), skin);
            shBall.scale.set(1.1, 0.9, 0.85); shBall.castShadow = true; ag.add(shBall);
            // Upper arm
            ag.add(this.lathe([
                [0.044 * S, 0], [0.046 * S, 0.04 * S], [0.044 * S, 0.1 * S],
                [0.04 * S, 0.18 * S], [0.036 * S, 0.25 * S], [0.034 * S, 0.27 * S], [0.001, 0.27 * S]
            ], skin, -0.27 * S));
            // Elbow
            const elb = new THREE.Mesh(new THREE.SphereGeometry(0.035 * S, 18, 14), skin);
            elb.position.y = -0.27 * S; elb.scale.set(1, 0.9, 0.85); ag.add(elb);
            // Forearm
            ag.add(this.lathe([
                [0.036 * S, 0], [0.037 * S, 0.03 * S], [0.035 * S, 0.1 * S],
                [0.03 * S, 0.18 * S], [0.026 * S, 0.24 * S], [0.024 * S, 0.26 * S], [0.001, 0.26 * S]
            ], skin, -0.53 * S));
            // Hand
            const hand = new THREE.Mesh(new THREE.BoxGeometry(0.042 * S, 0.065 * S, 0.022 * S), skin);
            hand.position.y = -0.595 * S; hand.castShadow = true; ag.add(hand);
            // Fingers hint
            const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.038 * S, 0.03 * S, 0.018 * S), skin);
            fingers.position.y = -0.63 * S; ag.add(fingers);

            ag.position.set(side * (shW + 0.03 * S), 1.43 * S, 0);
            ag.rotation.z = side * 0.08;
            this.bodyGroup.add(ag);
        });

        // Legs with better shaping
        [-1, 1].forEach(side => {
            const lg = new THREE.Group();
            // Upper leg (thigh)
            const thighPts = [];
            for (let i = 0; i <= 14; i++) {
                const t = i / 14;
                let r = this.lerp(0.078 * S * hiF, 0.05 * S * hiF, t);
                // Quad muscle bulge
                r += Math.sin(t * Math.PI * 0.7) * 0.006 * S;
                thighPts.push([r, 0.38 * S * (1 - t)]);
            }
            thighPts.push([0.001, 0]);
            lg.add(this.lathe(thighPts, skin, 0));

            // Knee
            const kn = new THREE.Mesh(new THREE.SphereGeometry(0.05 * S, 22, 16), skin);
            kn.scale.set(1, 0.82, 0.88); kn.castShadow = true; lg.add(kn);

            // Lower leg (calf)
            const calfPts = [];
            for (let i = 0; i <= 14; i++) {
                const t = i / 14;
                let r = this.lerp(0.052 * S, 0.036 * S, t);
                // Calf muscle
                r += Math.exp(-Math.pow((t - 0.25) * 4, 2)) * 0.012 * S;
                calfPts.push([r, 0.35 * S * (1 - t)]);
            }
            calfPts.push([0.001, 0]);
            lg.add(this.lathe(calfPts, skin, -0.35 * S));

            // Ankle
            const an = new THREE.Mesh(new THREE.SphereGeometry(0.028 * S, 14, 12), skin);
            an.position.y = -0.35 * S; an.scale.set(0.9, 0.7, 0.85); lg.add(an);

            // Foot
            const ft = new THREE.Mesh(new THREE.BoxGeometry(0.055 * S, 0.025 * S, 0.12 * S), skin);
            ft.position.set(0, -0.37 * S, 0.025 * S); ft.castShadow = true; lg.add(ft);
            const to = new THREE.Mesh(new THREE.SphereGeometry(0.028 * S, 10, 8), skin);
            to.position.set(0, -0.37 * S, 0.08 * S); to.scale.set(1, 0.5, 1.2); lg.add(to);

            lg.position.set(side * 0.085 * S, 0.52 * S, 0);
            this.bodyGroup.add(lg);
        });

        this.bodyGroup.position.y = 0.05;
    }

    // ===== PANEL-BASED GARMENT CONSTRUCTION =====
    // Creates a flat fabric panel from a 2D silhouette path
    createFabricPanel(points, mat, thickness) {
        const th = thickness || 0.006;
        const shape = new THREE.Shape();
        shape.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i][0], points[i][1]);
        }
        shape.lineTo(points[0][0], points[0][1]);

        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: th, bevelEnabled: true, bevelThickness: th * 0.3,
            bevelSize: th * 0.2, bevelSegments: 2, curveSegments: 12
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        return mesh;
    }

    // Build a garment body from front + back panels connected at sides
    buildPanelGarment(params) {
        const { widths, heights, depth, mat, seamMat, yBase, isFem, chF, fit, isDress } = params;
        // widths = [{y, w}] array of width at each height
        // depth = front-to-back half-depth
        const group = new THREE.Group();

        const segs = widths.length - 1;
        const frontVerts = [], backVerts = [], leftVerts = [], rightVerts = [];

        // Build vertex arrays for front and back panels
        for (let i = 0; i < widths.length; i++) {
            const { y, w } = widths[i];
            const d = depth * (1 + (isFem && y > heights.chest && y < heights.waist ? 0.1 * chF : 0));
            frontVerts.push([-w, y]); // left edge of front
            frontVerts.unshift([w, y]); // right edge of front (reversed for correct winding)
            backVerts.push([-w, y]);
            backVerts.unshift([w, y]);
        }

        // Front panel
        const frontShape = new THREE.Shape();
        frontShape.moveTo(frontVerts[0][0], frontVerts[0][1]);
        for (let i = 1; i < frontVerts.length; i++) {
            frontShape.lineTo(frontVerts[i][0], frontVerts[i][1]);
        }
        const frontGeo = new THREE.ExtrudeGeometry(frontShape, {
            depth: 0.005, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.001, bevelSegments: 1
        });
        const front = new THREE.Mesh(frontGeo, mat);
        front.position.set(0, yBase, depth);
        front.castShadow = true;
        group.add(front);

        // Back panel
        const backShape = new THREE.Shape();
        backShape.moveTo(backVerts[0][0], backVerts[0][1]);
        for (let i = 1; i < backVerts.length; i++) {
            backShape.lineTo(backVerts[i][0], backVerts[i][1]);
        }
        const backGeo = new THREE.ExtrudeGeometry(backShape, {
            depth: 0.005, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.001, bevelSegments: 1
        });
        const back = new THREE.Mesh(backGeo, mat);
        back.position.set(0, yBase, -depth - 0.005);
        back.castShadow = true;
        group.add(back);

        // Side connecting strips (creates the 3D volume between front and back)
        [-1, 1].forEach(side => {
            for (let i = 0; i < widths.length - 1; i++) {
                const w0 = widths[i], w1 = widths[i + 1];
                const x0 = side * w0.w, x1 = side * w1.w;
                const y0 = w0.y + yBase, y1 = w1.y + yBase;
                const d0 = depth, d1 = depth;

                const sideGeo = new THREE.BufferGeometry();
                const verts = new Float32Array([
                    x0, y0, d0,  x0, y0, -d0,  x1, y1, -d1,
                    x0, y0, d0,  x1, y1, -d1,  x1, y1, d1
                ]);
                sideGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
                sideGeo.computeVertexNormals();
                const sideMesh = new THREE.Mesh(sideGeo, mat);
                sideMesh.castShadow = true;
                group.add(sideMesh);
            }

            // Visible side seam line
            const seamPts = widths.map(w => new THREE.Vector3(side * w.w, w.y + yBase, depth));
            const seamGeo = new THREE.BufferGeometry().setFromPoints(seamPts);
            const seamLine = new THREE.Line(seamGeo, new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.4 }));
            group.add(seamLine);
        });

        // Hem (bottom edge) - visible fold
        const hemW = widths[widths.length - 1].w;
        const hemY = widths[widths.length - 1].y + yBase;
        const hemGeo = new THREE.TorusGeometry(hemW, 0.004, 6, 32);
        const hem = new THREE.Mesh(hemGeo, mat);
        hem.position.set(0, hemY, 0);
        hem.rotation.x = Math.PI / 2;
        hem.scale.y = depth / hemW;
        hem.castShadow = true;
        group.add(hem);

        // Apply wrinkle deformation to panels
        [front, back].forEach(panel => {
            this.applyFabricDeformation(panel.geometry, {
                wrinkleAmount: fit === 'tight' ? 0.001 : 0.002,
                noiseAmount: 0.0006,
                fitType: fit,
                stressPoints: [
                    { y: (heights.waist || 0.3) * 0.5, intensity: 0.7 },
                    { y: 0.05, intensity: 0.3 }
                ]
            });
        });

        return group;
    }

    // ===== BUILD ALL GARMENTS =====
    buildAllGarments() {
        this.clearGroup(this.garmentGroup);
        this.garments.forEach(g => this.buildOneGarment(g));
        this.garmentGroup.position.y = 0.05;
        // Trigger gentle auto-rotation on rebuild
        this._autoRotateTime = 0;
        this._autoRotateActive = true;
        setTimeout(() => { this._autoRotateActive = false; }, 2000);
    }

    // ===== PANEL-BASED GARMENT BUILDER =====
    buildOneGarment(g) {
        const p = this.params, S = p.height / 170, isFem = p.gender === 'female';
        const chF = p.chest / 90, waF = p.waist / (isFem ? 70 : 80);
        const hiF = p.hips / (isFem ? 95 : 90), shF = p.shoulders / (isFem ? 42 : 46);

        // Patronaje ease values (holgura) based on fit
        const ease = {
            tight: 0.004 * S,
            regular: 0.016 * S,
            loose: 0.032 * S,
            flared: 0.024 * S
        }[g.fit] || 0.016 * S;

        // Body reference measurements in 3D units
        const shW = 0.2 * S * shF + ease;          // shoulder width (half)
        const chW = 0.18 * S * chF + ease;          // chest width
        const waW = (isFem ? 0.13 : 0.15) * S * waF + ease;  // waist width
        const hiW = (isFem ? 0.185 : 0.16) * S * hiF + ease;  // hip width
        const neckR = 0.065 * S * shF + ease * 0.5; // neck base radius
        const tZ = isFem ? 0.72 : 0.8;              // front-back compression

        const mat = makeTextureMaterial(g.texture, g.color);
        const seamMat = new THREE.MeshStandardMaterial({
            color: 0x444444, roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide, transparent: true, opacity: 0.3
        });
        const accMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });

        const cat = GARMENTS[g.type]?.cat;
        const isTop = cat === 'top' || cat === 'dress';
        const isBot = cat === 'bottom';
        const isDress = cat === 'dress';

        // ========================================
        // TOPS & DRESSES - Based on bodice pattern
        // ========================================
        if (isTop) {
            // Calculate garment length from pattern standard
            let hemY; // Y position of hem
            if (isDress) {
                hemY = g.length === 'crop' ? 0.7 : g.length === 'long' ? 0.15 : g.length === 'oversize' ? 0.1 : 0.45;
            } else {
                hemY = g.length === 'crop' ? 0.5 : g.length === 'long' ? 0.32 : g.length === 'oversize' ? 0.25 : 0.4;
            }
            hemY *= S;
            const topY = 0.58 * S; // shoulder height relative to torso base

            // Build bodice profile with patronaje curves
            const prof = [];
            const steps = 28;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                let w;
                // Patronaje zones: neck -> shoulder -> chest -> waist -> hip -> hem
                if (t < 0.06) {
                    w = neckR;
                } else if (t < 0.16) {
                    // Shoulder slope (caida de hombro ~3cm)
                    w = this.lerp(neckR, shW, this.smoothstep(0, 1, (t - 0.06) / 0.1));
                } else if (t < 0.22) {
                    // Armscye/sisa zone - slight indent
                    w = this.lerp(shW, shW * 0.95, this.smoothstep(0, 1, (t - 0.16) / 0.06));
                } else if (t < 0.38) {
                    // Chest (pecho) with fullness
                    const chestW = chW + (isFem ? 0.01 * S * chF : 0);
                    w = this.lerp(shW * 0.95, chestW, this.smoothstep(0, 1, (t - 0.22) / 0.16));
                } else if (t < 0.55) {
                    // Waist suppression (pinza de cintura)
                    const chestW = chW + (isFem ? 0.01 * S * chF : 0);
                    const suppression = g.fit === 'tight' ? 0.92 : g.fit === 'loose' ? 1.05 : 1.0;
                    w = this.lerp(chestW, waW * suppression, this.smoothstep(0, 1, (t - 0.38) / 0.17));
                } else if (t < 0.72) {
                    // Hip curve (cadera)
                    w = this.lerp(waW, hiW, this.smoothstep(0, 1, (t - 0.55) / 0.17));
                } else {
                    // Below hip to hem
                    let hemW = hiW * 0.95;
                    if (isDress) {
                        // Dress silhouettes based on patronaje
                        if (g.fit === 'flared') {
                            hemW = hiW * this.lerp(1.0, 1.7, (t - 0.72) / 0.28);
                        } else if (g.fit === 'loose') {
                            hemW = hiW * this.lerp(1.0, 1.4, (t - 0.72) / 0.28);
                        } else if (g.fit === 'tight') {
                            hemW = hiW * this.lerp(1.0, 0.85, (t - 0.72) / 0.28);
                        } else {
                            hemW = hiW * this.lerp(1.0, 1.15, (t - 0.72) / 0.28);
                        }
                    }
                    w = this.lerp(hiW, hemW, (t - 0.72) / 0.28);
                }

                // Add subtle organic variation
                w += Math.sin(t * Math.PI * 3) * 0.001 * S;

                prof.push([Math.max(w, 0.01), topY * (1 - t)]);
            }
            prof.push([0.001, 0]);

            // Create torso garment with front/back asymmetry
            const torso = this.createTorsoGarment(prof, mat, 0.9 * S, {
                frontScale: isFem ? 1.06 : 1.02,
                backScale: 0.97,
                sideScale: 0.98,
                isFem,
                chestBulge: isFem ? 0.12 * chF : 0
            });
            torso.scale.z = tZ;

            // Apply fabric deformation to the mesh inside the group
            const torsoMesh = torso.children.find(c => c.isMesh);
            if (torsoMesh) {
                this.applyFabricDeformation(torsoMesh.geometry, {
                    wrinkleAmount: 0.002 * S,
                    gravityAmount: isDress ? 0.003 * S : 0.001 * S,
                    noiseAmount: 0.0008 * S,
                    fitType: g.fit,
                    stressPoints: [
                        { y: 0.5 * S, intensity: 0.8 },
                        { y: 0.35 * S, intensity: 0.5 },
                        { y: 0.15 * S, intensity: 0.4 },
                    ]
                });
            }

            this.garmentGroup.add(torso);

            // Hem line (dobladillo)
            const hemRadius = prof[prof.length - 2][0];
            this.garmentGroup.add(this.createHem(hemRadius, hemY + 0.9 * S, tZ, mat));
            this.garmentGroup.add(this.createSeamRing(hemRadius, hemY + 0.9 * S, tZ));

            // Waist seam for dresses
            if (isDress) {
                const waistSeamY = 0.9 * S + topY * 0.5;
                this.garmentGroup.add(this.createSeamRing(waW * 1.02, waistSeamY, tZ, 0x666666));
            }

            // ====== SLEEVES (based on patronaje manga) ======
            const sl = g.sleeve;
            if (sl && sl !== 'none') {
                let sLen;
                if (sl === 'cap') sLen = 0.07 * S;
                else if (sl === 'short') sLen = 0.14 * S;
                else if (sl === '3quarter') sLen = 0.35 * S;
                else if (sl === 'bell') sLen = 0.48 * S;
                else sLen = 0.52 * S; // long

                const sTopR = 0.054 * S + ease;
                const sBotR = sl === 'bell' ? sTopR * 0.9 : (sl === 'long' ? 0.03 * S + ease : 0.038 * S + ease);

                [-1, 1].forEach(side => {
                    const sleeve = this.createSleeve({
                        length: sLen,
                        topRadius: sTopR,
                        bottomRadius: sBotR,
                        side,
                        shoulderY: 1.44 * S,
                        shoulderX: shW + 0.025 * S,
                        fitAdj: ease,
                        mat,
                        isBell: sl === 'bell'
                    });
                    this.garmentGroup.add(sleeve);
                });
            }

            // ====== NECKLINES (escotes) based on patronaje ======
            const colY = 1.485 * S + 0.05;
            const nk = g.neckline || 'round';

            if (nk === 'round') {
                // Round neckline (escote redondo) - classic binding
                const geo = new THREE.TorusGeometry(0.072 * S, 0.008 * S, 10, 36);
                const m = new THREE.Mesh(geo, mat);
                m.position.y = colY; m.rotation.x = Math.PI / 2; m.scale.z = tZ;
                this.garmentGroup.add(m);
            } else if (nk === 'v') {
                // V-neckline - front V with binding
                const vWidth = 0.1 * S;
                const vDepth = 0.1 * S;
                // Back part (half circle)
                const backGeo = new THREE.TorusGeometry(0.072 * S, 0.007 * S, 8, 18, Math.PI);
                const backM = new THREE.Mesh(backGeo, mat);
                backM.position.y = colY; backM.rotation.x = Math.PI / 2;
                backM.rotation.y = Math.PI; backM.scale.z = tZ;
                this.garmentGroup.add(backM);

                // V shape front
                const vShape = new THREE.BufferGeometry();
                const vPts = [];
                const vSteps = 12;
                for (let i = 0; i <= vSteps; i++) {
                    const t = i / vSteps;
                    const x = this.lerp(-vWidth, 0, t);
                    const z = this.lerp(0, vDepth * tZ, t < 0.5 ? t * 2 : 2 - t * 2);
                    const y2 = this.lerp(0, -vDepth, t < 0.5 ? t * 2 : 2 - t * 2);
                    vPts.push(x, colY + y2, z);
                }
                // Create line for V
                const vLineGeo = new THREE.BufferGeometry();
                vLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(vPts, 3));
                const vLine = new THREE.Line(vLineGeo, new THREE.LineBasicMaterial({ color: mat.map ? 0xcccccc : new THREE.Color(g.color).offsetHSL(0, 0, -0.1), linewidth: 2 }));
                this.garmentGroup.add(vLine);
            } else if (nk === 'square') {
                // Square neckline
                const sqW = 0.09 * S, sqD = 0.06 * S;
                const sqGeo = new THREE.BoxGeometry(sqW * 2, sqD, 0.005 * S);
                const sqM = new THREE.Mesh(sqGeo, mat);
                sqM.position.set(0, colY - sqD / 2, neckR * tZ);
                this.garmentGroup.add(sqM);
                // Back neckline
                const bGeo = new THREE.TorusGeometry(0.072 * S, 0.007 * S, 8, 18, Math.PI);
                const bM = new THREE.Mesh(bGeo, mat);
                bM.position.y = colY; bM.rotation.x = Math.PI / 2; bM.rotation.y = Math.PI;
                bM.scale.z = tZ; this.garmentGroup.add(bM);
            } else if (nk === 'boat') {
                // Boat neck (escote barco) - wide shallow curve
                const geo = new THREE.TorusGeometry(0.11 * S, 0.007 * S, 8, 36);
                const m = new THREE.Mesh(geo, mat);
                m.position.y = colY; m.rotation.x = Math.PI / 2; m.scale.z = tZ * 0.5;
                this.garmentGroup.add(m);
            } else if (nk === 'polo' || nk === 'turtle') {
                // Collar based on patronaje cuello
                const colH = nk === 'turtle' ? 0.07 * S : 0.04 * S;
                const colR = neckR * 1.05;
                const colPts = [];
                const colSteps = 10;
                for (let i = 0; i <= colSteps; i++) {
                    const t = i / colSteps;
                    let r;
                    if (nk === 'turtle') {
                        // Turtleneck follows neck closely then flares slightly at top
                        r = this.lerp(colR * 0.9, colR * 1.02, t);
                        if (t > 0.7) r = this.lerp(colR * 1.02, colR * 1.08, (t - 0.7) / 0.3);
                    } else {
                        // Polo collar - structured with slight spread
                        r = this.lerp(colR * 0.95, colR * 1.15, t);
                        if (t > 0.6) r = this.lerp(colR * 1.15, colR * 1.05, (t - 0.6) / 0.4);
                    }
                    colPts.push([r, colH * (1 - t)]);
                }
                colPts.push([0.001, 0]);
                const colMesh = this.lathe(colPts, mat, colY);
                colMesh.scale.z = tZ;
                this.garmentGroup.add(colMesh);

                // Collar band seam
                this.garmentGroup.add(this.createSeamRing(colR, colY, tZ));

                // Polo button placket
                if (nk === 'polo') {
                    const placketGeo = new THREE.BoxGeometry(0.012 * S, 0.06 * S, 0.004 * S);
                    const placket = new THREE.Mesh(placketGeo, mat);
                    placket.position.set(0, colY - 0.03 * S, colR * tZ + 0.005);
                    this.garmentGroup.add(placket);
                    // Buttons
                    for (let i = 0; i < 2; i++) {
                        const btnGeo = new THREE.CylinderGeometry(0.004 * S, 0.004 * S, 0.003 * S, 10);
                        const btn = new THREE.Mesh(btnGeo, accMat);
                        btn.rotation.x = Math.PI / 2;
                        btn.position.set(0, colY - 0.015 * S - i * 0.025 * S, colR * tZ + 0.008);
                        this.garmentGroup.add(btn);
                    }
                }
            }

            // ====== HOOD (capucha) for hoodie ======
            if (g.type === 'hoodie') {
                // Hood based on patronaje capucha: two panels + gusset
                const hoodPts = [
                    [0.001, 0.18 * S], [0.03 * S, 0.175 * S], [0.06 * S, 0.16 * S],
                    [0.09 * S, 0.14 * S], [0.115 * S, 0.11 * S], [0.13 * S, 0.07 * S],
                    [0.125 * S, 0.035 * S], [0.1 * S, 0.01 * S], [0.08 * S, 0], [0.001, 0]
                ];
                const hood = this.lathe(hoodPts, mat, colY + 0.01);
                hood.scale.z = 0.65;
                hood.position.z = -0.035 * S;
                this.garmentGroup.add(hood);

                // Hood seam line
                this.garmentGroup.add(this.createSeamRing(0.085 * S, colY + 0.01, 0.65));

                // Drawstring holes
                [-1, 1].forEach(side => {
                    const holeGeo = new THREE.TorusGeometry(0.005 * S, 0.002 * S, 6, 12);
                    const hole = new THREE.Mesh(holeGeo, accMat);
                    hole.position.set(side * 0.04 * S, colY + 0.01, neckR * tZ);
                    this.garmentGroup.add(hole);
                });

                // Kangaroo pocket is typical for hoodie
                if (g.pocket === 'none' || g.pocket === 'kangaroo') {
                    const pocketW = 0.15 * S;
                    const pocketH = 0.065 * S;
                    const pocketShape = new THREE.Shape();
                    pocketShape.moveTo(-pocketW / 2, 0);
                    pocketShape.quadraticCurveTo(-pocketW / 2, pocketH, -pocketW / 4, pocketH);
                    pocketShape.lineTo(pocketW / 4, pocketH);
                    pocketShape.quadraticCurveTo(pocketW / 2, pocketH, pocketW / 2, 0);
                    pocketShape.lineTo(-pocketW / 2, 0);

                    const pocketGeo = new THREE.ShapeGeometry(pocketShape);
                    const pocket = new THREE.Mesh(pocketGeo, seamMat);
                    pocket.position.set(0, 1.15 * S + 0.05, chW * tZ + 0.01);
                    this.garmentGroup.add(pocket);
                }
            }

            // ====== POCKETS ======
            if (g.type !== 'hoodie') {
                if (g.pocket === 'front') {
                    // Patch pocket (bolsillo de parche)
                    const pw = 0.06 * S, ph = 0.055 * S;
                    const pocketShape = new THREE.Shape();
                    pocketShape.moveTo(0, 0);
                    pocketShape.lineTo(pw, 0);
                    pocketShape.lineTo(pw, ph * 0.8);
                    pocketShape.quadraticCurveTo(pw, ph, pw * 0.8, ph);
                    pocketShape.lineTo(pw * 0.2, ph);
                    pocketShape.quadraticCurveTo(0, ph, 0, ph * 0.8);
                    pocketShape.lineTo(0, 0);
                    const geo = new THREE.ShapeGeometry(pocketShape);
                    const pocket = new THREE.Mesh(geo, seamMat);
                    pocket.position.set(-0.08 * S, 1.15 * S + 0.05, chW * tZ + 0.008);
                    this.garmentGroup.add(pocket);
                } else if (g.pocket === 'kangaroo') {
                    const pocketW = 0.14 * S, pocketH = 0.06 * S;
                    const geo = new THREE.PlaneGeometry(pocketW, pocketH);
                    const pocket = new THREE.Mesh(geo, seamMat);
                    pocket.position.set(0, 1.17 * S + 0.05, chW * tZ + 0.008);
                    this.garmentGroup.add(pocket);
                    // Opening line
                    this.garmentGroup.add(this.createSeamRing(pocketW / 2, 1.17 * S + 0.05 + pocketH / 2, 0.1));
                }
            }

            // ====== SHIRT DETAILS ======
            if (g.type === 'shirt') {
                // Button placket
                const placketGeo = new THREE.BoxGeometry(0.016 * S, 0.38 * S, 0.005 * S);
                const placket = new THREE.Mesh(placketGeo, mat);
                placket.position.set(0, 1.27 * S + 0.05, chW * tZ + 0.008);
                this.garmentGroup.add(placket);

                // Buttons
                for (let i = 0; i < 7; i++) {
                    const btnGeo = new THREE.CylinderGeometry(0.005 * S, 0.005 * S, 0.003 * S, 12);
                    const btn = new THREE.Mesh(btnGeo, accMat);
                    btn.rotation.x = Math.PI / 2;
                    btn.position.set(0, (1.42 - i * 0.055) * S + 0.05, chW * tZ + 0.012);
                    this.garmentGroup.add(btn);
                }

                // Cuffs if long sleeve
                if (g.sleeve === 'long' || g.sleeve === '3quarter') {
                    [-1, 1].forEach(side => {
                        const sLen = g.sleeve === 'long' ? 0.52 * S : 0.35 * S;
                        const cuffGeo = new THREE.TorusGeometry(0.032 * S + ease, 0.006 * S, 8, 18);
                        const cuff = new THREE.Mesh(cuffGeo, mat);
                        cuff.position.set(side * (shW + 0.025 * S), 1.44 * S - sLen, 0);
                        cuff.rotation.x = Math.PI / 2;
                        cuff.scale.z = 0.85;
                        this.garmentGroup.add(cuff);
                    });
                }
            }

            // ====== JACKET DETAILS ======
            if (g.type === 'jacket') {
                // Zipper
                const zMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA, metalness: 0.8, roughness: 0.2 });
                const zH = (isDress ? 0.35 : 0.3) * S;
                // Zipper track
                const zGeo = new THREE.BoxGeometry(0.006 * S, zH, 0.004 * S);
                const zip = new THREE.Mesh(zGeo, zMat);
                zip.position.set(0, 1.28 * S + 0.05, chW * tZ + 0.012);
                this.garmentGroup.add(zip);
                // Zipper pull
                const pullGeo = new THREE.BoxGeometry(0.008 * S, 0.012 * S, 0.006 * S);
                const pull = new THREE.Mesh(pullGeo, zMat);
                pull.position.set(0, 1.42 * S + 0.05, chW * tZ + 0.015);
                this.garmentGroup.add(pull);

                // Collar stand for jacket
                const jColH = 0.035 * S;
                const jColPts = [
                    [neckR * 1.1, jColH], [neckR * 1.2, jColH * 0.7],
                    [neckR * 1.15, jColH * 0.3], [neckR * 1.0, 0], [0.001, 0]
                ];
                const jCol = this.lathe(jColPts, mat, colY);
                jCol.scale.z = tZ;
                this.garmentGroup.add(jCol);
            }

            // Shoulder seam lines
            [-1, 1].forEach(side => {
                const seamGeo = new THREE.BoxGeometry(shW * 0.6, 0.002, 0.002);
                const seam = new THREE.Mesh(seamGeo, seamMat);
                seam.position.set(side * shW * 0.5, 1.47 * S + 0.05, 0);
                seam.rotation.z = side * 0.1;
                this.garmentGroup.add(seam);
            });
        }

        // ========================================
        // BOTTOMS - Based on trouser/skirt pattern
        // ========================================
        if (isBot) {
            const isSkirt = g.type === 'skirt';
            const isShorts = g.type === 'shorts';
            const isLeggings = g.type === 'leggings';
            const isJeans = g.type === 'jeans';
            const isJogger = g.type === 'jogger';

            // Waist position based on rise (tiro)
            const baseWaistY = 0.95 * S;
            const waistAdj = g.waist === 'high' ? 0.06 * S : g.waist === 'low' ? -0.05 * S : 0;
            const waistY = baseWaistY + waistAdj;

            // Hem position based on length
            let hemY;
            if (isSkirt) hemY = g.length === 'crop' ? 0.65 * S : g.length === 'long' ? 0.18 * S : g.length === 'oversize' ? 0.12 * S : 0.45 * S;
            else if (isShorts) hemY = g.length === 'crop' ? 0.6 * S : g.length === 'long' ? 0.42 * S : g.length === 'oversize' ? 0.38 * S : 0.5 * S;
            else if (isLeggings) hemY = g.length === 'crop' ? 0.42 * S : 0.15 * S;
            else hemY = g.length === 'crop' ? 0.42 * S : g.length === 'long' ? 0.15 * S : g.length === 'oversize' ? 0.1 * S : 0.28 * S;

            // ====== WAISTBAND (pretina) ======
            const waistbandH = g.waist === 'elastic' ? 0.035 * S : 0.025 * S;
            const wbPts = [];
            const wbSteps = 8;
            for (let i = 0; i <= wbSteps; i++) {
                const t = i / wbSteps;
                let r;
                if (g.waist === 'elastic') {
                    // Elastic waistband with gathering
                    r = this.lerp(waW + ease * 0.5, waW + ease, t);
                    r += Math.sin(t * Math.PI) * 0.003 * S;
                } else {
                    r = this.lerp(waW + ease * 0.5, waW + ease * 1.2, t);
                }
                wbPts.push([r, waistbandH * (1 - t)]);
            }
            wbPts.push([0.001, 0]);
            const wb = this.lathe(wbPts, mat, waistY - waistbandH + 0.05);
            wb.scale.z = tZ;
            this.garmentGroup.add(wb);

            // Waistband top seam
            this.garmentGroup.add(this.createSeamRing(waW + ease * 0.5, waistY + 0.05, tZ));

            // Belt loops for jeans/pants
            if (isJeans || g.type === 'pants') {
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    const loopGeo = new THREE.BoxGeometry(0.006 * S, waistbandH * 1.3, 0.004 * S);
                    const loop = new THREE.Mesh(loopGeo, seamMat);
                    const lr = waW + ease * 0.7;
                    loop.position.set(Math.cos(angle) * lr, waistY - waistbandH / 2 + 0.05, Math.sin(angle) * lr * tZ);
                    loop.lookAt(0, loop.position.y, 0);
                    this.garmentGroup.add(loop);
                }
            }

            if (isSkirt) {
                // ====== SKIRT (falda) based on patronaje ======
                const skirtH = waistY - waistbandH - hemY;
                const sp = [];
                const skSteps = 24;
                for (let i = 0; i <= skSteps; i++) {
                    const t = i / skSteps;
                    let r;
                    // Hip curve then flare
                    if (t < 0.2) {
                        r = this.lerp(waW + ease, hiW + ease, this.smoothstep(0, 1, t / 0.2));
                    } else {
                        const flare = g.fit === 'flared' ? 1.65 : g.fit === 'loose' ? 1.4 : g.fit === 'tight' ? 1.0 : 1.2;
                        r = this.lerp(hiW + ease, hiW * flare + ease, this.smoothstep(0, 1, (t - 0.2) / 0.8));
                    }
                    // Add subtle drape wave (caida de tela)
                    if (g.fit !== 'tight') {
                        r += Math.sin(t * Math.PI * 2.5) * 0.003 * S;
                    }
                    sp.push([r, skirtH * (1 - t)]);
                }
                sp.push([0.001, 0]);

                const skirt = this.lathe(sp, mat, hemY + 0.05);
                skirt.scale.z = tZ;

                // Fabric deformation for skirt - gravity drape and flow
                this.applyFabricDeformation(skirt.geometry, {
                    wrinkleAmount: 0.003 * S,
                    gravityAmount: g.fit === 'tight' ? 0.001 * S : 0.005 * S,
                    noiseAmount: 0.001 * S,
                    fitType: g.fit,
                    stressPoints: [
                        { y: skirtH * 0.9, intensity: 0.6 },  // near waist
                        { y: skirtH * 0.1, intensity: 0.3 },  // near hem
                    ]
                });

                this.garmentGroup.add(skirt);

                // Hem
                const hemR = sp[sp.length - 2][0];
                this.garmentGroup.add(this.createHem(hemR, hemY + 0.05, tZ, mat));

            } else {
                // ====== PANTS/SHORTS/JEANS/JOGGER/LEGGINGS ======
                // Hip yoke section (from waistband to crotch)
                const crotchY = waistY - waistbandH - 0.12 * S;
                const yokeH = waistY - waistbandH - crotchY;
                const yokePts = [];
                const ySteps = 12;
                for (let i = 0; i <= ySteps; i++) {
                    const t = i / ySteps;
                    let r = this.lerp(waW + ease, hiW + ease * 1.1, this.smoothstep(0, 1, t));
                    // Crotch curve (tiro/entrepierna)
                    if (t > 0.6) {
                        r += (t - 0.6) * 0.04 * S;
                    }
                    yokePts.push([r, yokeH * (1 - t)]);
                }
                yokePts.push([0.001, 0]);
                const yoke = this.lathe(yokePts, mat, crotchY + 0.05);
                yoke.scale.z = tZ;

                // Subtle wrinkles on hip yoke area
                this.applyFabricDeformation(yoke.geometry, {
                    wrinkleAmount: 0.0015 * S,
                    noiseAmount: 0.0005 * S,
                    fitType: g.fit,
                    stressPoints: [
                        { y: yokeH * 0.5, intensity: 0.6 },
                    ]
                });

                this.garmentGroup.add(yoke);

                // Individual legs (piernas)
                const legTopR = (isFem ? 0.082 : 0.078) * S * hiF + ease;
                let legBotR;
                if (isLeggings) legBotR = 0.036 * S + ease * 0.3;
                else if (isJogger) legBotR = 0.04 * S + ease;
                else if (g.fit === 'flared') legBotR = 0.075 * S + ease;
                else if (g.fit === 'tight') legBotR = 0.04 * S + ease * 0.5;
                else if (g.fit === 'loose') legBotR = 0.06 * S + ease;
                else legBotR = 0.048 * S + ease;

                const legH = crotchY - hemY;

                [-1, 1].forEach(side => {
                    const lp = [];
                    const lSteps = 20;
                    for (let i = 0; i <= lSteps; i++) {
                        const t = i / lSteps;
                        let r = this.lerp(legTopR, legBotR, t);

                        // Thigh taper (based on patronaje leg shape)
                        if (t < 0.3) {
                            r = this.lerp(legTopR, legTopR * 0.88, this.smoothstep(0, 1, t / 0.3));
                        }

                        // Knee area (slight ease for articulation - patronaje rodilla)
                        const kneeT = this.smoothstep(0.35, 0.5, t) * (1 - this.smoothstep(0.5, 0.65, t));
                        r += kneeT * 0.008 * S;

                        // Calf taper
                        if (t > 0.5) {
                            r = this.lerp(r, legBotR, this.smoothstep(0, 1, (t - 0.5) / 0.5));
                        }

                        // Jogger ankle gathering
                        if (isJogger && t > 0.85) {
                            r = this.lerp(r, 0.04 * S, (t - 0.85) / 0.15);
                        }

                        // Flared pants (pantalon acampanado) - kick from knee
                        if (g.fit === 'flared' && t > 0.45) {
                            r += (t - 0.45) * 0.08 * S;
                        }

                        lp.push([Math.max(r, 0.01), legH * (1 - t)]);
                    }
                    lp.push([0.001, 0]);

                    const leg = this.lathe(lp, mat, hemY + 0.05);
                    leg.position.x = side * 0.085 * S;
                    leg.scale.z = 0.88;
                    leg.castShadow = true;

                    // Fabric deformation for pant legs
                    this.applyFabricDeformation(leg.geometry, {
                        wrinkleAmount: isLeggings ? 0.0008 * S : 0.002 * S,
                        gravityAmount: g.fit === 'loose' ? 0.003 * S : 0.001 * S,
                        noiseAmount: isLeggings ? 0.0003 * S : 0.0008 * S,
                        fitType: g.fit,
                        stressPoints: [
                            { y: legH * 0.5, intensity: 0.9 },   // knee wrinkles
                            { y: legH * 0.85, intensity: 0.5 },  // upper thigh
                            { y: legH * 0.05, intensity: 0.4 },  // ankle bunching
                        ]
                    });

                    this.garmentGroup.add(leg);

                    // Leg hem
                    const legHemR = lp[lp.length - 2][0];
                    const legHem = this.createHem(legHemR, hemY + 0.05, 0.88, mat);
                    legHem.position.x = side * 0.085 * S;
                    this.garmentGroup.add(legHem);

                    // Jogger elastic cuff
                    if (isJogger) {
                        const cuffGeo = new THREE.TorusGeometry(0.04 * S, 0.005 * S, 8, 24);
                        const cuff = new THREE.Mesh(cuffGeo, mat);
                        cuff.position.set(side * 0.085 * S, hemY + 0.05, 0);
                        cuff.rotation.x = Math.PI / 2; cuff.scale.z = 0.88;
                        this.garmentGroup.add(cuff);
                    }
                });

                // Inseam line (costura entrepierna)
                const inseamGeo = new THREE.BoxGeometry(0.002, legH * 0.9, 0.002);
                [-1, 1].forEach(side => {
                    const inseam = new THREE.Mesh(inseamGeo, seamMat);
                    inseam.position.set(side * 0.085 * S, hemY + legH * 0.45 + 0.05, 0);
                    this.garmentGroup.add(inseam);
                });

                // ====== JEANS DETAILS ======
                if (isJeans) {
                    // Front fly/zipper
                    const flyGeo = new THREE.BoxGeometry(0.004 * S, 0.06 * S, 0.003 * S);
                    const fly = new THREE.Mesh(flyGeo, seamMat);
                    fly.position.set(0.01 * S, crotchY + 0.04 * S + 0.05, hiW * tZ * 0.5);
                    this.garmentGroup.add(fly);

                    // Rivets
                    const rivetMat = new THREE.MeshStandardMaterial({ color: 0xC0A060, metalness: 0.9, roughness: 0.2 });
                    [[-0.06, 0], [0.06, 0]].forEach(([xOff, zOff]) => {
                        const rivetGeo = new THREE.CylinderGeometry(0.003 * S, 0.003 * S, 0.003 * S, 8);
                        const rivet = new THREE.Mesh(rivetGeo, rivetMat);
                        rivet.rotation.x = Math.PI / 2;
                        rivet.position.set(xOff * S, waistY - 0.02 * S + 0.05, hiW * tZ * 0.4 + 0.01);
                        this.garmentGroup.add(rivet);
                    });

                    // Front pockets stitching (bolsillos de jean)
                    [-1, 1].forEach(side => {
                        const pocketShape = new THREE.Shape();
                        const pw = 0.045 * S, ph = 0.05 * S;
                        pocketShape.moveTo(0, 0);
                        pocketShape.quadraticCurveTo(pw * 0.3, ph * 0.2, pw * 0.5, ph * 0.8);
                        pocketShape.quadraticCurveTo(pw * 0.7, ph, pw, ph * 0.7);
                        pocketShape.lineTo(pw, 0);

                        const pGeo = new THREE.ShapeGeometry(pocketShape);
                        const pocket = new THREE.Mesh(pGeo, seamMat);
                        pocket.position.set(side * 0.04 * S, waistY - 0.025 * S + 0.05, hiW * tZ * 0.5);
                        pocket.scale.x = side;
                        this.garmentGroup.add(pocket);
                    });
                }

                // Side pockets
                if (g.pocket === 'side') {
                    [-1, 1].forEach(side => {
                        const pocketGeo = new THREE.PlaneGeometry(0.04 * S, 0.065 * S);
                        const pocket = new THREE.Mesh(pocketGeo, seamMat);
                        pocket.position.set(side * (hiW + ease + 0.005), waistY - 0.05 * S + 0.05, 0);
                        pocket.rotation.y = side * Math.PI / 2;
                        this.garmentGroup.add(pocket);
                    });
                }
            }
        }
    }

    // ===== HIGHLIGHT ZONE =====
    highlightZone(zoneName) {
        // Flash a zone briefly to show what changed
        if (!this._highlightMat) {
            this._highlightMat = new THREE.MeshBasicMaterial({ color: 0x7C3AED, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        }
        // Remove previous highlight
        if (this._highlightMesh) { this.garmentGroup.remove(this._highlightMesh); this._highlightMesh = null; }
        // zoneName not implemented as full feature yet - triggers auto-rotate instead
        this._autoRotateActive = true;
        this._autoRotateTime = 0;
        setTimeout(() => { this._autoRotateActive = false; }, 1500);
    }

    // ===== API =====
    updateBody(key, val) { this.params[key] = val; this.buildBody(); this.buildAllGarments(); }
    rebuild() { this.buildAllGarments(); }
    resetCamera() { this.camera.position.set(0, 1.0, 3.8); this.controls.target.set(0, 0.95, 0); this.controls.update(); }
    takeScreenshot() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }

    // Smooth camera pan to focus on a Y-range
    focusOn(yCenter, distance) {
        const target = { x: 0, y: yCenter, z: 0 };
        const camDist = distance || 3.0;
        // Animate towards target
        this._focusTarget = target;
        this._focusDist = camDist;
        this._focusing = true;
        setTimeout(() => { this._focusing = false; }, 1000);
    }

    onResize() {
        if (!this.container) return;
        const w = this.container.clientWidth, h = this.container.clientHeight;
        if (w < 10 || h < 10) return;
        this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Gentle auto-rotate when garment changes (shows 3D effect)
        if (this._autoRotateActive && this._autoRotateTime !== undefined) {
            this._autoRotateTime += 0.016;
            const angle = Math.sin(this._autoRotateTime * 2.5) * 0.008;
            this.garmentGroup.rotation.y += angle;
            this.bodyGroup.rotation.y += angle;
            if (this._autoRotateTime > 2) {
                this._autoRotateActive = false;
                // Smoothly return to center
                this.garmentGroup.rotation.y *= 0.95;
                this.bodyGroup.rotation.y *= 0.95;
            }
        } else {
            // Slowly return rotation to 0
            if (Math.abs(this.garmentGroup.rotation.y) > 0.001) {
                this.garmentGroup.rotation.y *= 0.96;
                this.bodyGroup.rotation.y *= 0.96;
            }
        }

        // Smooth camera focus
        if (this._focusing && this._focusTarget) {
            this.controls.target.y += (this._focusTarget.y - this.controls.target.y) * 0.05;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
