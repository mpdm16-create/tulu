// ===== 3D BODY MODEL =====
class BodyModel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.params = { gender:'female', height:170, chest:90, waist:70, hips:95, shoulders:42, skinTone:'#FDDCB5' };
        this.garments = []; // array of garment state objects
        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x08080F);
        this.scene.fog = new THREE.FogExp2(0x08080F, 0.07);

        const a = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(42, a, 0.1, 100);
        this.camera.position.set(0, 1.0, 3.8);

        this.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
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
        this.scene.add(new THREE.AmbientLight(0x8888cc, 0.45));
        const k = new THREE.DirectionalLight(0xfff5ee, 0.85); k.position.set(3,5,4); k.castShadow = true; this.scene.add(k);
        const f = new THREE.DirectionalLight(0x7C3AED, 0.25); f.position.set(-4,3,-2); this.scene.add(f);
        const r = new THREE.DirectionalLight(0xF43F5E, 0.2); r.position.set(0,2,-5); this.scene.add(r);
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

    lathe(profile, mat, yOff, sX, sZ) {
        const pts = profile.map(p => new THREE.Vector2(p[0], p[1]));
        const geo = new THREE.LatheGeometry(pts, 32);
        const m = new THREE.Mesh(geo, mat);
        m.position.y = yOff; m.scale.set(sX||1, 1, sZ||1); m.castShadow = true;
        return m;
    }

    lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

    clearGroup(g) {
        while (g.children.length) {
            const c = g.children[0];
            if (c.geometry) c.geometry.dispose();
            if (c.material) { if (Array.isArray(c.material)) c.material.forEach(m=>m.dispose()); else c.material.dispose(); }
            if (c.children) c.children.forEach(cc => { if(cc.geometry) cc.geometry.dispose(); if(cc.material) cc.material.dispose(); });
            g.remove(c);
        }
    }

    // ===== BUILD BODY =====
    buildBody() {
        this.clearGroup(this.bodyGroup);
        const p = this.params, S = p.height/170, isFem = p.gender==='female';
        const chF = p.chest/90, waF = p.waist/(isFem?70:80), hiF = p.hips/(isFem?95:90), shF = p.shoulders/(isFem?42:46);
        const skin = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.skinTone), roughness:0.55, metalness:0.02 });

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.105*S,32,32), skin);
        head.scale.set(1,1.12,0.95); head.position.y = 1.68*S; head.castShadow = true; this.bodyGroup.add(head);
        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.075*S,24,16,0,Math.PI*2,Math.PI*0.4,Math.PI*0.5), skin);
        jaw.position.y = 1.63*S; jaw.scale.set(1,0.8,0.9); this.bodyGroup.add(jaw);
        [-1,1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.025*S,12,8), skin); e.position.set(s*0.105*S,1.69*S,0); e.scale.set(0.5,1,0.7); this.bodyGroup.add(e); });

        // Neck
        this.bodyGroup.add(this.lathe([[0.055*S,0],[0.052*S,0.02*S],[0.05*S,0.05*S],[0.048*S,0.07*S],[0.045*S,0.09*S],[0.001,0.09*S]], skin, 1.48*S));

        // Torso
        const nB=0.065*S*shF, shW=0.2*S*shF, chW=0.18*S*chF, waW=isFem?0.13*S*waF:0.15*S*waF, hiW=isFem?0.185*S*hiF:0.16*S*hiF, lhW=isFem?0.17*S*hiF:0.14*S*hiF;
        const tH = 0.58*S, tZ = isFem?0.72:0.8;
        const tp = [[nB,tH],[shW,tH*.92],[chW,tH*.78],[chW*.98,tH*.65],[waW*1.05,tH*.48],[waW,tH*.38],[waW*1.05,tH*.28],[hiW,tH*.15],[hiW*.98,tH*.08],[lhW,0],[0.001,0]];
        this.bodyGroup.add(this.lathe(tp, skin, 0.9*S, 1, tZ));

        if (isFem) {
            [-1,1].forEach(s => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.055*S*chF,20,16), skin); b.position.set(s*0.065*S,1.35*S,0.08*S*chF); b.scale.set(1,0.9,0.85); this.bodyGroup.add(b); });
        }

        // Arms
        [-1,1].forEach(side => {
            const ag = new THREE.Group();
            ag.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.05*S,20,16), skin), { castShadow:true }));
            ag.children[0].scale.set(1.1,0.9,0.85);
            ag.add(this.lathe([[0.042*S,0],[0.044*S,0.04*S],[0.042*S,0.12*S],[0.038*S,0.2*S],[0.035*S,0.27*S],[0.001,0.27*S]], skin, -0.27*S));
            const elb = new THREE.Mesh(new THREE.SphereGeometry(0.033*S,16,12), skin); elb.position.y = -0.27*S; ag.add(elb);
            ag.add(this.lathe([[0.034*S,0],[0.036*S,0.03*S],[0.034*S,0.1*S],[0.028*S,0.2*S],[0.025*S,0.26*S],[0.001,0.26*S]], skin, -0.53*S));
            const h = new THREE.Mesh(new THREE.BoxGeometry(0.04*S,0.06*S,0.02*S), skin); h.position.y = -0.59*S; ag.add(h);
            ag.position.set(side*(shW+0.03*S), 1.43*S, 0); ag.rotation.z = side*0.08;
            this.bodyGroup.add(ag);
        });

        // Legs
        [-1,1].forEach(side => {
            const lg = new THREE.Group();
            lg.add(this.lathe([[0.075*S*hiF,0.38*S],[0.073*S*hiF,0.32*S],[0.068*S*hiF,0.24*S],[0.06*S*hiF,0.16*S],[0.053*S*hiF,0.08*S],[0.048*S*hiF,0],[0.001,0]], skin, 0));
            const kn = new THREE.Mesh(new THREE.SphereGeometry(0.048*S,20,14), skin); kn.scale.set(1,0.85,0.9); lg.add(kn);
            lg.add(this.lathe([[0.05*S,0.35*S],[0.053*S,0.28*S],[0.05*S,0.2*S],[0.044*S,0.12*S],[0.038*S,0.05*S],[0.035*S,0],[0.001,0]], skin, -0.35*S));
            const an = new THREE.Mesh(new THREE.SphereGeometry(0.03*S,12,10), skin); an.position.y = -0.35*S; lg.add(an);
            const ft = new THREE.Mesh(new THREE.BoxGeometry(0.055*S,0.025*S,0.12*S), skin); ft.position.set(0,-0.37*S,0.025*S); lg.add(ft);
            const to = new THREE.Mesh(new THREE.SphereGeometry(0.028*S,10,8), skin); to.position.set(0,-0.37*S,0.08*S); to.scale.set(1,0.5,1.2); lg.add(to);
            lg.position.set(side*0.085*S, 0.52*S, 0);
            this.bodyGroup.add(lg);
        });

        this.bodyGroup.position.y = 0.05;
    }

    // ===== BUILD ALL GARMENTS =====
    buildAllGarments() {
        this.clearGroup(this.garmentGroup);
        this.garments.forEach(g => this.buildOneGarment(g));
        this.garmentGroup.position.y = 0.05;
    }

    buildOneGarment(g) {
        const p = this.params, S = p.height/170, isFem = p.gender==='female';
        const chF=p.chest/90, waF=p.waist/(isFem?70:80), hiF=p.hips/(isFem?95:90), shF=p.shoulders/(isFem?42:46);
        const fitA = (g.fit==='tight'?0.005:g.fit==='loose'||g.fit==='flared'?0.035:0.018)*S;
        const shW=0.2*S*shF+fitA, chW=0.18*S*chF+fitA, waW=(isFem?0.13:0.15)*S*waF+fitA;
        const hiW=(isFem?0.185:0.16)*S*hiF+fitA;
        const tZ = isFem?0.72:0.8;

        const mat = makeTextureMaterial(g.texture, g.color);
        const accMat = new THREE.MeshStandardMaterial({ color:0x888888, roughness:0.5, metalness:0.1, side:THREE.DoubleSide });

        const cat = GARMENTS[g.type]?.cat;
        const isTop = cat === 'top' || cat === 'dress';
        const isBot = cat === 'bottom';
        const isDress = cat === 'dress';

        if (isTop) {
            // Torso garment
            let botY;
            if (isDress) { botY = g.length==='crop'?0.72:g.length==='long'?0.2:g.length==='oversize'?0.15:0.5; }
            else { botY = g.length==='crop'?0.52:g.length==='long'?0.35:g.length==='oversize'?0.28:0.42; }
            botY *= S;
            const topY = 0.58*S;
            const nB = 0.065*S*shF+fitA;
            const prof = [];
            const steps = 20;
            for (let i = 0; i <= steps; i++) {
                const t = i/steps; let w;
                if (t<0.08) w=nB;
                else if (t<0.2) w=this.lerp(nB,shW,(t-0.08)/0.12);
                else if (t<0.35) w=this.lerp(shW,chW,(t-0.2)/0.15);
                else if (t<0.55) w=this.lerp(chW,waW,(t-0.35)/0.2);
                else if (t<0.75) w=this.lerp(waW,hiW,(t-0.55)/0.2);
                else w=this.lerp(hiW,hiW*0.95,(t-0.75)/0.25);
                if (isDress && t>0.6 && (g.fit==='regular'||g.fit==='loose'||g.fit==='flared')) {
                    const fl = g.fit==='flared'?1.5:g.fit==='loose'?1.35:1.18;
                    w *= this.lerp(1, fl, (t-0.6)/0.4);
                }
                prof.push([w, topY*(1-t)]);
            }
            prof.push([0.001, 0]);
            this.garmentGroup.add(this.lathe(prof, mat, 0.9*S, 1, tZ));

            // Sleeves
            const sl = g.sleeve;
            if (sl && sl !== 'none') {
                let sLen;
                if (sl==='cap') sLen=0.08*S;
                else if (sl==='short') sLen=0.15*S;
                else if (sl==='3quarter') sLen=0.33*S;
                else if (sl==='bell') sLen=0.45*S;
                else sLen=0.5*S;
                const sTop = 0.052*S+fitA;
                const sBot = sl==='bell' ? sTop*1.3 : (sl==='long'?0.032*S+fitA:0.04*S+fitA);
                [-1,1].forEach(side => {
                    const sp = [];
                    for (let i=0;i<=12;i++) { const t=i/12; sp.push([this.lerp(sTop,sBot,t)+Math.sin(t*Math.PI)*0.005*S, sLen*(1-t)]); }
                    sp.push([0.001,0]);
                    const sm = this.lathe(sp, mat, 0);
                    sm.position.set(side*(shW+0.035*S), 1.43*S-sLen+0.05, 0);
                    sm.rotation.z = side*0.08;
                    this.garmentGroup.add(sm);
                    const cg = new THREE.SphereGeometry(sTop*1.05,20,12,0,Math.PI*2,0,Math.PI*0.45);
                    const cap = new THREE.Mesh(cg, mat);
                    cap.position.set(side*(shW+0.035*S),1.43*S+0.05,0);
                    cap.rotation.z = side*0.08;
                    this.garmentGroup.add(cap);
                });
            }

            // Neckline
            const colY = 1.485*S+0.05;
            const nk = g.neckline || 'round';
            if (nk==='round' || nk==='boat') {
                const cr = nk==='boat' ? 0.1*S : 0.07*S;
                const cg = new THREE.TorusGeometry(cr, 0.012*S, 10, 28);
                const cm = new THREE.Mesh(cg, mat);
                cm.position.y = colY; cm.rotation.x = Math.PI/2; cm.scale.z = tZ;
                this.garmentGroup.add(cm);
            } else if (nk==='polo' || nk==='turtle') {
                const h = nk==='turtle' ? 0.07*S : 0.04*S;
                const tp = [[nB*1.05,h],[nB*1.1,h*0.7],[nB*1.05,h*0.3],[nB*0.95,0],[0.001,0]];
                const tm = this.lathe(tp, mat, colY); tm.scale.z = tZ;
                this.garmentGroup.add(tm);
            }

            // Hood for hoodie
            if (g.type === 'hoodie') {
                const hp = [[0.001,0.16*S],[0.04*S,0.155*S],[0.08*S,0.13*S],[0.115*S,0.1*S],[0.13*S,0.06*S],[0.12*S,0.02*S],[0.085*S,0],[0.001,0]];
                const hm = this.lathe(hp, mat, colY+0.01); hm.scale.z = 0.7; hm.position.z = -0.03*S;
                this.garmentGroup.add(hm);
            }

            // Pockets
            if (g.pocket==='front' || g.pocket==='kangaroo') {
                const pw = g.pocket==='kangaroo' ? 0.14*S : 0.07*S;
                const ph = 0.06*S;
                const pg = new THREE.PlaneGeometry(pw, ph);
                const pm = new THREE.Mesh(pg, accMat);
                pm.position.set(g.pocket==='kangaroo'?0:-0.06*S, 1.18*S+0.05, chW*tZ+0.008);
                this.garmentGroup.add(pm);
            }

            // Buttons for shirt
            if (g.type==='shirt') {
                for (let i=0;i<6;i++) {
                    const bg = new THREE.CylinderGeometry(0.006*S,0.006*S,0.003*S,12);
                    const bm = new THREE.Mesh(bg, accMat);
                    bm.rotation.x = Math.PI/2;
                    bm.position.set(0,(1.42-i*0.065)*S+0.05, chW*tZ+0.008);
                    this.garmentGroup.add(bm);
                }
            }

            // Zipper for jacket
            if (g.type==='jacket') {
                const zMat = new THREE.MeshStandardMaterial({color:0x888888,metalness:0.7,roughness:0.3});
                const zg = new THREE.BoxGeometry(0.004*S, 0.35*S, 0.003*S);
                const zm = new THREE.Mesh(zg, zMat);
                zm.position.set(0, 1.25*S+0.05, chW*tZ+0.009);
                this.garmentGroup.add(zm);
            }
        }

        if (isBot) {
            const isSkirt = g.type==='skirt';
            const isShorts = g.type==='shorts';
            const isLeggings = g.type==='leggings';
            const waistY = 0.95*S;
            let botY;
            if (isSkirt) botY = g.length==='crop'?0.68*S:g.length==='long'?0.2*S:0.5*S;
            else if (isShorts) botY = g.length==='crop'?0.62*S:g.length==='long'?0.45*S:0.55*S;
            else if (isLeggings) botY = g.length==='crop'?0.45*S:0.17*S;
            else botY = g.length==='crop'?0.45*S:g.length==='long'?0.17*S:0.3*S;

            // Waist height adjustment
            const waistAdj = g.waist==='high'?0.06*S:g.waist==='low'?-0.05*S:0;
            const effWaistY = waistY + waistAdj;

            if (isSkirt) {
                const skH = effWaistY-botY;
                const sp = [];
                for (let i=0;i<=16;i++) {
                    const t=i/16; let r;
                    if (t<0.15) r=this.lerp(waW+fitA, hiW+fitA, t/0.15);
                    else {
                        const fl = g.fit==='loose'||g.fit==='flared'?1.5:g.fit==='tight'?1.02:1.25;
                        r = this.lerp(hiW+fitA, hiW*fl+fitA, (t-0.15)/0.85);
                    }
                    sp.push([r, skH*(1-t)]);
                }
                sp.push([0.001,0]);
                const sm = this.lathe(sp, mat, botY+0.05); sm.scale.z = tZ;
                this.garmentGroup.add(sm);
            } else {
                // Pants/shorts/jeans/jogger/leggings
                const wSec = 0.12*S;
                const wp = [];
                for (let i=0;i<=8;i++) { const t=i/8; wp.push([this.lerp(waW+fitA,hiW+fitA,t), wSec*(1-t)]); }
                wp.push([0.001,0]);
                const wm = this.lathe(wp, mat, effWaistY-wSec+0.05); wm.scale.z = tZ;
                this.garmentGroup.add(wm);

                const lTopR = (isFem?0.082:0.075)*S*hiF+fitA;
                let lBotR;
                if (isLeggings) lBotR = 0.038*S;
                else if (g.type==='jogger') lBotR = 0.042*S+fitA;
                else if (g.fit==='flared') lBotR = 0.07*S+fitA;
                else lBotR = g.fit==='tight'?0.04*S+fitA:g.fit==='loose'?0.06*S+fitA:0.048*S+fitA;
                const legH = (effWaistY-wSec)-botY;

                [-1,1].forEach(side => {
                    const lp = [];
                    for (let i=0;i<=14;i++) {
                        const t=i/14; let r = this.lerp(lTopR,lBotR,t);
                        r += Math.exp(-Math.pow((t-0.55)*6,2))*0.008*S;
                        lp.push([r, legH*(1-t)]);
                    }
                    lp.push([0.001,0]);
                    const lm = this.lathe(lp, mat, botY+0.05);
                    lm.position.x = side*0.085*S; lm.scale.z = 0.88;
                    this.garmentGroup.add(lm);
                });

                // Side pockets
                if (g.pocket==='side') {
                    [-1,1].forEach(side => {
                        const pg = new THREE.PlaneGeometry(0.04*S, 0.06*S);
                        const pm = new THREE.Mesh(pg, accMat);
                        pm.position.set(side*(hiW+0.01), 0.82*S+0.05, 0);
                        pm.rotation.y = side*Math.PI/2;
                        this.garmentGroup.add(pm);
                    });
                }
            }

            // Waistband
            const wbg = new THREE.TorusGeometry(waW+fitA, 0.01*S, 10, 28);
            const wbm = new THREE.Mesh(wbg, accMat);
            wbm.position.y = effWaistY+0.06; wbm.rotation.x = Math.PI/2; wbm.scale.z = tZ;
            this.garmentGroup.add(wbm);
        }
    }

    // ===== API =====
    updateBody(key, val) { this.params[key] = val; this.buildBody(); this.buildAllGarments(); }
    rebuild() { this.buildAllGarments(); }
    resetCamera() { this.camera.position.set(0,1.0,3.8); this.controls.target.set(0,0.95,0); this.controls.update(); }
    takeScreenshot() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }

    onResize() {
        if (!this.container) return;
        const w = this.container.clientWidth, h = this.container.clientHeight;
        if (w<10||h<10) return;
        this.camera.aspect = w/h; this.camera.updateProjectionMatrix();
        this.renderer.setSize(w,h);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
