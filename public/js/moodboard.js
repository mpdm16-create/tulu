// ===== MOODBOARD =====
class Moodboard {
    constructor() {
        this.items = [];
        this.grid = document.getElementById('moodboardGrid');
        this.fileInput = document.getElementById('moodFileInput');

        this.initEvents();
    }

    initEvents() {
        document.getElementById('addMoodImage').addEventListener('click', () => {
            this.fileInput.click();
        });

        document.getElementById('addMoodNote').addEventListener('click', () => {
            this.addNote();
        });

        this.fileInput.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => this.addImage(file));
            e.target.value = '';
        });

        // Drag & drop on grid
        this.grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.grid.style.outline = '2px dashed var(--primary)';
        });
        this.grid.addEventListener('dragleave', () => {
            this.grid.style.outline = '';
        });
        this.grid.addEventListener('drop', (e) => {
            e.preventDefault();
            this.grid.style.outline = '';
            Array.from(e.dataTransfer.files).forEach(file => {
                if (file.type.startsWith('image/')) this.addImage(file);
            });
        });
    }

    addImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = {
                id: Date.now() + Math.random(),
                type: 'image',
                src: e.target.result,
                note: ''
            };
            this.items.push(item);
            this.render();
            showToast('Imagen agregada al moodboard');
        };
        reader.readAsDataURL(file);
    }

    addNote() {
        const item = {
            id: Date.now() + Math.random(),
            type: 'note',
            note: 'Escribe tu idea aqui...\n\nEj: "Quiero este tipo de manga pero en color azul"'
        };
        this.items.push(item);
        this.render();
        showToast('Nota agregada');
    }

    removeItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.render();
    }

    updateNote(id, text) {
        const item = this.items.find(i => i.id === id);
        if (item) item.note = text;
    }

    render() {
        if (this.items.length === 0) {
            this.grid.innerHTML = `
                <div class="mood-placeholder">
                    <i class="fas fa-images"></i>
                    <h3>Tu tablero de inspiracion</h3>
                    <p>Sube fotos de Pinterest, Instagram o cualquier referencia visual que te inspire. Agrega notas describiendo lo que te gusta de cada imagen.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('moodFileInput').click()">
                        <i class="fas fa-upload"></i> Subir Primera Imagen
                    </button>
                </div>`;
            return;
        }

        this.grid.innerHTML = this.items.map(item => {
            if (item.type === 'image') {
                return `
                    <div class="mood-card" data-id="${item.id}">
                        <img src="${item.src}" alt="Referencia">
                        <div class="mood-card-body">
                            <textarea placeholder="Agrega una nota sobre esta referencia..."
                                onchange="moodboard.updateNote(${item.id}, this.value)">${item.note}</textarea>
                        </div>
                        <div class="mood-card-actions">
                            <button onclick="moodboard.removeItem(${item.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>`;
            } else {
                return `
                    <div class="mood-card mood-note" data-id="${item.id}">
                        <div class="mood-card-body" style="padding:20px">
                            <div style="font-size:1.5rem;margin-bottom:10px"><i class="fas fa-lightbulb" style="color:var(--accent2)"></i></div>
                            <textarea placeholder="Tu idea..."
                                onchange="moodboard.updateNote(${item.id}, this.value)">${item.note}</textarea>
                        </div>
                        <div class="mood-card-actions">
                            <button onclick="moodboard.removeItem(${item.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>`;
            }
        }).join('');
    }
}
