/**
 * LA DOTD Specification Manager - PDF Handler Module
 * 
 * This module handles parsing of uploaded PDF files to extract tabular data
 * and convert them to a standardized format for processing.
 */

const PDFHandler = (() => {
    /**
     * Parse a PDF file and extract table data
     * @param {File} file - The PDF file to parse
     * @returns {Promise<Array>} - Promise resolving to array of item objects
     */
    const parsePDF = (file) => {
        return new Promise((resolve, reject) => {
            try {
                // Check if PDF.js is available
                if (!pdfjsLib) {
                    reject(new Error('PDF parsing library not loaded'));
                    return;
                }

                const reader = new FileReader();
                
                reader.onload = async (event) => {
                    try {
                        const typedArray = new Uint8Array(event.target.result);
                        
                        // Load the PDF document
                        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
                        const pdf = await loadingTask.promise;
                        
                        console.log('PDF loaded, pages:', pdf.numPages);
                        
                        // Extract data from all pages
                        const extractedItems = await extractTablesFromPDF(pdf);
                        
                        // Process extracted items into the standard format
                        const processedItems = processItemsData(extractedItems);
                        
                        resolve(processedItems);
                    } catch (error) {
                        console.error('Error processing PDF:', error);
                        reject(new Error(`PDF processing error: ${error.message}`));
                    }
                };
                
                reader.onerror = () => {
                    reject(new Error('Failed to read the PDF file'));
                };
                
                // Read the file as an array buffer
                reader.readAsArrayBuffer(file);
                
            } catch (error) {
                reject(new Error(`PDF parsing failed: ${error.message}`));
            }
        });
    };

    /**
     * Extract tables from a PDF document
     * @param {Object} pdf - The PDF document from PDF.js
     * @returns {Promise<Array>} - Promise resolving to array of extracted data
     */
    const extractTablesFromPDF = async (pdf) => {
        const allItems = [];
        
        // Process each page
        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Extract table data from text content
                const pageItems = extractItemsFromTextContent(textContent, i);
                allItems.push(...pageItems);
            } catch (error) {
                console.warn(`Error extracting content from page ${i}:`, error);
            }
        }
        
        return allItems;
    };

    /**
     * Extract item information from PDF text content
     * @param {Object} textContent - The text content from PDF.js
     * @param {number} pageNum - The page number
     * @returns {Array} - Array of extracted items
     */
    const extractItemsFromTextContent = (textContent, pageNum) => {
        // Items to be collected from the PDF
        const items = [];
        
        // Get text items and their positions
        const textItems = textContent.items;
        
        // Group text items by their y-coordinates to identify rows
        const rows = groupTextItemsByRows(textItems);
        
        // Process rows to identify headers and data
        let headerRow = null;
        let itemNumberIndex = -1;
        let descriptionIndex = -1;
        let quantityIndex = -1;
        let unitIndex = -1;
        
        // Process rows to find potential header and data rows
        rows.forEach(row => {
            const text = row.map(item => item.str.trim());
            const joinedText = text.join(' ').toLowerCase();
            
            // Look for header row containing key columns
            if (joinedText.includes('item') && 
                (joinedText.includes('description') || joinedText.includes('desc')) && 
                (joinedText.includes('quantity') || joinedText.includes('qty'))) {
                
                headerRow = row;
                
                // Determine column indexes
                text.forEach((item, index) => {
                    const lowerItem = item.toLowerCase();
                    if (lowerItem.includes('item')) itemNumberIndex = index;
                    if (lowerItem.includes('desc')) descriptionIndex = index;
                    if (lowerItem.includes('quant')) quantityIndex = index;
                    if (lowerItem.includes('unit')) unitIndex = index;
                });
            } 
            // If we've already found a header, process data rows
            else if (headerRow && row.length >= 2) {
                // Check if the first column looks like an item number
                const potentialItemNumber = text[0];
                if (isValidItemNumber(potentialItemNumber)) {
                    // Create an item object
                    const item = {
                        itemNumber: text[itemNumberIndex >= 0 ? itemNumberIndex : 0] || '',
                        description: text[descriptionIndex >= 0 ? descriptionIndex : 1] || '',
                        quantity: text[quantityIndex >= 0 ? quantityIndex : 2] || '',
                        unit: text[unitIndex >= 0 ? unitIndex : 3] || ''
                    };
                    
                    items.push(item);
                }
            }
        });
        
        // If we couldn't identify a header row, make a best effort to extract items
        if (items.length === 0) {
            rows.forEach(row => {
                const text = row.map(item => item.str.trim());
                
                // Check if the first column looks like an item number
                if (text.length >= 2 && isValidItemNumber(text[0])) {
                    const item = {
                        itemNumber: text[0] || '',
                        description: text.length > 1 ? text[1] : '',
                        quantity: text.length > 2 ? text[2] : '',
                        unit: text.length > 3 ? text[3] : ''
                    };
                    
                    items.push(item);
                }
            });
        }
        
        return items;
    };

    /**
     * Group text items by rows based on y-coordinates
     * @param {Array} textItems - Text items from PDF.js
     * @returns {Array} - Array of rows, each containing text items
     */
    const groupTextItemsByRows = (textItems) => {
        // Sort items by y-coordinate first, then by x-coordinate
        const sortedItems = [...textItems].sort((a, b) => {
            if (Math.abs(a.transform[5] - b.transform[5]) <= 3) {
                // If y-coordinates are close (same row), sort by x-coordinate (left to right)
                return a.transform[4] - b.transform[4];
            }
            // Otherwise sort by y-coordinate (top to bottom)
            return b.transform[5] - a.transform[5];
        });
        
        const rows = [];
        let currentRow = [];
        let lastY = null;
        
        // Group items into rows
        sortedItems.forEach(item => {
            const y = item.transform[5];
            
            if (lastY === null) {
                // First item
                currentRow = [item];
            } else if (Math.abs(y - lastY) <= 3) {
                // Same row (y-coordinates within tolerance)
                currentRow.push(item);
            } else {
                // New row
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
                currentRow = [item];
            }
            
            lastY = y;
        });
        
        // Add the last row
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }
        
        return rows;
    };

    /**
     * Check if a string might be a valid LA DOTD item number
     * @param {string} str - String to check
     * @returns {boolean} - Whether the string looks like an item number
     */
    const isValidItemNumber = (str) => {
        if (!str) return false;
        
        // Check common LA DOTD item number patterns
        // Examples: 203-01, 701-01-00100, etc.
        const itemNumberPattern = /^\d{3}-\d{2}(-\d{5})?$/;
        return itemNumberPattern.test(str) || 
               /^\d{3}-\d{2}$/.test(str) || 
               /^\d{3}-\d{2}-\d+$/.test(str);
    };

    /**
     * Process extracted data and standardize it for the application
     * @param {Array} extractedItems - Array of extracted item objects
     * @returns {Array} - Array of standardized item objects
     */
    const processItemsData = (extractedItems) => {
        if (!extractedItems || extractedItems.length === 0) {
            return [];
        }
        
        // Clean up the data and standardize it
        return extractedItems.map((item, index) => {
            return {
                itemNumber: String(item.itemNumber || '').trim(),
                description: String(item.description || '').trim(),
                quantity: String(item.quantity || '').trim(),
                unit: String(item.unit || '').trim()
            };
        }).filter(item => item.itemNumber && item.itemNumber !== 'Unknown');
    };

    // Return public methods
    return {
        parsePDF
    };
})();
