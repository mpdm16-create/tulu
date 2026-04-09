const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET || 'tulu-secret-key-change-in-production';
const DB_PATH = path.join(__dirname, 'data', 'tulu.db');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== DATABASE =====
let db;

async function initDB() {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
        const buf = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buf);
    } else {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        db = new SQL.Database();
    }
    return db;
}

function saveDB() { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }
function dbRun(sql, params) { db.run(sql, params); saveDB(); }
function dbGet(sql, params) { const stmt = db.prepare(sql); if (params) stmt.bind(params); return stmt.step() ? stmt.getAsObject() : null; }
function dbAll(sql, params) { const stmt = db.prepare(sql); if (params) stmt.bind(params); const rows = []; while (stmt.step()) rows.push(stmt.getAsObject()); stmt.free(); return rows; }

async function setupDB() {
    await initDB();
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, phone TEXT, role TEXT DEFAULT 'client', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, garments TEXT NOT NULL,
        body_params TEXT NOT NULL, total_price INTEGER DEFAULT 0, status TEXT DEFAULT 'pending',
        notes TEXT, screenshot TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id))`);

    const adminExists = dbGet('SELECT id FROM users WHERE email = ?', ['admin@tulu.com']);
    if (!adminExists) {
        const hash = bcrypt.hashSync('admin123', 10);
        dbRun('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Administrador', 'admin@tulu.com', hash, 'admin']);
        console.log('Admin user created: admin@tulu.com / admin123');
    }
    saveDB();
}

// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: 'Token invalido' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso solo para administradores' });
    next();
}

// ===== AUTH ROUTES =====
app.post('/api/register', (req, res) => {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    try {
        const existing = dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return res.status(400).json({ error: 'Este email ya esta registrado' });
        const hash = bcrypt.hashSync(password, 10);
        dbRun('INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)', [name, email, hash, phone || null]);
        const user = dbGet('SELECT id FROM users WHERE email = ?', [email]);
        const token = jwt.sign({ id: user.id, email, name, role: 'client' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name, email, role: 'client' } });
    } catch (e) {
        res.status(500).json({ error: 'Error al registrar' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    const user = dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/me', auth, (req, res) => {
    const user = dbGet('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
});

// ===== ORDER ROUTES =====
app.post('/api/orders', auth, (req, res) => {
    const { garments, bodyParams, totalPrice, notes, screenshot } = req.body;
    if (!garments || !bodyParams) return res.status(400).json({ error: 'Datos del pedido incompletos' });
    dbRun('INSERT INTO orders (user_id, garments, body_params, total_price, notes, screenshot) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, JSON.stringify(garments), JSON.stringify(bodyParams), totalPrice || 0, notes || null, screenshot || null]);
    const last = dbGet('SELECT last_insert_rowid() as id');
    res.json({ id: last.id, message: 'Pedido creado exitosamente' });
});

app.get('/api/orders', auth, (req, res) => {
    let orders;
    if (req.user.role === 'admin') {
        orders = dbAll(`SELECT o.*, u.name as client_name, u.email as client_email, u.phone as client_phone
            FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`);
    } else {
        orders = dbAll('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    }
    orders.forEach(o => {
        o.garments = JSON.parse(o.garments);
        o.body_params = JSON.parse(o.body_params);
    });
    res.json(orders);
});

app.patch('/api/orders/:id/status', auth, adminOnly, (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado invalido' });
    dbRun('UPDATE orders SET status = ? WHERE id = ?', [status, parseInt(req.params.id)]);
    res.json({ message: 'Estado actualizado' });
});

// ===== PATTERN GENERATION (SVG) =====
app.get('/api/orders/:id/pattern', auth, adminOnly, (req, res) => {
    const order = dbGet('SELECT * FROM orders WHERE id = ?', [parseInt(req.params.id)]);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    const garments = JSON.parse(order.garments);
    const body = JSON.parse(order.body_params);
    const garmentIdx = parseInt(req.query.garment) || 0;
    const g = garments[garmentIdx];
    if (!g) return res.status(404).json({ error: 'Prenda no encontrada' });

    const svg = generatePatternSVG(g, body);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="patron_${g.type}_pedido_${order.id}.svg"`);
    res.send(svg);
});

function generatePatternSVG(garment, body) {
    const scale = 3; // 1cm = 3px
    const S = body.height / 170;
    const chest = body.chest * scale;
    const waist = body.waist * scale;
    const hips = body.hips * scale;
    const shoulders = body.shoulders * scale;

    // Ease based on fit
    const easeMap = { tight: 2, regular: 6, loose: 12, flared: 8 };
    const ease = (easeMap[garment.fit] || 6) * scale;

    const cat = garment.type;
    const isTop = ['tshirt','shirt','blouse','hoodie','tank','jacket'].includes(cat);
    const isBottom = ['pants','jeans','shorts','jogger','leggings','skirt'].includes(cat);
    const isDress = cat === 'dress';

    let svgContent = '';
    let width = 800, height = 1000;

    if (isTop || isDress) {
        // Front bodice pattern piece
        const halfChest = chest / 2 + ease / 2;
        const halfWaist = waist / 2 + ease / 2;
        const halfShoulder = shoulders / 2;
        const armholeDepth = 22 * scale * S;
        const bodiceLength = isDress ? 80 * scale * S : (garment.length === 'crop' ? 38 * scale * S : garment.length === 'long' ? 60 * scale * S : 50 * scale * S);

        // Neckline dimensions
        const neckW = 7 * scale;
        const neckD = garment.neckline === 'v' ? 12 * scale : garment.neckline === 'boat' ? 11 * scale : 8 * scale;

        const ox = 50, oy = 80;

        svgContent += `
        <!-- DELANTERO (Front) -->
        <text x="${ox}" y="${oy - 30}" font-size="16" font-weight="bold" fill="#333">DELANTERO - ${garment.type.toUpperCase()}</text>
        <text x="${ox}" y="${oy - 12}" font-size="11" fill="#666">Escala 1:${Math.round(1/scale * 100)/100} | Tela: ${garment.texture} | Color: ${garment.color}</text>

        <!-- Shoulder line -->
        <line x1="${ox + neckW}" y1="${oy}" x2="${ox + halfShoulder}" y2="${oy + 4 * scale}" stroke="#333" stroke-width="1.5"/>
        <!-- Neckline -->
        <path d="M ${ox + neckW} ${oy} Q ${ox} ${oy} ${ox} ${oy + neckD}" fill="none" stroke="#333" stroke-width="1.5"/>
        <!-- Center front -->
        <line x1="${ox}" y1="${oy + neckD}" x2="${ox}" y2="${oy + bodiceLength}" stroke="#333" stroke-width="1.5" stroke-dasharray="8,3"/>
        <!-- Armhole -->
        <path d="M ${ox + halfShoulder} ${oy + 4 * scale} Q ${ox + halfChest + 3 * scale} ${oy + armholeDepth * 0.4} ${ox + halfChest} ${oy + armholeDepth}" fill="none" stroke="#333" stroke-width="1.5"/>
        <!-- Side seam -->
        <line x1="${ox + halfChest}" y1="${oy + armholeDepth}" x2="${ox + halfWaist}" y2="${oy + bodiceLength}" stroke="#333" stroke-width="1.5"/>
        <!-- Hem -->
        <line x1="${ox}" y1="${oy + bodiceLength}" x2="${ox + halfWaist}" y2="${oy + bodiceLength}" stroke="#333" stroke-width="1.5"/>

        <!-- Grainline -->
        <line x1="${ox + halfChest / 2}" y1="${oy + 20}" x2="${ox + halfChest / 2}" y2="${oy + bodiceLength - 20}" stroke="#999" stroke-width="0.8" marker-end="url(#arrow)" marker-start="url(#arrow)"/>
        <text x="${ox + halfChest / 2 + 5}" y="${oy + bodiceLength / 2}" font-size="9" fill="#999" transform="rotate(-90,${ox + halfChest / 2 + 5},${oy + bodiceLength / 2})">HILO</text>

        <!-- Measurements -->
        <text x="${ox}" y="${oy + bodiceLength + 25}" font-size="10" fill="#555">Pecho: ${body.chest}cm (+${easeMap[garment.fit] || 6}cm holgura) | Cintura: ${body.waist}cm | Hombro: ${body.shoulders}cm</text>
        <text x="${ox}" y="${oy + bodiceLength + 42}" font-size="10" fill="#555">Largo: ${Math.round(bodiceLength / scale / S)}cm | Corte: ${garment.fit} | Escote: ${garment.neckline || 'N/A'}</text>
        `;

        // Back piece (offset to the right)
        const bx = ox + halfChest + 100;
        const backNeckD = 3 * scale;
        svgContent += `
        <!-- ESPALDA (Back) -->
        <text x="${bx}" y="${oy - 30}" font-size="16" font-weight="bold" fill="#333">ESPALDA</text>
        <line x1="${bx + neckW}" y1="${oy}" x2="${bx + halfShoulder}" y2="${oy + 4 * scale}" stroke="#333" stroke-width="1.5"/>
        <path d="M ${bx + neckW} ${oy} Q ${bx} ${oy} ${bx} ${oy + backNeckD}" fill="none" stroke="#333" stroke-width="1.5"/>
        <line x1="${bx}" y1="${oy + backNeckD}" x2="${bx}" y2="${oy + bodiceLength}" stroke="#333" stroke-width="1.5" stroke-dasharray="8,3"/>
        <path d="M ${bx + halfShoulder} ${oy + 4 * scale} Q ${bx + halfChest + 3 * scale} ${oy + armholeDepth * 0.4} ${bx + halfChest} ${oy + armholeDepth}" fill="none" stroke="#333" stroke-width="1.5"/>
        <line x1="${bx + halfChest}" y1="${oy + armholeDepth}" x2="${bx + halfWaist}" y2="${oy + bodiceLength}" stroke="#333" stroke-width="1.5"/>
        <line x1="${bx}" y1="${oy + bodiceLength}" x2="${bx + halfWaist}" y2="${oy + bodiceLength}" stroke="#333" stroke-width="1.5"/>
        `;

        // Sleeve pattern
        if (garment.sleeve && garment.sleeve !== 'none') {
            const sleeveLen = garment.sleeve === 'cap' ? 8 * scale * S : garment.sleeve === 'short' ? 20 * scale * S : garment.sleeve === '3quarter' ? 42 * scale * S : 55 * scale * S;
            const capH = 14 * scale * S;
            const sleeveW = armholeDepth * 0.8;
            const sx = ox, sy = oy + bodiceLength + 80;

            svgContent += `
            <!-- MANGA (Sleeve) -->
            <text x="${sx}" y="${sy - 15}" font-size="16" font-weight="bold" fill="#333">MANGA x2</text>
            <path d="M ${sx} ${sy + capH} Q ${sx + sleeveW / 2} ${sy} ${sx + sleeveW} ${sy + capH}" fill="none" stroke="#333" stroke-width="1.5"/>
            <line x1="${sx}" y1="${sy + capH}" x2="${sx + 3}" y2="${sy + capH + sleeveLen}" stroke="#333" stroke-width="1.5"/>
            <line x1="${sx + sleeveW}" y1="${sy + capH}" x2="${sx + sleeveW - 3}" y2="${sy + capH + sleeveLen}" stroke="#333" stroke-width="1.5"/>
            <line x1="${sx + 3}" y1="${sy + capH + sleeveLen}" x2="${sx + sleeveW - 3}" y2="${sy + capH + sleeveLen}" stroke="#333" stroke-width="1.5"/>
            <text x="${sx}" y="${sy + capH + sleeveLen + 20}" font-size="10" fill="#555">Largo manga: ${Math.round(sleeveLen / scale / S)}cm | Tipo: ${garment.sleeve}</text>
            `;
            height = Math.max(height, sy + capH + sleeveLen + 60);
        }

        width = Math.max(width, bx + halfChest + 60);
        height = Math.max(height, oy + bodiceLength + 80);
    }

    if (isBottom) {
        const halfWaist = waist / 2 + ease / 2;
        const halfHips = hips / 2 + ease / 2;
        const rise = garment.waist === 'high' ? 30 * scale * S : garment.waist === 'low' ? 20 * scale * S : 25 * scale * S;
        const legLen = garment.type === 'shorts' ? 30 * scale * S : garment.type === 'skirt' ? 45 * scale * S : (garment.length === 'long' ? 95 * scale * S : 80 * scale * S);
        const ox = 50, oy = 80;

        if (garment.type === 'skirt') {
            svgContent += `
            <text x="${ox}" y="${oy - 30}" font-size="16" font-weight="bold" fill="#333">FALDA - DELANTERO</text>
            <line x1="${ox}" y1="${oy}" x2="${ox + halfWaist}" y2="${oy}" stroke="#333" stroke-width="1.5"/>
            <line x1="${ox}" y1="${oy}" x2="${ox - 15}" y2="${oy + legLen}" stroke="#333" stroke-width="1.5"/>
            <line x1="${ox + halfWaist}" y1="${oy}" x2="${ox + halfHips + 15}" y2="${oy + legLen}" stroke="#333" stroke-width="1.5"/>
            <line x1="${ox - 15}" y1="${oy + legLen}" x2="${ox + halfHips + 15}" y2="${oy + legLen}" stroke="#333" stroke-width="1.5"/>
            `;
        } else {
            // Pant front
            const crotchExt = 5 * scale * S;
            const kneeW = halfHips * 0.5;
            const hemW = garment.fit === 'flared' ? kneeW * 1.3 : garment.fit === 'tight' ? kneeW * 0.7 : kneeW * 0.85;

            svgContent += `
            <text x="${ox}" y="${oy - 30}" font-size="16" font-weight="bold" fill="#333">PANTALON DELANTERO - ${garment.type.toUpperCase()}</text>
            <!-- Waistband -->
            <line x1="${ox}" y1="${oy}" x2="${ox + halfWaist}" y2="${oy}" stroke="#333" stroke-width="1.5"/>
            <!-- Center front -->
            <line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + rise}" stroke="#333" stroke-width="1.5"/>
            <!-- Crotch curve -->
            <path d="M ${ox} ${oy + rise} Q ${ox + crotchExt} ${oy + rise + crotchExt} ${ox + crotchExt} ${oy + rise + crotchExt * 2}" fill="none" stroke="#333" stroke-width="1.5"/>
            <!-- Side seam -->
            <line x1="${ox + halfWaist}" y1="${oy}" x2="${ox + halfHips}" y2="${oy + rise}" stroke="#333" stroke-width="1.5"/>
            <!-- Inseam -->
            <line x1="${ox + crotchExt}" y1="${oy + rise + crotchExt * 2}" x2="${ox + halfHips / 2 - hemW / 2}" y2="${oy + rise + legLen}" stroke="#333" stroke-width="1.5"/>
            <!-- Outer seam -->
            <line x1="${ox + halfHips}" y1="${oy + rise}" x2="${ox + halfHips / 2 + hemW / 2}" y2="${oy + rise + legLen}" stroke="#333" stroke-width="1.5"/>
            <!-- Hem -->
            <line x1="${ox + halfHips / 2 - hemW / 2}" y1="${oy + rise + legLen}" x2="${ox + halfHips / 2 + hemW / 2}" y2="${oy + rise + legLen}" stroke="#333" stroke-width="1.5"/>
            `;
        }

        svgContent += `
        <text x="${ox}" y="${oy + rise + legLen + 40}" font-size="10" fill="#555">Cintura: ${body.waist}cm | Cadera: ${body.hips}cm | Tiro: ${garment.waist || 'normal'} (${Math.round(rise/scale/S)}cm)</text>
        <text x="${ox}" y="${oy + rise + legLen + 57}" font-size="10" fill="#555">Largo: ${Math.round(legLen/scale/S)}cm | Corte: ${garment.fit} | Textura: ${garment.texture}</text>
        `;
        height = Math.max(height, oy + rise + legLen + 80);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#999"/></marker>
    </defs>
    <rect width="100%" height="100%" fill="white"/>
    <text x="${width/2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#7C3AED">TULU - Patron de Confeccion</text>
    <text x="${width/2}" y="50" text-anchor="middle" font-size="12" fill="#666">Medidas: Altura ${body.height}cm | Pecho ${body.chest}cm | Cintura ${body.waist}cm | Cadera ${body.hips}cm | Hombros ${body.shoulders}cm</text>
    ${svgContent}
    <text x="10" y="${height - 10}" font-size="9" fill="#999">Generado por TULU 3D Fashion Studio | Incluir margen de costura de 1.5cm</text>
</svg>`;
}

// ===== ADMIN STATS =====
app.get('/api/admin/stats', auth, adminOnly, (req, res) => {
    const totalOrders = dbGet('SELECT COUNT(*) as count FROM orders')?.count || 0;
    const totalClients = dbGet("SELECT COUNT(*) as count FROM users WHERE role = 'client'")?.count || 0;
    const pendingOrders = dbGet("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'")?.count || 0;
    const revenue = dbGet("SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE status != 'cancelled'")?.total || 0;
    res.json({ totalOrders, totalClients, pendingOrders, revenue });
});

app.get('/api/admin/clients', auth, adminOnly, (req, res) => {
    const clients = dbAll(`SELECT u.id, u.name, u.email, u.phone, u.created_at,
        COUNT(o.id) as order_count, COALESCE(SUM(o.total_price), 0) as total_spent
        FROM users u LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.role = 'client' GROUP BY u.id ORDER BY u.created_at DESC`);
    res.json(clients);
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
setupDB().then(() => {
    app.listen(PORT, () => {
        console.log(`TULU server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
});
