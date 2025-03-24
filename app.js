/**
 * LA DOTD Specification Manager - Main Application Logic
 * 
 * This file is the entry point for the application and coordinates
 * the interactions between different modules.
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    const fileUploadEl = document.getElementById('fileUpload');
    const fileTypeRadios = document.getElementsByName('fileType');
    const processButton = document.getElementById('processButton');
    const resultsCard = document.getElementById('resultsCard');
    const processingStatus = document.getElementById('processingStatus');
    const itemCount = document.getElementById('itemCount');
    const itemsTableBody = document.getElementById('itemsTableBody');
    const downloadSpecsBtn = document.getElementById('downloadSpecsBtn');

    // Application state
    let processedItems = [];
    let matchedSpecifications = [];

    // Initialize the application
    async function initApp() {
        // Fetch specification data at startup
        try {
            await SpecificationMatcher.init();
            console.log('Specification data loaded successfully');
        } catch (error) {
            console.error('Failed to load specification data:', error);
            alert('Failed to load specification data. Please try refreshing the page.');
        }

        // Set up event listeners
        processButton.addEventListener('click', handleFileProcessing);
        downloadSpecsBtn.addEventListener('click', handleSpecDownload);
    }

    // Handle file processing when the user clicks "Process File"
    async function handleFileProcessing() {
                    // Get selected file type
        let fileType = 'csv'; // Default
        for (const radio of fileTypeRadios) {
            if (radio.checked) {
                fileType = radio.value;
                break;
            }
        }

        // Validate file input
        if (!fileUploadEl.files || fileUploadEl.files.length === 0) {
            alert('Please select a file to upload');
            return;
        }

        const file = fileUploadEl.files[0];
        
        try {
            // Show loading status
            processingStatus.textContent = 'Processing file, please wait...';
            resultsCard.classList.remove('d-none');
            
            // Parse the file based on its type
            if (fileType === 'csv') {
                processedItems = await FileHandler.parseCSV(file);
            } else if (fileType === 'excel') {
                processedItems = await FileHandler.parseExcel(file);
            } else if (fileType === 'pdf') {
                processedItems = await PDFHandler.parsePDF(file);
            }

            // Match items with specifications
            matchedSpecifications = await SpecificationMatcher.matchItems(processedItems);
            
            // Update UI with results
            updateResultsTable(processedItems, matchedSpecifications);
            
            // Update status
            processingStatus.textContent = `File processed successfully. Found ${processedItems.length} items.`;
            itemCount.textContent = processedItems.length;
            
        } catch (error) {
            console.error('Error processing file:', error);
            processingStatus.textContent = `Error: ${error.message}`;
            resultsCard.classList.remove('d-none');
        }
    }

    // Update the results table with processed items
    function updateResultsTable(items, specifications) {
        // Clear existing table rows
        itemsTableBody.innerHTML = '';
        
        // Add rows for each item
        items.forEach((item, index) => {
            const row = document.createElement('tr');
            
            // Find matching specification for this item
            const specMatch = specifications.find(spec => 
                spec.itemNumber === item.itemNumber
            );
            
            const specReference = specMatch ? specMatch.specReference : 'No specification found';
            
            row.innerHTML = `
                <td>${Utils.escapeHtml(item.itemNumber)}</td>
                <td>${Utils.escapeHtml(item.description)}</td>
                <td>${Utils.escapeHtml(item.quantity)}</td>
                <td>${Utils.escapeHtml(item.unit)}</td>
                <td>${Utils.escapeHtml(specReference)}</td>
            `;
            
            itemsTableBody.appendChild(row);
        });
    }

    // Handle specification download
    async function handleSpecDownload() {
        if (processedItems.length === 0 || matchedSpecifications.length === 0) {
            alert('No specifications to download. Please process a file first.');
            return;
        }

        try {
            // Show loading status
            processingStatus.textContent = 'Generating PDF, please wait...';
            
            // Generate and download the PDF
            await PDFGenerator.generateSpecificationsPDF(
                processedItems,
                matchedSpecifications
            );
            
            // Update status
            processingStatus.textContent = 'Specifications downloaded successfully.';
        } catch (error) {
            console.error('Error generating PDF:', error);
            processingStatus.textContent = `Error generating PDF: ${error.message}`;
        }
    }

    // Initialize the application
    initApp();
});
