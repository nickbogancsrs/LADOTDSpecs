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

                // Show console debug message
                console.log('Starting PDF parsing process');
                
                const reader = new FileReader();
                
                reader.onload = async (event) => {
                    try {
                        const typedArray = new Uint8Array(event.target.result);
                        console.log('File loaded as array buffer, size:', typedArray.length);
                        
                        // Load the PDF document
                        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
                        console.log('PDF loading task created');
                        
                        loadingTask.onProgress = (progress) => {
                            console.log(`PDF loading progress: ${progress.loaded}/${progress.total}`);
                        };
                        
                        try {
                            const pdf = await loadingTask.promise;
                            console.log('PDF loaded successfully, pages:', pdf.numPages);
                            
                            // Extract data from all pages
                            const extractedItems = await extractTablesFromPDF(pdf);
                            console.log('Extracted items from PDF:', extractedItems);
                            
                            // Process extracted items into the standard format
                            const processedItems = processItemsData(extractedItems);
                            console.log('Processed items:', processedItems);
                            
                            resolve(processedItems);
                        } catch (pdfError) {
                            console.error('Error in PDF processing:', pdfError);
                            reject(new Error(`PDF loading error: ${pdfError.message}`));
                        }
                    } catch (error) {
                        console.error('Error processing PDF:', error);
                        reject(new Error(`PDF processing error: ${error.message}`));
                    }
                };
                
                reader.onerror = (error) => {
                    console.error('FileReader error:', error);
                    reject(new Error('Failed to read the PDF file'));
                };
                
                // Read the file as an array buffer
                reader.readAsArrayBuffer(file);
                console.log('FileReader started for PDF');
                
            } catch (error) {
                console.error('General PDF parsing error:', error);
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
        
        console.log(`Starting to extract tables from PDF with ${pdf.numPages} pages`);
        
        // Process each page
        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                console.log(`Processing page ${i}`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                console.log(`Page ${i} text content retrieved, items: ${textContent.items.length}`);
                
                // Extract table data from text content
                const pageItems = extractItemsFromTextContent(textContent, i);
                console.log(`Page ${i} extracted items: ${pageItems.length}`);
                
                if (pageItems.length > 0) {
                    allItems.push(...pageItems);
                }
            } catch (error) {
                console.warn(`Error extracting content from page ${i}:`, error);
            }
        }
        
        console.log(`Total extracted items from all pages: ${allItems.length}`);
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
        
        console.log(`Extracting from ${textItems.length} text items on page ${pageNum}`);
        
        // Collect some sample items for debugging
        if (textItems.length > 0) {
            const samples = textItems.slice(0, Math.min(5, textItems.length));
            console.log('Sample text items:', samples.map(item => `"${item.str}" at (${item.transform[4]},${item.transform[5]})`));
        }
        
        // Group text items by their y-coordinates to identify rows
        const rows = groupTextItemsByRows(textItems);
        console.log(`Grouped into ${rows.length} rows`);
        
        // Process rows to identify headers and data
        let headerRow = null;
        let headerRowIndex = -1;
        let itemNumberIndex = -1;
        let descriptionIndex = -1;
        let quantityIndex = -1;
        let unitIndex = -1;
        
        // First, try to find the header row with column names
        rows.forEach((row, rowIndex) => {
            const text = row.map(item => item.str.trim());
            const joinedText = text.join(' ').toLowerCase();
            
            console.log(`Row ${rowIndex} text: "${joinedText}"`);
            
            // Look for header row containing key columns
            // LA DOTD typically uses "ITEM NO.", "DESCRIPTION", "UNIT", "QUANTITY"
            if ((joinedText.includes('item') || joinedText.includes('item no')) && 
                joinedText.includes('description') && 
                joinedText.includes('unit') &&
                joinedText.includes('quantity')) {
                
                console.log(`Found header row at index ${rowIndex}: ${joinedText}`);
                headerRow = row;
                headerRowIndex = rowIndex;
                
                // Determine column indexes - LA DOTD format
                text.forEach((item, index) => {
                    const lowerItem = item.toLowerCase();
                    if (lowerItem.includes('item') || lowerItem === 'item no.') itemNumberIndex = index;
                    if (lowerItem.includes('description')) descriptionIndex = index;
                    if (lowerItem === 'unit') unitIndex = index;
                    if (lowerItem === 'quantity') quantityIndex = index;
                });
                
                console.log(`Column indexes - Item: ${itemNumberIndex}, Desc: ${descriptionIndex}, Unit: ${unitIndex}, Qty: ${quantityIndex}`);
            }
        });
        
        // If header row was found, process data rows (everything after the header)
        if (headerRow && headerRowIndex >= 0) {
            console.log('Processing data rows after header');
            
            for (let i = headerRowIndex + 1; i < rows.length; i++) {
                const row = rows[i];
                const text = row.map(item => item.str.trim());
                
                // Skip rows that are too short
                if (text.length < 2) continue;
                
                // Look for LA DOTD item number pattern in the first column
                const potentialItemNumber = text[itemNumberIndex >= 0 ? itemNumberIndex : 0];
                
                // LA DOTD item numbers are typically in format like "201-01-00100"
                if (potentialItemNumber && isValidItemNumber(potentialItemNumber)) {
                    console.log(`Found item row with item number: ${potentialItemNumber}`);
                    
                    // Make sure we have all the necessary column indexes
                    const descIndex = descriptionIndex >= 0 ? descriptionIndex : 1;
                    const unitIdx = unitIndex >= 0 ? unitIndex : 2;
                    const qtyIdx = quantityIndex >= 0 ? quantityIndex : 3;
                    
                    // Create an item object with the data from the row
                    const item = {
                        itemNumber: text[itemNumberIndex >= 0 ? itemNumberIndex : 0] || '',
                        description: text.length > descIndex ? text[descIndex] : '',
                        unit: text.length > unitIdx ? text[unitIdx] : '',
                        quantity: text.length > qtyIdx ? text[qtyIdx] : ''
                    };
                    
                    items.push(item);
                }
            }
        } else {
            console.log('Header row not found, attempting alternative extraction');
            
            // If we couldn't find a proper header row, try to extract items based on item number pattern
            rows.forEach((row, index) => {
                const text = row.map(item => item.str.trim());
                
                // Skip rows that are too short
                if (text.length < 2) return;
                
                // Check first column for item number pattern
                if (isValidItemNumber(text[0])) {
                    console.log(`Found potential item row by pattern matching: ${text[0]}`);
                    
                    // Create an item with best-effort column mapping
                    const item = {
                        itemNumber: text[0] || '',
                        description: text.length > 1 ? text[1] : '',
                        unit: text.length > 2 ? text[2] : '',
                        quantity: text.length > 3 ? text[3] : ''
                    };
                    
                    items.push(item);
                }
            });
        }
        
        console.log(`Extracted ${items.length} items from page ${pageNum}`);
        return items;
    };

    /**
     * Group text items by rows based on y-coordinates
     * @param {Array} textItems - Text items from PDF.js
     * @returns {Array} - Array of rows, each containing text items
     */
    const groupTextItemsByRows = (textItems) => {
        if (!textItems || textItems.length === 0) {
            console.log('No text items to group into rows');
            return [];
        }
        
        console.log(`Grouping ${textItems.length} text items into rows`);
        
        // First, analyze the y-coordinates to determine the typical line height
        const yCoords = textItems.map(item => item.transform[5]);
        const sortedY = [...yCoords].sort((a, b) => a - b);
        
        // Calculate the differences between consecutive y-coordinates
        const diffs = [];
        for (let i = 1; i < sortedY.length; i++) {
            const diff = Math.abs(sortedY[i] - sortedY[i-1]);
            if (diff > 0.1) { // Ignore very small differences
                diffs.push(diff);
            }
        }
        
        // Find the most common small difference (likely the line height)
        let lineHeightTolerance = 3; // Default tolerance
        
        if (diffs.length > 0) {
            // Group similar differences
            const diffGroups = {};
            diffs.forEach(diff => {
                // Round to nearest 0.5 to group similar values
                const roundedDiff = Math.round(diff * 2) / 2;
                diffGroups[roundedDiff] = (diffGroups[roundedDiff] || 0) + 1;
            });
            
            // Find the most common difference
            let maxCount = 0;
            let mostCommonDiff = 3;
            
            Object.entries(diffGroups).forEach(([diff, count]) => {
                if (count > maxCount && parseFloat(diff) < 20) { // Avoid outliers
                    maxCount = count;
                    mostCommonDiff = parseFloat(diff);
                }
            });
            
            // Use this as the line height tolerance, with a minimum value
            lineHeightTolerance = Math.max(mostCommonDiff * 1.2, 2);
            console.log(`Calculated line height tolerance: ${lineHeightTolerance}`);
        }
        
        // Sort items by y-coordinate first, then by x-coordinate
        const sortedItems = [...textItems].sort((a, b) => {
            if (Math.abs(a.transform[5] - b.transform[5]) <= lineHeightTolerance) {
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
            } else if (Math.abs(y - lastY) <= lineHeightTolerance) {
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
        
        console.log(`Grouped into ${rows.length} rows`);
        
        // Log some sample rows for debugging
        if (rows.length > 0) {
            const sampleRowIndex = Math.min(rows.length - 1, 10); // Get the 10th row if available
            const sampleRow = rows[sampleRowIndex];
            console.log(`Sample row ${sampleRowIndex}: "${sampleRow.map(item => item.str).join(' ')}"`);
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
        
        console.log(`Checking if "${str}" is a valid item number`);
        
        // LA DOTD item number patterns can vary
        // Common formats:
        // 201-01-00100
        // 201-01
        // 732-01-00200
        // 805-12-00100
        
        // Check for standard patterns
        const standardPattern = /^\d{3}-\d{2}(-\d{5})?$/;
        
        // Check for other patterns seen in your document
        const altPattern1 = /^\d{3}-\d{2}-\d{5}$/;
        const altPattern2 = /^\d{3}-\d{2}-\d{4}$/;
        const altPattern3 = /^\d{3}-\d{2}-\d{3}$/;
        const altPattern4 = /^\d{3}-\d{2}$/;
        
        // Additional pattern seen in the provided document
        const altPattern5 = /^\d{3}-\d{2}-\d{2}$/;
        
        // Check if any pattern matches
        const result = standardPattern.test(str) || 
                       altPattern1.test(str) || 
                       altPattern2.test(str) ||
                       altPattern3.test(str) ||
                       altPattern4.test(str) ||
                       altPattern5.test(str);
        
        console.log(`Item number check result for "${str}": ${result}`);
        return result;
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
