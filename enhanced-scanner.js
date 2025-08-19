// Enhanced Document Scanner with AI-powered document detection

class SmartDocumentScanner {
    constructor() {
        this.stream = null;
        this.capturedImages = [];
        this.currentFilter = 'original';
        this.facingMode = 'environment';
        this.isDetecting = false;
        this.detectionInterval = null;
        this.init();
    }

    init() {
     vents();
  er();
    }

    bindEvents() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('
        document.getElementById('switchCamera').addEvent;
    
        document.l());

        // Filter buttons
        do
            
        });
 }

    aker() {
        if ('serviceWorker' in navigator)
            try {
     w.js');
                console.log('Service Worker registered');
            } catch (eor) {
                console.log('Service Worker registration faror);
            }

    }

    async startCamera() {
        try {
            this.showLoading(true);
            
            if (this.stream) {
                this.stream.getTracks().
            }

            this.stream = await navigator.mediaDev({
                video: {
          ode,
                    width: { ideal: 1920 },
                    h
   }


            const video = document.getEleme
            video.srcObject = this.stream;

     ls
';
            documen-flex';
            document.getElementById('swit';
            document.g;
           lock';

            // Start continuous document de
            this.startDocumentDetection();

            this.showS;
     
        }) {
    or);
            this.showStatus('Camera accesor');
        } filly {
            this.showLoading(false);
        }
    }

    async switchCamera() {
      ;
        await this.startCamera();


    startDocumentDetection() {
ction
     al) {
            clearInt
        }

        // Start detecting docume 500ms
        this.detectionInterval = setInt {
            if (!this.i
                this.det;
            }
        }, 500);
    }

    async det
        if (this.isDetectin
        
        this.isDetecting = true;
        

            conmera');
            const canvas = docu);
            const ctx = canvas

eo size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            if (canvas.width === 0 || c) {
   se;
                return;
    

            // Draw current video frame
            ctx.drawImage(video, 0, 0, canvas

 edges
     
            
            // Update UI overlay
            this.updateDetection

        } catch (error) {
            cons
        {
e;
        }
    }

    upda {
      ay');
     
        const
        const status = document.getE
        const corners = [
            d,
            document.getElementById('corner2'),
            document.getElementById('corner3'),
            document.getElementById4')
        ];

        if (corners && corners.length === 4) {
            // Document detected - show frame and rners
ra');
            const videoRect = video.t();

            const scaleY = videoRect.height / video.videoHeight;

x
    leX;
            const maxX = M;
            const minY = Math.min(...corners.map(;
            const maxY = Math.max(...corners;

            // Show document frame
            frame.style.left = `${minX}px`;
            frame.style.top = `${minY}px`;
            framex`;
nY}px`;
    ');

            // rkers
            corners.forEach((corner, index) => {
                if (cornerMarkers[index]) {
  x`;
                    cornerMarkersx`;
                    corner');
}
  

            // Update status
            status.textContent = '✅ Document
            status.className = ted';
     den');

        } else {
            // No document detected
            frame.classList.remove('detected');
     ));
            
            status.textContent = ..';
            status.className =ng';
idden');
        }
    }

    async captureImage() {
        try {
            this.showLoading(true);

            const video = document.getElementById('camer);
            const canvas = documnvas');
            const;


   
            ctx.drawImage(video, 0, 0;

            // Detecdaries
            const documentCorners = await this.detectDocumentEdges(canvas);
            
            let processedDataURL;
   
           
                // Crop and pument

          ess');
            } else {
        
                processevas);
                this.showStatus('Auto-cropped to do
            }

            // Apply current filter
            const filteredDataURL = aataURL);
            
            this.capturedImages.push({
                id: Date.now(),
                dataURL: filteredDataURL,
RL,
                filter: tter,
                corners: documentCorners
            });

     iew();

        } catch (error) {
            conr);
            this.showStatus('Failed to capture image', '
        } finally {
            this.showLoading(false);
        }
    }

    // Advanced document detection using computon
    async detectDo {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, c);
        
        // Convert to grayscale
        const grayData = this.convertToGrayscale(imageData);
        

        coeight);
        
        // Apptection
        co
        
        // Find rectangular contours
        const rectanglesheight);
        
  
            return rectangles[0]; // Return the best r
        }
        
        return null;
    }

    convertToGrayscale(imageData) {
        const data = imageData.data;
        c);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.58 0.114;
          ay;
        }
        
        return grayData;
    }

    ga{
        const kernel = [
          2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];
        const kernelSum = 16;
        
        const result = new Uint8ClampedArray(data.length);
        
        for (let y = 1; y < height - 1; y++) {
    {
                let = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -{
                        const pixelIndex = (y + ky) * width + (x + kx);
                        sum += data[pixelIndex] *1];
 }
   }
                
     elSum;
            }
   
        
        return result;
    }

    cannyEdgeDetection(data, width, height) {
        const 1]];
        const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
        
        constngth);
        
        for (let y = 1; y < height - 1; y++) {
            for (lex++) {
               = 0;
                
                for (let ky = -1; ky <= 1; k{
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = (y + ky) * wix);
                        gx += data[pixelI + 1];
                  + 1];
                    }
                }
                
                const magnitude = Math.sqrt(gx * g);
                edges[y * width + x] = magnitude > 50 ? 255 : 0;
            }
        }
        
        return edges;
    }

    findRectangularContours(edges, width, height) {
    [];
        const minArea = (width * height) * 0.05; // Minimum 5% of image area
        const maxArea = (width * height) * 0.8;  // Maximum 
        
        // Use a more sophisticated approach to find rectangles
        const contours = this.findContours(edges, width, height);
        
        s) {
 our);
            
        4) {
                const area = this.calculatePolygonArea(approx);
                
        
                    // Check if it's rolar
                    if (this.isRoughlyRectangox)) {
         ox);
                    }
                }
            }
        }
        
        // Sort by area (largest first)
        rectangles.sort((a, b) => this.calculatePolygonArea(b) - t
        
      ngles;
    }


        // S
        const contours = [];
        const visited = new Array(widte);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const index = y * width +;
                
                if (edges[index] > 0 && !visited[index]) {
                    const contour = this.trac
                    if (conntour size
;
                    }
                }
            }
        }
        
        return contours;
    }

    traceContour(edges, width, height, startX, sta {
        const contour = [];
        const stack = [{x: startX, y: sta];
        
        while (stack.length 0) {
            const {x, y} = stack.pop();
            
            
            if (x < 0 || x >= width || 
tinue;
       }
            
            visited[rue;
            contour.push({x, y});
            
            // Add 8-connected neighbors
            for (let dy = -1; dy <= 1; dy++) {
                for
      ue;
                    stack.push({x: x +});
                }
 }
        }
     
        return contour;
    }

    approximateContour(contour) {
        // Douglas-Peucker alged
      our;
        
        // Find the convex hull first
        const hull = this.con;
        
possible
        if (hull.le 4) {
            return this.reduceToQuadrilateral(hull)
        }
        
        return
    }

    convexHull(pos) {
        // Graham scaithm
        if (points.length < 3) return points;
        
        // Find the bottom-most point
        let start = p;
        
        // Sort points by polar angle
        const sorted = points.filter(p => p !== start).{
            const angleA = Math.atan2(a.y - start.y, a.x - start.x);
            const angleB = Math.atan2(b.y - start.y, btart.x);
            return angleA - angleB;
        });
        
        const hull = [start];
        
        for (const point of sorted) {
       {
                hull.pop();
            }
   
     
        
        return hull;
    }

    crossPro a, b) {
     );
    }

    reducull) {
        if (hull.lengl;
        
        // Find the 4 cornerlateral
        le;
        let bestQuad = hull.slic
    
        // Try diff
        for (let i = 0; i < h i++) {
            for (let j = i + 1; j < hull.length; j++) {
                for (let k = j + 1; k < hull.length; k++) {
                    for (let l = k + 1; l < hull.length; l++) {
                        const quad = [ll[l]];
        d);
                        
                        if{
         a;
                            bestQuad = quad;
                        }
                    }
                }
      }
        }
      
    e order
        return this.sortCornersClockwise(bestQuad);
    }

    so) {
        // Find center point
        const centerX = corners.reduce((sth;
        length;
        
        // Sort by angle from center
        return corner b) => {
enterX);
        X);
            return agleB;
        });
    }

    calculatePos) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.lengthi++) {
            const j = (i + 1) % points.l
         .y;
            area -= points[j].x *s[i].y;
        }
        return Mat/ 2;
   }

    isRoughlyRectangular(corners) {
  e;
        
        // Check if angles are roughly 90 degrees
        const angles = ;
      i++) {
            const p1 = corners[i];
            const p2 = corners;
            const p3 = corners[(i + 2) % 4];
    
        , p3);
            angles.push(angle);
        }
        
        )
        return angles.every < 20);
    }

    calculateAngle(p1, p2, p3) {
        const v1 = {x: p1.x - p2.x, y: p1.y - p2.y};
        const v2 = {x: p3.x - p2.x, y: p3.y - p2.y};
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.;
       
        const cos = dot / (mag1 * mag2);
        return Math.acos(Mh.PI;
    }

    cers) {

        
        s
        const outputCanvas = document.createElement('canvas');
        const outputCtx = output'2d');
        
       
  ght
        const outputWidth 
        const outputHeiatio;
        
        outputCanvas.width = outputWidth;
        outputCanvas.height = outputHeight;
        
        // Apply perspen
        this.applyPerspectiveCorrection(ctx, output);
        
        retur);
    }

    
        const sourceImageData = sourceCtx.getImageData(0, 0, sourceCtight);
        const destImageData = destCtx.createImageData(destWidth, det);
    
        // Sort corners: top-left, top-right, bottom-right, bottom-left
        const sortedCorners = this.sortCornersForPerspective(corners);
        
        for (let y = 0; y < destHeight; y++) {

     th;
                
               
       ion
                const sour
                    sortedCorners[0].x * (1 - u) * +
                    sortedCorners[1].x * u * (1 - v) +
                    sortedC
   ) * v
                );
                
                const sourceY = Math.round(
                    sortedCorners[0].y * (1 - u) * (1 - v) +
                    sortedCorners[1].y * u * (- v) +
                    sortedCorners[2].y * u * v +
                    sorte) * v
                );
                
                if (sourceX >= 0 && sourceX.width && 
                  t) {
                    
         * 4;
                    const destIndex = (y * destWidth + 4;
                    
                    destImageData.data[destIndex] ex];
;
;
                    destIma255;
   
           }
        }
        
        destCtx.putIma 0, 0);
    }

    sortCornersForPerspective(corners) {
        // Sort corners to: top-left, top-right, bottom-right, bottom-t
        const center = {
            x: corners.reduce((sum, p) => sum + h,
            y: 
        };
        
        const topLeft = corners.reduce((min, p)
    n);
        const bottomRight = corners.reduce((max, p) => 
   : max);
        const topRight = corners.re
       ;
        const bottomLeft = c
            (pp : min);
        
        return [topLeft, top;
    }

    smartCrop(canvas) {
        const ct');
         A4
 
        
        const cropWidth = canvas.width * (1 - 2 * margin);
        const cropHeight = Math.min(cropWidth / aspectargin));
      ;
        
        const startX = (canvas.wid;
        const startY = (canvas.;
 
        con
        const
        
        croppedCanva0;
        croppedCanvas.height = 800 / aspectRatio;
        
    ge(
            canvas,
            startX, startY, finalWidth, cr
          ight
        );
        
        
    }

 aURL) {
        return new Promise((resolve) => {
            const img = new Image();
             {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('');
                
                canvas.width = img.width;
t;
                
    );
                this.applyFilter(ctx, can);
                
                resolve(canvas.toDataURL('image/jpeg;
            };
            img.src = dataURL;

    }

    applyFilter(ctx, w {
        const imageData = ctx.get
        const data = imageData.data;

        switch (this.currentFilter) {
            case 'grayscale':
                this.applyGrayscale(data);
         k;
            case 'blackwhite':
                this.applyBlackWh
k;
          
                this.applyEnhancement(data);
                break;
            default:
                br;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    applyGrayscale(data) {
        for (let i = 0; += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + dat.114;
            data[i] = gray;

            data[i + 2] = gray;
        }
    }

    applyBlackWhite(data) {
        const threshold = 128;
        for (let i = 0; i < data.length; i += 4) {
* 0.114;
            const bw =;
            data[i] = bw;
            data[i +
 = bw;
        }
    }

    applyEnhancement(data) {
        const contrast = 1.5;
        const = 10;
        
        for (let i = 0; i < data.lengt{
            const gray = data[i] * 0.299 + .114;
            let enhanced =s;
ed));
            
            data[i] = enhanced;
            data[i + 1] = enhanced;
            data[i + 2d;
     }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter(btn => {
            btn.classList.remove('active');
        });
ctive');
    }

    updatePreview() {
        const previewSection = document.');
        const previewGrid = document.getElementByI;
        const pageCount = dCount');

        if (this.capturedImages.length === 0) {
            previewSection.style.display = 'none';
            return;
        }

        pock';
        pageCount.textContent = `${this.capturedImag

        previewGrid.innerHTML = '';

        this.capturedImages.forEach((image, index) => {
            const previewItem = docum
;
         
            previewItem.innerHTML = `
                <img src="${image.da">
                <button class="delete-btn" onclick="scanner.utton>
            `;
            
            previewGrid.appendChild(previewItem);
        });
    }

    deleteImage(id) {

        this();
     o');
    }

    clearAll() {
        if (confirm('Are yes?')) {
  [];
            this.updatePreview();
            this.showStatus('All p
     }
    }

  () {
        if (this.capturedImages.length === 0) {
            this.showStatus('No p);

        }

        try {
            this.showLoading(true);
 
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();

{
                if (i > 0) {
                    pdf.addPage();
                }

         [i];
                const pageWi
                c
                const margin = 10;
                
);
            
                
                pdddImage(
                    image.dataURL, 
                    'JPEG', 
                    margin, 
                    margin, 
 
           
                );
            }

            const timestamp = new D);
;

            pdf.save(filename);
            
            this.showSta

    
           
            this.showStatus('F'error');
        } finally {
            this.showLoading(false);
        }
    }

    showStatus(message, type) {

        status.textContent = message;
        status.className = `status ${type}
;

        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

ng(show) {
        const loading = document.getElementByIng');
        loading.classList.toggle('show', show);
    }
}

// Initialize the enhanced 
const scanner = new SmartDocumentScanner();

// Handle page visibilites
document.addEventListener('visibilitychange', () => {
eam) {
        scanner.s;
        if (scanner.detectionInterval) {
            clearInterval(scanner.
        }
    } else if (!document.hidden && m) {
        sca;
        scanner.star();
    }
});

// Handle pad
window.addEventListener('beforeunload', () => {
    if (scanner.stream) {
        scanner.stream.getTracks().forEach(track 
    }
    if (scanner.detectionIal) {
        clearInterval(scanner.detectionIn
    }


// Pt
let deferredPrompt;

window.addEventListener('before
Default();
    deferredPrompt = e;
    
    const installBanner = document.createElement('div');
    installBanner.innerHTML = `
        <div style="position: fixed; bottom: 20px; left: 20px; right: 20px; background: #007AFF; color;">
            <p ste!</p>
>
     n>
        </div>
    `;
    document.er);
});

function inst
    if (deferredPrompt) {
        deferredPro
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome 
                console.log('User act');
            }
            deferre
        });
  }
}