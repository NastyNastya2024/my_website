const { createApp } = Vue;

createApp({
    data() {
        return {
            canvas: null,
            ctx: null,
            isDrawing: false,
            selectedColor: 'rainbow', // Радуга по умолчанию
            selectedSize: 5,
            currentTool: 'brush',
            drawMode: 'click', // режим рисования при нажатии
            history: [], // Массив для хранения состояний canvas
            historyIndex: -1, // Индекс текущего состояния в истории
            hasSavedHoverState: false, // Флаг для режима hover
            toolbarOpen: false, // Состояние панели инструментов
            lastX: 0, // Последняя позиция X мыши
            lastY: 0, // Последняя позиция Y мыши
            rainbowIndex: 0, // Индекс текущего цвета радуги
            rainbowColors: ['#FFB3BA', '#FFD1A1', '#FFFFBA', '#B3FFB3', '#B3D9FF', '#D1B3FF', '#E6B3FF'], // Пастельные цвета радуги
            drawingEnabled: true, // Состояние рисования
            colors: [
                '#C77CFF', '#6BB6FF', '#7ED321', '#F5A623',
                '#FF6B9D', '#FFD93D', '#9B59B6', '#3498DB',
                '#E67E22', '#F1C40F', '#2ECC71', '#E74C3C',
                'rainbow' // Специальный цвет радуги
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
        this.initSteps();
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
            // Создаем эффект пастели с очень мягкими краями
            const layers = 5; // Увеличиваем количество слоев
            const layerSize = size / layers;
            
            for (let i = 0; i < layers; i++) {
                const currentSize = layerSize * (i + 1);
                const opacity = 0.4 - (i * 0.08); // Более плавное уменьшение непрозрачности
                
                // Создаем радиальный градиент для каждого слоя
                const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, currentSize);
                const rgbaColor = this.hexToRgba(color, opacity);
                const transparentColor = this.hexToRgba(color, 0);
                
                gradient.addColorStop(0, rgbaColor);
                gradient.addColorStop(0.2, rgbaColor);
                gradient.addColorStop(0.5, this.hexToRgba(color, opacity * 0.7));
                gradient.addColorStop(0.8, this.hexToRgba(color, opacity * 0.3));
                gradient.addColorStop(1, transparentColor);
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(x, y, currentSize, 0, 2 * Math.PI);
                this.ctx.fill();
            }
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
            if (color === 'rainbow') {
                this.rainbowIndex = 0; // Сбрасываем индекс радуги
            }
        },
        getCurrentColor() {
            if (this.selectedColor === 'rainbow') {
                // Создаем более разнообразные цвета
                const currentColor = this.rainbowColors[this.rainbowIndex];
                const nextColor = this.rainbowColors[(this.rainbowIndex + 1) % this.rainbowColors.length];
                
                // Смешиваем текущий и следующий цвет для плавного перехода
                const mixFactor = Math.random() * 0.7; // Случайное смешение до 70%
                const mixedColor = this.mixColors(currentColor, nextColor, mixFactor);
                
                // Добавляем небольшую вариацию яркости
                const brightness = 0.8 + Math.random() * 0.4; // От 80% до 120% яркости
                return this.adjustBrightness(mixedColor, brightness);
            }
            return this.selectedColor;
        },
        mixColors(color1, color2, factor) {
            // Конвертируем hex в RGB
            const hex1 = color1.replace('#', '');
            const hex2 = color2.replace('#', '');
            
            const r1 = parseInt(hex1.substr(0, 2), 16);
            const g1 = parseInt(hex1.substr(2, 2), 16);
            const b1 = parseInt(hex1.substr(4, 2), 16);
            
            const r2 = parseInt(hex2.substr(0, 2), 16);
            const g2 = parseInt(hex2.substr(2, 2), 16);
            const b2 = parseInt(hex2.substr(4, 2), 16);
            
            // Смешиваем цвета
            const r = Math.round(r1 + (r2 - r1) * factor);
            const g = Math.round(g1 + (g2 - g1) * factor);
            const b = Math.round(b1 + (b2 - b1) * factor);
            
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        },
        adjustBrightness(color, factor) {
            // Конвертируем hex в RGB
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            // Применяем фактор яркости
            const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
            const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
            const newB = Math.min(255, Math.max(0, Math.round(b * factor)));
            
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        },
        nextRainbowColor() {
            if (this.selectedColor === 'rainbow') {
                this.rainbowIndex = (this.rainbowIndex + 1) % this.rainbowColors.length;
            }
        },
        selectSize(size) {
            this.selectedSize = size;
        },
        increaseSize() {
            const currentIndex = this.brushSizes.indexOf(this.selectedSize);
            if (currentIndex < this.brushSizes.length - 1) {
                this.selectedSize = this.brushSizes[currentIndex + 1];
            }
        },
        decreaseSize() {
            const currentIndex = this.brushSizes.indexOf(this.selectedSize);
            if (currentIndex > 0) {
                this.selectedSize = this.brushSizes[currentIndex - 1];
            }
        },
        toggleToolbar() {
            this.toolbarOpen = !this.toolbarOpen;
        },
        selectTool(tool) {
            this.currentTool = tool;
            this.updateCursor();
            // Сбрасываем позицию мыши при смене инструмента
            this.lastX = 0;
            this.lastY = 0;
        },
        updateCursor() {
            this.canvas.style.cursor = this.currentTool === 'eraser' ? 'grab' : 'crosshair';
        },
        startDrawing(e) {
            // Проверяем, включено ли рисование
            if (!this.drawingEnabled) {
                return;
            }
            
            this.isDrawing = true;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Начинаем новую линию
            this.saveState();
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.lastX = x;
            this.lastY = y;
        },
        draw(e) {
            // Проверяем, включено ли рисование
            if (!this.drawingEnabled) {
                return;
            }
            
            // Рисуем только если мышь нажата
            if (!this.isDrawing) {
                return;
            }
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.drawLine(x, y);
        },
        stopDrawing() {
            // Завершаем рисование
            this.isDrawing = false;
            this.lastX = 0;
            this.lastY = 0;
        },
        drawLine(x, y) {
            if (this.currentTool === 'eraser') {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineWidth = this.selectedSize * 2;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.strokeStyle = 'rgba(0,0,0,1)';
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            } else {
                // Получаем текущий цвет (может быть радужным)
                const currentColor = this.getCurrentColor();
                
                // Настраиваем стиль для рисования
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.lineWidth = this.selectedSize;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.shadowBlur = 0;
                this.ctx.globalAlpha = 1;
                
                // Рисуем сегмент линии с текущим цветом
                this.ctx.strokeStyle = currentColor;
                this.ctx.beginPath();
                this.ctx.moveTo(this.lastX, this.lastY);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
                
                // Переключаем цвет радуги для следующего сегмента
                if (this.selectedColor === 'rainbow' && Math.random() < 0.3) {
                    this.nextRainbowColor();
                }
            }
            
            this.lastX = x;
            this.lastY = y;
        },
        clearCanvas() {
            this.saveState(); // Сохраняем состояние перед очисткой
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        },
        disableDrawing() {
            if (this.drawingEnabled) {
                // Отключаем рисование и очищаем холст
                this.drawingEnabled = false;
                this.saveState(); // Сохраняем состояние перед очисткой
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Меняем курсор
                this.canvas.style.cursor = 'not-allowed';
                
                // Показываем уведомление
                alert('Кисть отключена! Все рисование удалено.');
            } else {
                // Включаем рисование обратно
                this.drawingEnabled = true;
                this.updateCursor();
                alert('Кисть включена! Можно рисовать снова.');
            }
        },
        
        initSteps() {
            // Добавляем интерактивность для карточек этапов
            this.$nextTick(() => {
                const stepInputs = document.querySelectorAll('.step__input');
                
                stepInputs.forEach((input) => {
                    input.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            // Закрываем все другие открытые карточки
                            stepInputs.forEach((otherInput) => {
                                if (otherInput !== e.target) {
                                    otherInput.checked = false;
                                }
                            });
                        }
                    });
                });
                
                // Добавляем анимацию появления карточек
                const steps = document.querySelectorAll('.step');
                steps.forEach((step, index) => {
                    step.style.opacity = '0';
                    step.style.transform = 'translateY(30px)';
                    
                    setTimeout(() => {
                        step.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                        step.style.opacity = '1';
                        step.style.transform = 'translateY(0)';
                    }, index * 150);
                });
            });
        }
    }
}).mount('#app');
