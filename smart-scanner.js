// Smart Document Scanner with Real Document Detection
class SmartDocumentScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.capturedImages = [];
        this.facingMode = 'environment';
        this.isDetecting = false;
        this.detectionInterval = null;
        this.lastDetectedCorners = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkBrowserSupport();
    }

    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('captureBtn').addEventListener('click', () => this.captureDocument());
        document.getElementById('switchBtn').addEventListener('click', () => this.switchCamera());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopCamera());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadPDF());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
    }

    checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showStatus('Camera not supported in this browser', 'error');
            return false;
        }
        return true;
    }

    async startCamera() {
        if (!this.checkBrowserSupport()) return;

        try {
            this.showStatus('Starting camera...', 'info');

            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 }
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => resolve();
            });

            this.video.style.display = 'block';
            this.updateUI('camera-started');

            // Start real-time document detection
            this.startDocumentDetection();

            this.showStatus('Camera ready! Point at a document', 'success');

        } catch (error) {
            console.error('Camera error:', error);
            let errorMessage = 'Camera access failed: ';

            switch (error.name) {
                case 'NotAllowedError':
                    errorMessage += 'Permission denied. Please allow camera access.';
                    break;
                case 'NotFoundError':
                    errorMessage += 'No camera found on this device.';
                    break;
                case 'NotReadableError':
                    errorMessage += 'Camera is being used by another application.';
                    break;
                default:
                    errorMessage += error.message;
            }

            this.showStatus(errorMessage, 'error');
        }
    }

    startDocumentDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }

        document.getElementById('detectionStatus').classList.remove('hidden');

        // Detect documents every 500ms
        this.detectionInterval = setInterval(() => {
            if (!this.isDetecting) {
                this.detectDocumentInRealTime();
            }
        }, 500);
    }

    async detectDocumentInRealTime() {
        if (this.isDetecting || !this.video.videoWidth) return;

        this.isDetecting = true;

        try {
            // Capture current frame
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.ctx.drawImage(this.video, 0, 0);

            // Detect document edges
            const corners = this.detectDocumentEdges();

            // Update UI overlay
            this.updateDetectionOverlay(corners);

            this.lastDetectedCorners = corners;

        } catch (error) {
            console.error('Detection error:', error);
        } finally {
            this.isDetecting = false;
        }
    }

    detectDocumentEdges() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // Convert to grayscale
        const grayData = this.convertToGrayscale(imageData);

        // Apply Gaussian blur
        const blurredData = this.gaussianBlur(grayData, this.canvas.width, this.canvas.height);

        // Edge detection
        const edges = this.sobelEdgeDetection(blurredData, this.canvas.width, this.canvas.height);

        // Find contours and rectangles
        const rectangles = this.findDocumentRectangles(edges, this.canvas.width, this.canvas.height);

        return rectangles.length > 0 ? rectangles[0] : null;
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
        const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        const kernelSum = 16;
        const result = new Uint8ClampedArray(data.length);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                let kernelIndex = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = (y + ky) * width + (x + kx);
                        sum += data[pixelIndex] * kernel[kernelIndex++];
                    }
                }

                result[y * width + x] = sum / kernelSum;
            }
        }

        return result;
    }

    sobelEdgeDetection(data, width, height) {
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        const edges = new Uint8ClampedArray(data.length);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                let kernelIndex = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = (y + ky) * width + (x + kx);
                        gx += data[pixelIndex] * sobelX[kernelIndex];
                        gy += data[pixelIndex] * sobelY[kernelIndex];
                        kernelIndex++;
                    }
                }

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = magnitude > 50 ? 255 : 0;
            }
        }

        return edges;
    }

    findDocumentRectangles(edges, width, height) {
        const rectangles = [];
        const minArea = (width * height) * 0.1; // Minimum 10% of image
        const maxArea = (width * height) * 0.8; // Maximum 80% of image

        // Find contours using flood fill
        const visited = new Array(width * height).fill(false);

        for (let y = 10; y < height - 10; y += 5) {
            for (let x = 10; x < width - 10; x += 5) {
                const index = y * width + x;

                if (edges[index] > 0 && !visited[index]) {
                    const contour = this.traceContour(edges, width, height, x, y, visited);

                    if (contour.length > 50) {
                        const corners = this.findRectangleCorners(contour);

                        if (corners && corners.length === 4) {
                            const area = this.calculatePolygonArea(corners);

                            if (area > minArea && area < maxArea && this.isValidRectangle(corners)) {
                                rectangles.push(corners);
                            }
                        }
                    }
                }
            }
        }

        // Sort by area (largest first)
        rectangles.sort((a, b) => this.calculatePolygonArea(b) - this.calculatePolygonArea(a));

        return rectangles;
    }

    traceContour(edges, width, height, startX, startY, visited) {
        const contour = [];
        const stack = [{ x: startX, y: startY }];

        while (stack.length > 0 && contour.length < 1000) {
            const { x, y } = stack.pop();
            const index = y * width + x;

            if (x < 0 || x >= width || y < 0 || y >= height || visited[index] || edges[index] === 0) {
                continue;
            }

            visited[index] = true;
            contour.push({ x, y });

            // Add 8-connected neighbors
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    stack.push({ x: x + dx, y: y + dy });
                }
            }
        }

        return contour;
    }

    findRectangleCorners(contour) {
        if (contour.length < 4) return null;

        // Find convex hull
        const hull = this.convexHull(contour);

        if (hull.length < 4) return null;

        // Approximate to quadrilateral
        return this.approximateToQuadrilateral(hull);
    }

    convexHull(points) {
        if (points.length < 3) return points;

        // Find bottom-most point
        let start = points.reduce((min, p) => p.y > min.y || (p.y === min.y && p.x < min.x) ? p : min);

        // Sort by polar angle
        const sorted = points.filter(p => p !== start).sort((a, b) => {
            const angleA = Math.atan2(a.y - start.y, a.x - start.x);
            const angleB = Math.atan2(b.y - start.y, b.x - start.x);
            return angleA - angleB;
        });

        const hull = [start];

        for (const point of sorted) {
            while (hull.length > 1 && this.crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
                hull.pop();
            }
            hull.push(point);
        }

        return hull;
    }

    crossProduct(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    approximateToQuadrilateral(hull) {
        if (hull.length <= 4) return hull;

        // Find the 4 extreme points
        const topLeft = hull.reduce((min, p) => (p.x + p.y) < (min.x + min.y) ? p : min);
        const topRight = hull.reduce((max, p) => (p.x - p.y) > (max.x - max.y) ? p : max);
        const bottomRight = hull.reduce((max, p) => (p.x + p.y) > (max.x + max.y) ? p : max);
        const bottomLeft = hull.reduce((min, p) => (p.x - p.y) < (min.x - min.y) ? p : min);

        return [topLeft, topRight, bottomRight, bottomLeft];
    }

    calculatePolygonArea(points) {
        if (points.length < 3) return 0;

        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    }

    isValidRectangle(corners) {
        if (corners.length !== 4) return false;

        // Check if angles are roughly 90 degrees
        const angles = [];
        for (let i = 0; i < 4; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % 4];
            const p3 = corners[(i + 2) % 4];

            const angle = this.calculateAngle(p1, p2, p3);
            angles.push(angle);
        }

        // Allow 30 degree tolerance for angles
        return angles.every(angle => Math.abs(angle - 90) < 30);
    }

    calculateAngle(p1, p2, p3) {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        const cos = dot / (mag1 * mag2);
        return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    }

    updateDetectionOverlay(corners) {
        const outline = document.getElementById('documentOutline');
        const guide = document.getElementById('scanGuide');
        const status = document.getElementById('detectionStatus');
        const cornerDots = [
            document.getElementById('corner1'),
            document.getElementById('corner2'),
            document.getElementById('corner3'),
            document.getElementById('corner4')
        ];

        if (corners && corners.length === 4) {
            // Document detected
            const videoRect = this.video.getBoundingClientRect();
            const scaleX = videoRect.width / this.video.videoWidth;
            const scaleY = videoRect.height / this.video.videoHeight;

            // Calculate bounding box
            const minX = Math.min(...corners.map(c => c.x)) * scaleX;
            const maxX = Math.max(...corners.map(c => c.x)) * scaleX;
            const minY = Math.min(...corners.map(c => c.y)) * scaleY;
            const maxY = Math.max(...corners.map(c => c.y)) * scaleY;

            // Show document outline
            outline.style.left = `${minX}px`;
            outline.style.top = `${minY}px`;
            outline.style.width = `${maxX - minX}px`;
            outline.style.height = `${maxY - minY}px`;
            outline.classList.add('detected');

            // Show corner dots
            corners.forEach((corner, index) => {
                if (cornerDots[index]) {
                    cornerDots[index].style.left = `${corner.x * scaleX}px`;
                    cornerDots[index].style.top = `${corner.y * scaleY}px`;
                    cornerDots[index].classList.add('visible');
                }
            });

            // Update status
            status.textContent = '✅ Document detected - Ready to scan!';
            status.className = 'detection-status detected';
            guide.classList.add('hidden');

        } else {
            // No document detected
            outline.classList.remove('detected');
            cornerDots.forEach(dot => dot.classList.remove('visible'));

            status.textContent = '🔍 Looking for document...';
            status.className = 'detection-status scanning';
            guide.classList.remove('hidden');
        }
    }

    async captureDocument() {
        try {
            this.showStatus('Capturing document...', 'info');

            // Capture current frame
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.ctx.drawImage(this.video, 0, 0);

            let processedImage;

            if (this.lastDetectedCorners) {
                // Crop and correct perspective
                processedImage = this.cropAndCorrectDocument(this.lastDetectedCorners);
                this.showStatus('Document detected and cropped perfectly!', 'success');
            } else {
                // Fallback: center crop with document aspect ratio
                processedImage = this.smartCrop();
                this.showStatus('Document captured with smart crop', 'info');
            }

            // Add to captured images
            const imageData = {
                id: Date.now(),
                dataURL: processedImage,
                timestamp: new Date().toLocaleString(),
                hasDetection: !!this.lastDetectedCorners
            };

            this.capturedImages.push(imageData);
            this.updatePreview();

        } catch (error) {
            console.error('Capture error:', error);
            this.showStatus('Failed to capture document: ' + error.message, 'error');
        }
    }

    cropAndCorrectDocument(corners) {
        // Create output canvas with A4 aspect ratio
        const outputCanvas = document.createElement('canvas');
        const outputCtx = outputCanvas.getContext('2d');

        const aspectRatio = 210 / 297; // A4 width/height
        const outputWidth = 800;
        const outputHeight = outputWidth / aspectRatio;

        outputCanvas.width = outputWidth;
        outputCanvas.height = outputHeight;

        // Apply perspective correction
        this.applyPerspectiveCorrection(corners, outputCtx, outputWidth, outputHeight);

        return outputCanvas.toDataURL('image/jpeg', 0.9);
    }

    applyPerspectiveCorrection(corners, destCtx, destWidth, destHeight) {
        const sourceImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const destImageData = destCtx.createImageData(destWidth, destHeight);

        // Sort corners: top-left, top-right, bottom-right, bottom-left
        const sortedCorners = this.sortCornersForPerspective(corners);

        for (let y = 0; y < destHeight; y++) {
            for (let x = 0; x < destWidth; x++) {
                const u = x / destWidth;
                const v = y / destHeight;

                // Bilinear interpolation
                const sourceX = Math.round(
                    sortedCorners[0].x * (1 - u) * (1 - v) +
                    sortedCorners[1].x * u * (1 - v) +
                    sortedCorners[2].x * u * v +
                    sortedCorners[3].x * (1 - u) * v
                );

                const sourceY = Math.round(
                    sortedCorners[0].y * (1 - u) * (1 - v) +
                    sortedCorners[1].y * u * (1 - v) +
                    sortedCorners[2].y * u * v +
                    sortedCorners[3].y * (1 - u) * v
                );

                if (sourceX >= 0 && sourceX < this.canvas.width &&
                    sourceY >= 0 && sourceY < this.canvas.height) {

                    const sourceIndex = (sourceY * this.canvas.width + sourceX) * 4;
                    const destIndex = (y * destWidth + x) * 4;

                    destImageData.data[destIndex] = sourceImageData.data[sourceIndex];
                    destImageData.data[destIndex + 1] = sourceImageData.data[sourceIndex + 1];
                    destImageData.data[destIndex + 2] = sourceImageData.data[sourceIndex + 2];
                    destImageData.data[destIndex + 3] = 255;
                }
            }
        }

        destCtx.putImageData(destImageData, 0, 0);

        // Apply document enhancement
        this.enhanceDocument(destCtx, destWidth, destHeight);
    }

    sortCornersForPerspective(corners) {
        // Sort to: top-left, top-right, bottom-right, bottom-left
        const topLeft = corners.reduce((min, p) => (p.x + p.y) < (min.x + min.y) ? p : min);
        const bottomRight = corners.reduce((max, p) => (p.x + p.y) > (max.x + max.y) ? p : max);
        const topRight = corners.reduce((max, p) => (p.x - p.y) > (max.x - max.y) ? p : max);
        const bottomLeft = corners.reduce((min, p) => (p.x - p.y) < (min.x - min.y) ? p : min);

        return [topLeft, topRight, bottomRight, bottomLeft];
    }

    smartCrop() {
        // Center crop with A4 aspect ratio
        const aspectRatio = 210 / 297;
        const margin = 0.1;

        const cropWidth = this.canvas.width * (1 - 2 * margin);
        const cropHeight = Math.min(cropWidth / aspectRatio, this.canvas.height * (1 - 2 * margin));
        const finalWidth = cropHeight * aspectRatio;

        const startX = (this.canvas.width - finalWidth) / 2;
        const startY = (this.canvas.height - cropHeight) / 2;

        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');

        croppedCanvas.width = 800;
        croppedCanvas.height = 800 / aspectRatio;

        croppedCtx.drawImage(
            this.canvas,
            startX, startY, finalWidth, cropHeight,
            0, 0, croppedCanvas.width, croppedCanvas.height
        );

        // Apply document enhancement
        this.enhanceDocument(croppedCtx, croppedCanvas.width, croppedCanvas.height);

        return croppedCanvas.toDataURL('image/jpeg', 0.9);
    }

    enhanceDocument(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Apply contrast and brightness enhancement
        const contrast = 1.3;
        const brightness = 15;

        for (let i = 0; i < data.length; i += 4) {
            // Apply contrast and brightness
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness));
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness));
        }

        ctx.putImageData(imageData, 0, 0);
    }

    async switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        await this.startCamera();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        this.video.style.display = 'none';
        this.updateUI('camera-stopped');
        this.showStatus('Camera stopped', 'info');
    }

    updatePreview() {
        const previewSection = document.getElementById('previewSection');
        const previewGrid = document.getElementById('previewGrid');
        const pageCount = document.getElementById('pageCount');

        if (this.capturedImages.length === 0) {
            previewSection.classList.add('hidden');
            return;
        }

        previewSection.classList.remove('hidden');
        pageCount.textContent = this.capturedImages.length;
        previewGrid.innerHTML = '';

        this.capturedImages.forEach((image, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';

            const detectionBadge = image.hasDetection ?
                '<div style="position:absolute;top:2px;left:2px;background:rgba(0,255,0,0.8);color:white;font-size:10px;padding:2px 4px;border-radius:3px;">✓</div>' : '';

            previewItem.innerHTML = `
                ${detectionBadge}
                <img src="${image.dataURL}" alt="Document ${index + 1}" loading="lazy">
                <button class="delete-btn" onclick="scanner.deleteImage(${image.id})">×</button>
            `;

            previewGrid.appendChild(previewItem);
        });
    }

    deleteImage(id) {
        this.capturedImages = this.capturedImages.filter(img => img.id !== id);
        this.updatePreview();
        this.showStatus('Document deleted', 'info');
    }

    clearAll() {
        if (this.capturedImages.length === 0) return;

        if (confirm(`Delete all ${this.capturedImages.length} captured documents?`)) {
            this.capturedImages = [];
            this.updatePreview();
            this.showStatus('All documents cleared', 'info');
        }
    }

    async downloadPDF() {
        if (this.capturedImages.length === 0) {
            this.showStatus('No documents to download', 'error');
            return;
        }

        try {
            this.showStatus('Generating PDF...', 'info');

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();

            for (let i = 0; i < this.capturedImages.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                const image = this.capturedImages[i];
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 10;

                const maxWidth = pageWidth - (2 * margin);
                const maxHeight = pageHeight - (2 * margin);

                pdf.addImage(
                    image.dataURL,
                    'JPEG',
                    margin,
                    margin,
                    maxWidth,
                    maxHeight
                );
            }

            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `smart-scan-${timestamp}.pdf`;

            pdf.save(filename);

            this.showStatus(`PDF downloaded: ${filename}`, 'success');

        } catch (error) {
            console.error('PDF generation error:', error);
            this.showStatus('Failed to generate PDF: ' + error.message, 'error');
        }
    }

    updateUI(state) {
        const elements = {
            startBtn: document.getElementById('startBtn'),
            captureBtn: document.getElementById('captureBtn'),
            switchBtn: document.getElementById('switchBtn'),
            stopBtn: document.getElementById('stopBtn'),
            detectionStatus: document.getElementById('detectionStatus')
        };

        Object.values(elements).forEach(el => el.classList.add('hidden'));

        switch (state) {
            case 'camera-started':
                elements.captureBtn.classList.remove('hidden');
                elements.switchBtn.classList.remove('hidden');
                elements.stopBtn.classList.remove('hidden');
                elements.detectionStatus.classList.remove('hidden');
                break;
            case 'camera-stopped':
            default:
                elements.startBtn.classList.remove('hidden');
                break;
        }
    }

    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.classList.remove('hidden');

        setTimeout(() => {
            status.classList.add('hidden');
        }, 4000);
    }
}

// Initialize the smart scanner
const scanner = new SmartDocumentScanner();

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && scanner.stream) {
        scanner.stream.getTracks().forEach(track => track.enabled = false);
        if (scanner.detectionInterval) {
            clearInterval(scanner.detectionInterval);
        }
    } else if (!document.hidden && scanner.stream) {
        scanner.stream.getTracks().forEach(track => track.enabled = true);
        scanner.startDocumentDetection();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (scanner.stream) {
        scanner.stream.getTracks().forEach(track => track.stop());
    }
    if (scanner.detectionInterval) {
        clearInterval(scanner.detectionInterval);
    }
});