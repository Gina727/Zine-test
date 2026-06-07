pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let currentPageFlip = null; // Track active page-flip instance

// Attach event listeners to all books on the shelf
document.querySelectorAll('.book-item').forEach(book => {
    book.addEventListener('click', function() {
        const pdfUrl = this.getAttribute('data-pdf');
        openBook(pdfUrl);
    });
});

// Back button functionality
document.getElementById('back-button').addEventListener('click', () => {
    document.getElementById('reader-view').classList.add('hidden');
    document.getElementById('shelf-view').classList.remove('hidden');
    
    // 1. SAFELY DESTROY THE OLD INSTANCE
    if (currentPageFlip) {
        currentPageFlip.destroy();
        currentPageFlip = null;
    }

    // 2. CLEAR CONTAINER VIA OUTER CONTAINER RESET
    const bookContainer = document.getElementById('book');
    bookContainer.innerHTML = '';
    bookContainer.classList.add('hidden');
});

async function openBook(pdfUrl) {
    // Switch Views
    document.getElementById('shelf-view').classList.add('hidden');
    document.getElementById('reader-view').classList.remove('hidden');
    
    const bookContainer = document.getElementById('book');
    const loadingEl = document.getElementById('loading');
    
    // Reset state before loading
    bookContainer.classList.add('hidden');
    bookContainer.innerHTML = ''; 
    loadingEl.classList.remove('hidden');
    loadingEl.innerText = 'Loading book pages...';

    try {
        // Load and Render PDF
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const totalPages = pdf.numPages;

        // Create a FRESH internal wrapper element that pageFlip can break/modify safely!
        const flipCanvasWrapper = document.createElement('div');
        flipCanvasWrapper.id = 'flip-canvas-wrapper';
        bookContainer.appendChild(flipCanvasWrapper);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            
            const isMobile = window.innerWidth <= 440;
            const renderScale = isMobile ? 1.2 : 3.0; 
            
            const viewport = page.getViewport({ scale: renderScale }); 
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.appendChild(canvas);
            
            // Append to our FRESH inner wrapper, not the main outer layout block
            flipCanvasWrapper.appendChild(pageDiv);
        }

        // Hide loader and show the populated container
        loadingEl.classList.add('hidden');
        bookContainer.classList.remove('hidden');

        // Dynamic Layout Settings for devices
        // --- SECTION 2: Find the layout math and update the limits ---
        const screenWidth = window.innerWidth;
        let bookWidth = 550;
        let bookHeight = 733;
        let singlePageMode = false;

        if (screenWidth <= 440) {
            bookWidth = 390; 
            bookHeight = 580;
            singlePageMode = true; 
        } else if (screenWidth >= 1024) {
            // 🌟 MASSIVE DESKTOP SCALE ADJUSTMENT
            // This represents a SINGLE page size base. 
            // In double-page view, the library combines them (making it 1900px wide total base).
            bookWidth = 950; 
            bookHeight = 1250; 
        }

        // ALWAYS INSTANTIATE A FRESH OBJECT
        currentPageFlip = new St.PageFlip(flipCanvasWrapper, {
            width: bookWidth, 
            height: bookHeight, 
            size: "stretch", // 🌟 Allows the canvas elements to scale past their original pixel limits
            minWidth: 200,   
            maxWidth: 3000,  // 🌟 Lifted cap to support widescreen Mac retina displays
            minHeight: 300,
            maxHeight: 3000, // 🌟 Lifted cap to support widescreen Mac retina displays
            maxShadowOpacity: 0.4,
            showCover: !singlePageMode, 
            usePortrait: singlePageMode, 
            mobileScrollSupport: true 
        });

        // Load the freshly rendered HTML structures
        currentPageFlip.loadFromHTML(flipCanvasWrapper.querySelectorAll('.page'));

    } catch (error) {
        console.error('Error loading book:', error);
        loadingEl.innerText = 'Error loading PDF.';
    }
}