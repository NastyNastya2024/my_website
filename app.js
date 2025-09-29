const { createApp } = Vue;

createApp({
    data() {
        return {
            canvas: null,
            ctx: null,
            isDrawing: false,
            selectedColor: '#000000',
            selectedSize: 5,
            currentTool: 'brush',
            drawMode: 'click', // 'click' или 'hover'
            history: [], // Массив для хранения состояний canvas
            historyIndex: -1, // Индекс текущего состояния в истории
            hasSavedHoverState: false, // Флаг для режима hover
            colors: [
                '#000000', '#FF0000', '#00FF00', '#0000FF',
                '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
                '#800080', '#008000', '#FFC0CB', '#A52A2A'
            ],
            brushSizes: [1, 3, 5, 8, 12, 16, 20]
        }
    },
    mounted() {
        this.canvas = this.$refs.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.resizeCanvas);
    },
    methods: {
        setupCanvas() {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            // Сохраняем начальное пустое состояние
            this.saveState();
        },
        saveState() {
            // Сохраняем текущее состояние canvas
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Удаляем все состояния после текущего индекса (если есть)
            this.history = this.history.slice(0, this.historyIndex + 1);
            
            // Добавляем новое состояние
            this.history.push(imageData);
            this.historyIndex++;
            
            // Ограничиваем размер истории (максимум 20 состояний)
            if (this.history.length > 20) {
                this.history.shift();
                this.historyIndex--;
            }
        },
        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.restoreState();
            }
        },
        restoreState() {
            if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
                const imageData = this.history[this.historyIndex];
                this.ctx.putImageData(imageData, 0, 0);
            }
        },
        createSoftBrush(x, y, size, color) {
            // Создаем радиальный градиент для мягких краев
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
            
            // Конвертируем hex цвет в rgba для работы с прозрачностью
            const rgbaColor = this.hexToRgba(color, 1);
            const transparentColor = this.hexToRgba(color, 0);
            
            gradient.addColorStop(0, rgbaColor);
            gradient.addColorStop(0.5, rgbaColor);
            gradient.addColorStop(0.8, this.hexToRgba(color, 0.3));
            gradient.addColorStop(1, transparentColor);
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, 2 * Math.PI);
            this.ctx.fill();
        },
        hexToRgba(hex, alpha) {
            // Конвертируем hex цвет в rgba
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        },
        resizeCanvas() {
            const container = this.canvas.parentElement;
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        },
        selectColor(color) {
            this.selectedColor = color;
        },
        selectSize(size) {
            this.selectedSize = size;
        },
        selectTool(tool) {
            this.currentTool = tool;
            this.updateCursor();
        },
        selectDrawMode(mode) {
            this.drawMode = mode;
            this.hasSavedHoverState = false; // Сбрасываем флаг при смене режима
            this.updateCursor();
        },
        updateCursor() {
            if (this.drawMode === 'hover') {
                this.canvas.style.cursor = this.currentTool === 'eraser' ? 'grab' : 'crosshair';
            } else {
                this.canvas.style.cursor = this.currentTool === 'eraser' ? 'grab' : 'crosshair';
            }
        },
        startDrawing(e) {
            if (this.drawMode === 'click') {
                this.isDrawing = true;
                // Сохраняем состояние перед началом рисования
                this.saveState();
                
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
            }
        },
        draw(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (this.drawMode === 'hover') {
                // Режим рисования при наведении
                this.drawAtPosition(x, y);
            } else if (this.isDrawing) {
                // Обычный режим рисования при нажатии - непрерывные линии
                this.drawLine(x, y);
            }
        },
        drawLine(x, y) {
            if (this.currentTool === 'eraser') {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineWidth = this.selectedSize * 2;
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            } else {
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.selectedColor;
                this.ctx.lineWidth = this.selectedSize;
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            }
        },
        drawAtPosition(x, y) {
            // Сохраняем состояние только один раз при первом движении мыши
            if (!this.hasSavedHoverState) {
                this.saveState();
                this.hasSavedHoverState = true;
            }
            
            if (this.currentTool === 'eraser') {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineWidth = this.selectedSize * 2;
                this.ctx.beginPath();
                this.ctx.arc(x, y, this.selectedSize / 2, 0, 2 * Math.PI);
                this.ctx.fill();
            } else {
                this.ctx.globalCompositeOperation = 'source-over';
                // Используем мягкую кисть для кисти
                this.createSoftBrush(x, y, this.selectedSize, this.selectedColor);
            }
        },
        stopDrawing() {
            if (this.drawMode === 'click') {
                this.isDrawing = false;
                this.ctx.globalCompositeOperation = 'source-over';
            }
        },
        clearCanvas() {
            this.saveState(); // Сохраняем состояние перед очисткой
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}).mount('#app');
