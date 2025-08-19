// Document Scanner PWA - Main Application Logic

class DocumentScanner {
    constructor() {
        this.stream = null;
        this.capturedImages = [];
        this.currentFilter = 'original';
        this.facingMode = 'environment'; // Back camera
        this.init();
    }

    init() {
        this.bindEvents();
        this.registerServiceWorker();
    }

    bindEvents() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('capture').addEventListener('click', () => this.captureImage());
        document.getElementById('switchCamera').addEventListener('click', () => this.switchCamera());
        document.getElementById('downloadPDF').addEventListener('click', () => this.generatePDF());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    async startCamera() {
        try {
            this.showLoading(true);

            // Stop existing stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            const video = document.getElementById('camera');
            video.srcObject = this.stream;

            // Show camera controls
            document.getElementById('startCamera').style.display = 'none';
            document.getElementById('capture').style.display = 'inline-flex';
            document.getElementById('switchCamera').style.display = 'inline-flex';
            document.getElementById('filters').style.display = 'flex';

            this.showStatus('Camera started successfully!', 'success');

        } catch (error) {
            console.error('Camera error:', error);
            this.showStatus('Camera access denied or not available', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        await this.startCamera();
    }

    captureImage() {
        try {
            this.showLoading(true);

            const video = document.getElementById('camera');
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size to video size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Apply current filter
            this.applyFilter(ctx, canvas.width, canvas.height);

            // Convert to data URL
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);

            // Add to captured images
            this.capturedImages.push({
                id: Date.now(),
                dataURL: dataURL,
                filter: this.currentFilter
            });

            this.updatePreview();
            this.showStatus(`Page ${this.capturedImages.length} captured!`, 'success');

        } catch (error) {
            console.error('Capture error:', error);
            this.showStatus('Failed to capture image', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    applyFilter(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        switch (this.currentFilter) {
            case 'grayscale':
                this.applyGrayscale(data);
                break;
            case 'blackwhite':
                this.applyBlackWhite(data);
                break;
            case 'enhance':
                this.applyEnhancement(data);
                break;
            default:
                // Original - no filter
                break;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    applyGrayscale(data) {
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;     // Red
            data[i + 1] = gray; // Green
            data[i + 2] = gray; // Blue
        }
    }

    applyBlackWhite(data) {
        const threshold = 128;
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const bw = gray > threshold ? 255 : 0;
            data[i] = bw;     // Red
            data[i + 1] = bw; // Green
            data[i + 2] = bw; // Blue
        }
    }

    applyEnhancement(data) {
        const contrast = 1.5;
        const brightness = 10;

        for (let i = 0; i < data.length; i += 4) {
            // Convert to grayscale first
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

            // Apply contrast and brightness
            let enhanced = ((gray - 128) * contrast) + 128 + brightness;
            enhanced = Math.max(0, Math.min(255, enhanced));

            data[i] = enhanced;     // Red
            data[i + 1] = enhanced; // Green
            data[i + 2] = enhanced; // Blue
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    }

    updatePreview() {
        const previewSection = document.getElementById('previewSection');
        const previewGrid = document.getElementById('previewGrid');
        const pageCount = document.getElementById('pageCount');

        if (this.capturedImages.length === 0) {
            previewSection.style.display = 'none';
            return;
        }

        previewSection.style.display = 'block';
        pageCount.textContent = `${this.capturedImages.length} page${this.capturedImages.length === 1 ? '' : 's'}`;

        // Clear and rebuild preview grid
        previewGrid.innerHTML = '';

        this.capturedImages.forEach((image, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';

            previewItem.innerHTML = `
                <img src="${image.dataURL}" alt="Page ${index + 1}">
                <button class="delete-btn" onclick="scanner.deleteImage(${image.id})">×</button>
            `;

            previewGrid.appendChild(previewItem);
        });
    }

    deleteImage(id) {
        this.capturedImages = this.capturedImages.filter(img => img.id !== id);
        this.updatePreview();
        this.showStatus('Page deleted', 'info');
    }

    clearAll() {
        if (confirm('Are you sure you want to delete all scanned pages?')) {
            this.capturedImages = [];
            this.updatePreview();
            this.showStatus('All pages cleared', 'info');
        }
    }

    async generatePDF() {
        if (this.capturedImages.length === 0) {
            this.showStatus('No pages to convert to PDF', 'error');
            return;
        }

        try {
            this.showLoading(true);

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();

            for (let i = 0; i < this.capturedImages.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                const image = this.capturedImages[i];

                // Calculate image dimensions to fit page
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 10;

                const maxWidth = pageWidth - (2 * margin);
                const maxHeight = pageHeight - (2 * margin);

                // Add image to PDF
                pdf.addImage(
                    image.dataURL,
                    'JPEG',
                    margin,
                    margin,
                    maxWidth,
                    maxHeight
                );
            }

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `document-scan-${timestamp}.pdf`;

            // Save PDF
            pdf.save(filename);

            this.showStatus(`PDF saved as ${filename}`, 'success');

        } catch (error) {
            console.error('PDF generation error:', error);
            this.showStatus('Failed to generate PDF', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.classList.toggle('show', show);
    }
}

// Initialize the app
const scanner = new DocumentScanner();

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && scanner.stream) {
        // Pause camera when page is hidden
        scanner.stream.getTracks().forEach(track => track.enabled = false);
    } else if (!document.hidden && scanner.stream) {
        // Resume camera when page is visible
        scanner.stream.getTracks().forEach(track => track.enabled = true);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (scanner.stream) {
        scanner.stream.getTracks().forEach(track => track.stop());
    }
});

// Install prompt for PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install button or banner
    const installBanner = document.createElement('div');
    installBanner.innerHTML = `
        <div style="position: fixed; bottom: 20px; left: 20px; right: 20px; background: #007AFF; color: white; padding: 15px; border-radius: 10px; text-align: center; z-index: 1000;">
            <p style="margin: 0 0 10px 0;">Install Document Scanner for offline use!</p>
            <button onclick="installApp()" style="background: white; color: #007AFF; border: none; padding: 8px 16px; border-radius: 5px; font-weight: 600;">Install</button>
            <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; color: white; border: 1px solid white; padding: 8px 16px; border-radius: 5px; margin-left: 10px;">Later</button>
        </div>
    `;
    document.body.appendChild(installBanner);
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
        });
    }
}