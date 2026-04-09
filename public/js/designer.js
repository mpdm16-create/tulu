// ===== DISENADOR INTERACTIVO =====
class GarmentDesigner {
    constructor() {
        this.canvas = document.getElementById('designCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentGarment = null;
        this.garmentColor = '#FFFFFF';
        this.selectedSize = 'M';
        this.elements = []; // textos e imagenes colocados
        this.selectedElement = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.history = [];
        this.historyIndex = -1;

        this.initEvents();
    }

    initEvents() {
        // Color palette
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                e.target.classList.add('active');
                this.garmentColor = e.target.dataset.color;
                this.render();
            });
        });

        // Add text
        document.getElementById('addTextBtn').addEventListener('click', () => this.addText());

        // Image upload
        const uploadArea = document.getElementById('uploadArea');
        const imageUpload = document.getElementById('imageUpload');

        uploadArea.addEventListener('click', () => imageUpload.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            if (e.dataTransfer.files[0]) this.addImage(e.dataTransfer.files[0]);
        });
        imageUpload.addEventListener('change', (e) => {
            if (e.target.files[0]) this.addImage(e.target.files[0]);
        });

        // Size buttons
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedSize = e.target.dataset.size;
            });
        });

        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

        // Canvas touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.onMouseUp());

        // Controls
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('deleteItemBtn').addEventListener('click', () => this.deleteSelected());
        document.getElementById('downloadBtn').addEventListener('click', () => this.download());
        document.getElementById('clearDesignBtn').addEventListener('click', () => this.clearDesign());
    }

    selectGarment(product) {
        this.currentGarment = product;
        this.elements = [];
        this.history = [];
        this.historyIndex = -1;

        // Update UI
        const selectedDiv = document.getElementById('selectedGarment');
        selectedDiv.innerHTML = `<i class="fas fa-check-circle" style="color:var(--primary-light);margin-right:8px;"></i> ${product.name}`;
        selectedDiv.classList.add('has-garment');

        document.getElementById('canvasPlaceholder').classList.add('hidden');

        // Set canvas size based on container
        const container = document.getElementById('canvasContainer');
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;

        this.saveState();
        this.render();

        // Scroll to designer
        document.getElementById('disenador').scrollIntoView({ behavior: 'smooth' });
    }

    render() {
        if (!this.currentGarment) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Draw background
        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(0, 0, w, h);

        // Draw garment SVG as image
        this.drawGarment();

        // Draw elements (texts and images)
        this.elements.forEach((el, i) => {
            if (el.type === 'text') {
                ctx.save();
                ctx.font = `${el.weight || 'bold'} ${el.size}px ${el.font}`;
                ctx.fillStyle = el.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.text, el.x, el.y);

                // Selection indicator
                if (this.selectedElement === i) {
                    const metrics = ctx.measureText(el.text);
                    const textW = metrics.width + 16;
                    const textH = el.size + 10;
                    ctx.strokeStyle = '#8B5CF6';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 3]);
                    ctx.strokeRect(el.x - textW / 2, el.y - textH / 2, textW, textH);
                    ctx.setLineDash([]);
                }
                ctx.restore();
            } else if (el.type === 'image') {
                ctx.drawImage(el.img, el.x - el.width / 2, el.y - el.height / 2, el.width, el.height);

                if (this.selectedElement === i) {
                    ctx.strokeStyle = '#8B5CF6';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 3]);
                    ctx.strokeRect(el.x - el.width / 2 - 4, el.y - el.height / 2 - 4, el.width + 8, el.height + 8);
                    ctx.setLineDash([]);
                }
            }
        });
    }

    drawGarment() {
        const svgString = getGarmentSVG(this.currentGarment.svgType, this.garmentColor);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            const scale = Math.min(
                (this.canvas.width * 0.7) / img.naturalWidth,
                (this.canvas.height * 0.75) / img.naturalHeight
            );
            const drawW = img.naturalWidth * scale;
            const drawH = img.naturalHeight * scale;
            const x = (this.canvas.width - drawW) / 2;
            const y = (this.canvas.height - drawH) / 2;

            this.ctx.drawImage(img, x, y, drawW, drawH);
            URL.revokeObjectURL(url);

            // Re-draw elements on top
            this.elements.forEach((el, i) => {
                if (el.type === 'text') {
                    this.ctx.save();
                    this.ctx.font = `${el.weight || 'bold'} ${el.size}px ${el.font}`;
                    this.ctx.fillStyle = el.color;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(el.text, el.x, el.y);

                    if (this.selectedElement === i) {
                        const metrics = this.ctx.measureText(el.text);
                        const textW = metrics.width + 16;
                        const textH = el.size + 10;
                        this.ctx.strokeStyle = '#8B5CF6';
                        this.ctx.lineWidth = 2;
                        this.ctx.setLineDash([5, 3]);
                        this.ctx.strokeRect(el.x - textW / 2, el.y - textH / 2, textW, textH);
                        this.ctx.setLineDash([]);
                    }
                    this.ctx.restore();
                } else if (el.type === 'image') {
                    this.ctx.drawImage(el.img, el.x - el.width / 2, el.y - el.height / 2, el.width, el.height);
                    if (this.selectedElement === i) {
                        this.ctx.strokeStyle = '#8B5CF6';
                        this.ctx.lineWidth = 2;
                        this.ctx.setLineDash([5, 3]);
                        this.ctx.strokeRect(el.x - el.width / 2 - 4, el.y - el.height / 2 - 4, el.width + 8, el.height + 8);
                        this.ctx.setLineDash([]);
                    }
                }
            });
        };
        img.src = url;
    }

    addText() {
        if (!this.currentGarment) {
            showToast('Primero selecciona una prenda del catalogo');
            return;
        }

        const text = document.getElementById('textInput').value.trim();
        if (!text) {
            showToast('Escribe un texto primero');
            return;
        }

        const font = document.getElementById('fontSelect').value;
        const size = parseInt(document.getElementById('fontSize').value) || 24;
        const color = document.getElementById('textColor').value;

        this.elements.push({
            type: 'text',
            text: text,
            font: font,
            size: size,
            color: color,
            weight: 'bold',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        });

        document.getElementById('textInput').value = '';
        this.saveState();
        this.render();
        showToast('Texto agregado! Arrastralo para moverlo.');
    }

    addImage(file) {
        if (!this.currentGarment) {
            showToast('Primero selecciona una prenda del catalogo');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxSize = 150;
                let width = img.width;
                let height = img.height;

                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width *= ratio;
                    height *= ratio;
                }

                this.elements.push({
                    type: 'image',
                    img: img,
                    width: width,
                    height: height,
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2
                });

                this.saveState();
                this.render();
                showToast('Imagen agregada! Arrastrala para moverla.');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    hitTest(x, y) {
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (el.type === 'text') {
                this.ctx.font = `${el.weight || 'bold'} ${el.size}px ${el.font}`;
                const metrics = this.ctx.measureText(el.text);
                const w = metrics.width + 16;
                const h = el.size + 10;
                if (x >= el.x - w / 2 && x <= el.x + w / 2 && y >= el.y - h / 2 && y <= el.y + h / 2) {
                    return i;
                }
            } else if (el.type === 'image') {
                if (x >= el.x - el.width / 2 && x <= el.x + el.width / 2 &&
                    y >= el.y - el.height / 2 && y <= el.y + el.height / 2) {
                    return i;
                }
            }
        }
        return -1;
    }

    onMouseDown(e) {
        const coords = this.getCanvasCoords(e);
        const hit = this.hitTest(coords.x, coords.y);

        if (hit >= 0) {
            this.selectedElement = hit;
            this.isDragging = true;
            this.dragOffset = {
                x: coords.x - this.elements[hit].x,
                y: coords.y - this.elements[hit].y
            };
            this.canvas.style.cursor = 'grabbing';
        } else {
            this.selectedElement = null;
        }
        this.render();
    }

    onMouseMove(e) {
        if (!this.isDragging || this.selectedElement === null) return;

        const coords = this.getCanvasCoords(e);
        this.elements[this.selectedElement].x = coords.x - this.dragOffset.x;
        this.elements[this.selectedElement].y = coords.y - this.dragOffset.y;
        this.render();
    }

    onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
            this.saveState();
        }
    }

    onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }

    onTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }

    saveState() {
        const state = this.elements.map(el => ({...el}));
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.elements = this.history[this.historyIndex].map(el => ({...el}));
            this.selectedElement = null;
            this.render();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.elements = this.history[this.historyIndex].map(el => ({...el}));
            this.selectedElement = null;
            this.render();
        }
    }

    deleteSelected() {
        if (this.selectedElement !== null) {
            this.elements.splice(this.selectedElement, 1);
            this.selectedElement = null;
            this.saveState();
            this.render();
            showToast('Elemento eliminado');
        }
    }

    clearDesign() {
        this.elements = [];
        this.selectedElement = null;
        this.saveState();
        this.render();
        showToast('Diseno limpiado');
    }

    download() {
        if (!this.currentGarment) return;
        this.selectedElement = null;
        this.render();

        setTimeout(() => {
            const link = document.createElement('a');
            link.download = `TULU_${this.currentGarment.name.replace(/\s/g, '_')}.png`;
            link.href = this.canvas.toDataURL('image/png');
            link.click();
            showToast('Diseno descargado!');
        }, 300);
    }

    getDesignData() {
        return {
            garment: this.currentGarment,
            color: this.garmentColor,
            size: this.selectedSize,
            elementsCount: this.elements.length,
            snapshot: this.canvas.toDataURL('image/png', 0.6)
        };
    }
}
