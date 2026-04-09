// ===== CARRITO DE COMPRAS =====
class ShoppingCart {
    constructor() {
        this.items = [];
        this.sidebar = document.getElementById('cartSidebar');
        this.overlay = document.getElementById('cartOverlay');
        this.cartItems = document.getElementById('cartItems');
        this.cartFooter = document.getElementById('cartFooter');
        this.cartCount = document.getElementById('cartCount');
        this.cartTotal = document.getElementById('cartTotal');

        this.initEvents();
    }

    initEvents() {
        document.getElementById('cartBtn').addEventListener('click', () => this.open());
        document.getElementById('cartClose').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());

        document.getElementById('checkoutWhatsApp').addEventListener('click', () => this.sendWhatsApp());
        document.getElementById('checkoutEmail').addEventListener('click', () => this.sendEmail());
    }

    open() {
        this.sidebar.classList.add('open');
        this.overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.sidebar.classList.remove('open');
        this.overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    addItem(designData) {
        if (!designData || !designData.garment) {
            showToast('Primero selecciona y disena una prenda');
            return;
        }

        const item = {
            id: Date.now(),
            name: designData.garment.name,
            color: designData.color,
            size: designData.size,
            price: designData.garment.price,
            snapshot: designData.snapshot,
            elementsCount: designData.elementsCount
        };

        this.items.push(item);
        this.updateUI();
        this.open();
        showToast('Prenda agregada al carrito!');
    }

    removeItem(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.updateUI();
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + item.price, 0);
    }

    updateUI() {
        // Update count badge
        this.cartCount.textContent = this.items.length;

        if (this.items.length === 0) {
            this.cartItems.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Tu carrito esta vacio</p>
                </div>`;
            this.cartFooter.style.display = 'none';
            return;
        }

        this.cartFooter.style.display = 'block';

        this.cartItems.innerHTML = this.items.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-preview">
                    <img src="${item.snapshot}" alt="${item.name}">
                </div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>Talla: ${item.size} | Color: <span style="display:inline-block;width:12px;height:12px;background:${item.color};border-radius:50%;vertical-align:middle;border:1px solid #555;"></span></p>
                    <p>${item.elementsCount} elemento(s) de diseno</p>
                    <div class="item-price">${formatPrice(item.price)}</div>
                </div>
                <button class="cart-item-remove" onclick="cart.removeItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        this.cartTotal.textContent = formatPrice(this.getTotal());
    }

    buildOrderMessage() {
        let msg = '🛍️ *PEDIDO TULU - Ropa Personalizada*\n\n';
        this.items.forEach((item, i) => {
            msg += `*${i + 1}. ${item.name}*\n`;
            msg += `   Talla: ${item.size}\n`;
            msg += `   Precio: ${formatPrice(item.price)}\n`;
            msg += `   Personalizaciones: ${item.elementsCount} elemento(s)\n\n`;
        });
        msg += `*TOTAL ESTIMADO: ${formatPrice(this.getTotal())}*\n\n`;
        msg += 'Por favor confirmar disponibilidad y tiempo de entrega. Gracias!';
        return msg;
    }

    sendWhatsApp() {
        if (this.items.length === 0) return;
        const phone = '573001234567'; // Cambiar por el numero real
        const msg = encodeURIComponent(this.buildOrderMessage());
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    }

    sendEmail() {
        if (this.items.length === 0) return;
        const subject = encodeURIComponent('Pedido TULU - Ropa Personalizada');
        const body = encodeURIComponent(this.buildOrderMessage());
        window.open(`mailto:info@tulu.com?subject=${subject}&body=${body}`, '_blank');
    }
}
