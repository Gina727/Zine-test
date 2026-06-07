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
    document.getElementById('shelf-view').classList.remove('shelf-view'); // Show shelf
    document.getElementById('shelf-view').classList.remove('hidden');
    
    // Destroy book instance to free up memory
    if (currentPageFlip) {
        currentPageFlip.destroy();
        currentPageFlip = null;
    }
});

async function openBook(pdfUrl) {
    // 1. Switch Views
    document.getElementById('shelf-view').classList.add('hidden');
    document.getElementById('reader-view').classList.remove('hidden');
    
    // Reset loader and clear old pages
    const bookContainer = document.getElementById('book');
    const loadingEl = document.getElementById('loading');
    bookContainer.classList.add('hidden');
    bookContainer.innerHTML = ''; 
    loadingEl.classList.remove('hidden');
    loadingEl.innerText = 'Loading book pages...';

    try {
        // 2. Load and Render PDF
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const totalPages = pdf.numPages;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 }); 
            
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
            bookContainer.appendChild(pageDiv);
        }

        // 3. Show book and initialize page flip
        loadingEl.classList.add('hidden');
        bookContainer.classList.remove('hidden');

        currentPageFlip = new St.PageFlip(bookContainer, {
            width: 550, 
            height: 733, 
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            maxShadowOpacity: 0.5,
            showCover: true,
        });

        currentPageFlip.loadFromHTML(document.querySelectorAll('.page'));

    } catch (error) {
        console.error('Error loading book:', error);
        loadingEl.innerText = 'Error loading PDF. Make sure the file exists and paths are correct.';
    }
}