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

    async captureImage() {
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

            // Detect document boundaries
            const documentCorners = await this.detectDocumentEdges(canvas);

            let processedDataURL;

            if (documentCorners) {
                // Crop and perspective correct the document
                processedDataURL = this.cropAndCorrectDocument(canvas, documentCorners);
                this.showStatus('Document detected and cropped!', 'success');
            } else {
                // Fallback: try to detect largest rectangle or use center crop
                processedDataURL = this.smartCrop(canvas);
                this.showStatus('Auto-cropped to document area', 'info');
            }

            // Apply current filter to the cropped image
            const filteredDataURL = await this.applyFilterToImage(processedDataURL);

            // Add to captured images
            this.capturedImages.push({
                id: Date.now(),
                dataURL: filteredDataURL,
                originalDataURL: processedDataURL,
                filter: this.currentFilter,
                corners: documentCorners
            });

            this.updatePreview();

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

    // Advanced document detection using edge detection
    async detectDocumentEdges(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Convert to grayscale for edge detection
        const grayData = this.convertToGrayscale(imageData);

        // Apply Gaussian blur to reduce noise
        const blurredData = this.gaussianBlur(grayData, canvas.width, canvas.height);

        // Apply Canny edge detection
        const edges = this.cannyEdgeDetection(blurredData, canvas.width, canvas.height);

        // Find contours and detect rectangles
        const rectangles = this.findRectangularContours(edges, canvas.width, canvas.height);

        if (rectangles.length > 0) {
            // Return the largest rectangle (most likely to be the document)
            return rectangles[0];
        }

        return null;
    }

    convertToGrayscale(imageData) {
        const data = imageData.data;
        const grayData = new Uint8ClampedArray(imageData.width * imageData.height);

        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            grayData[i / 4] = gray;
        }

        return grayData;
    }

    gaussianBlur(data, width, height) {
        // Simple 3x3 Gaussian kernel
        const kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];
        const kernelSum = 16;

        const result = new Uint8ClampedArray(data.length);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = (y + ky) * width + (x + kx);
                        sum += data[pixelIndex] * kernel[ky + 1][kx + 1];
                    }
                }

                result[y * width + x] = sum / kernelSum;
            }
        }

        return result;
    }

    cannyEdgeDetection(data, width, height) {
        // Simplified Canny edge detection
        const sobelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];

        const sobelY = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];

        const edges = new Uint8ClampedArray(data.length);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = (y + ky) * width + (x + kx);
                        gx += data[pixelIndex] * sobelX[ky + 1][kx + 1];
                        gy += data[pixelIndex] * sobelY[ky + 1][kx + 1];
                    }
                }

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = magnitude > 50 ? 255 : 0; // Threshold
            }
        }

        return edges;
    }

    findRectangularContours(edges, width, height) {
        // Find potential document corners using Hough transform approximation
        const rectangles = [];
        const minArea = (width * height) * 0.1; // Minimum 10% of image area

        // Scan for rectangular regions
        for (let y = 0; y < height - 100; y += 20) {
            for (let x = 0; x < width - 100; x += 20) {
                const rect = this.findRectangleAt(edges, width, height, x, y);
                if (rect && this.calculateArea(rect) > minArea) {
                    rectangles.push(rect);
                }
            }
        }

        // Sort by area (largest first)
        rectangles.sort((a, b) => this.calculateArea(b) - this.calculateArea(a));

        return rectangles;
    }

    findRectangleAt(edges, width, height, startX, startY) {
        // Simplified rectangle detection
        // Look for four corners that form a reasonable rectangle

        const searchRadius = 50;
        const corners = [];

        // Find potential corners in the area
        for (let y = Math.max(0, startY - searchRadius); y < Math.min(height, startY + searchRadius); y++) {
            for (let x = Math.max(0, startX - searchRadius); x < Math.min(width, startX + searchRadius); x++) {
                if (edges[y * width + x] > 0) {
                    if (this.isCornerPoint(edges, width, height, x, y)) {
                        corners.push({ x, y });
                    }
                }
            }
        }

        if (corners.length >= 4) {
            // Find the four corners that form the largest rectangle
            return this.findBestRectangle(corners);
        }

        return null;
    }

    isCornerPoint(edges, width, height, x, y) {
        // Check if this point could be a corner by examining surrounding pixels
        let edgeCount = 0;
        const radius = 3;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (edges[ny * width + nx] > 0) {
                        edgeCount++;
                    }
                }
            }
        }

        return edgeCount >= 3; // Minimum edge pixels to be considered a corner
    }

    findBestRectangle(corners) {
        // Simple approach: find corners that form the largest quadrilateral
        if (corners.length < 4) return null;

        // Sort corners to form a rectangle (top-left, top-right, bottom-right, bottom-left)
        corners.sort((a, b) => a.y - b.y || a.x - b.x);

        const topLeft = corners[0];
        const topRight = corners.find(c => c.y < corners[corners.length / 2].y && c.x > topLeft.x) || corners[1];
        const bottomRight = corners[corners.length - 1];
        const bottomLeft = corners.find(c => c.y > corners[corners.length / 2].y && c.x < bottomRight.x) || corners[corners.length - 2];

        return [topLeft, topRight, bottomRight, bottomLeft];
    }

    calculateArea(corners) {
        if (!corners || corners.length < 4) return 0;

        // Calculate area using shoelace formula
        let area = 0;
        for (let i = 0; i < corners.length; i++) {
            const j = (i + 1) % corners.length;
            area += corners[i].x * corners[j].y;
            area -= corners[j].x * corners[i].y;
        }
        return Math.abs(area) / 2;
    }

    cropAndCorrectDocument(canvas, corners) {
        const ctx = canvas.getContext('2d');

        // Create a new canvas for the corrected document
        const correctedCanvas = document.createElement('canvas');
        const correctedCtx = correctedCanvas.getContext('2d');

        // Standard document aspect ratio (A4: 210/297 ≈ 0.707)
        const aspectRatio = 0.707;
        const outputWidth = 800;
        const outputHeight = outputWidth / aspectRatio;

        correctedCanvas.width = outputWidth;
        correctedCanvas.height = outputHeight;

        // Apply perspective correction using transformation matrix
        this.applyPerspectiveCorrection(ctx, correctedCtx, corners, outputWidth, outputHeight);

        return correctedCanvas.toDataURL('image/jpeg', 0.9);
    }

    applyPerspectiveCorrection(sourceCtx, destCtx, corners, destWidth, destHeight) {
        // Simplified perspective correction
        // Map the detected corners to a rectangle

        const [topLeft, topRight, bottomRight, bottomLeft] = corners;

        // Create transformation matrix for perspective correction
        // This is a simplified version - in production, you'd use a proper perspective transform

        const sourceImageData = sourceCtx.getImageData(0, 0, sourceCtx.canvas.width, sourceCtx.canvas.height);
        const destImageData = destCtx.createImageData(destWidth, destHeight);

        // Bilinear interpolation for perspective correction
        for (let y = 0; y < destHeight; y++) {
            for (let x = 0; x < destWidth; x++) {
                // Map destination coordinates to source coordinates
                const u = x / destWidth;
                const v = y / destHeight;

                // Bilinear interpolation of corner positions
                const sourceX = Math.round(
                    topLeft.x * (1 - u) * (1 - v) +
                    topRight.x * u * (1 - v) +
                    bottomRight.x * u * v +
                    bottomLeft.x * (1 - u) * v
                );

                const sourceY = Math.round(
                    topLeft.y * (1 - u) * (1 - v) +
                    topRight.y * u * (1 - v) +
                    bottomRight.y * u * v +
                    bottomLeft.y * (1 - u) * v
                );

                // Copy pixel if within bounds
                if (sourceX >= 0 && sourceX < sourceCtx.canvas.width &&
                    sourceY >= 0 && sourceY < sourceCtx.canvas.height) {

                    const sourceIndex = (sourceY * sourceCtx.canvas.width + sourceX) * 4;
                    const destIndex = (y * destWidth + x) * 4;

                    destImageData.data[destIndex] = sourceImageData.data[sourceIndex];         // R
                    destImageData.data[destIndex + 1] = sourceImageData.data[sourceIndex + 1]; // G
                    destImageData.data[destIndex + 2] = sourceImageData.data[sourceIndex + 2]; // B
                    destImageData.data[destIndex + 3] = 255; // A
                }
            }
        }

        destCtx.putImageData(destImageData, 0, 0);
    }

    smartCrop(canvas) {
        // Fallback cropping when document detection fails
        const ctx = canvas.getContext('2d');

        // Create a center crop with document-like aspect ratio
        const aspectRatio = 0.707; // A4 ratio
        const margin = 0.1; // 10% margin from edges

        const cropWidth = canvas.width * (1 - 2 * margin);
        const cropHeight = Math.min(cropWidth / aspectRatio, canvas.height * (1 - 2 * margin));
        const finalWidth = cropHeight * aspectRatio;

        const startX = (canvas.width - finalWidth) / 2;
        const startY = (canvas.height - cropHeight) / 2;

        // Create cropped canvas
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');

        croppedCanvas.width = 800; // Standard output width
        croppedCanvas.height = 800 / aspectRatio;

        // Draw cropped and scaled image
        croppedCtx.drawImage(
            canvas,
            startX, startY, finalWidth, cropHeight,
            0, 0, croppedCanvas.width, croppedCanvas.height
        );

        return croppedCanvas.toDataURL('image/jpeg', 0.9);
    }

    async applyFilterToImage(dataURL) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);
                this.applyFilter(ctx, canvas.width, canvas.height);

                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.src = dataURL;
        });
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