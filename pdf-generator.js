/**
 * Specification Manager - PDF Generator Module
 * 
 * This module handles generating PDF documents with compiled specifications
 * based on the items and their matched specifications.
 */

const PDFGenerator = (() => {
    // Private module constants
    const PAGE_WIDTH = 210; // A4 width in mm
    const PAGE_HEIGHT = 297; // A4 height in mm
    const MARGIN = 20; // Margin in mm
    const LINE_HEIGHT = 7; // Line height in mm

    /**
     * Generate and download a PDF with specifications for matched items
     * @param {Array} items - Array of item objects
     * @param {Array} matches - Array of specification matches
     * @returns {Promise} - Promise that resolves when PDF is generated and downloaded
     */
    const generateSpecificationsPDF = async (items, matches) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Make sure jsPDF is available
                if (typeof jspdf === 'undefined') {
                    throw new Error('PDF generation library not loaded');
                }

                // Get specifications content
                const specs = await SpecificationMatcher.getFullSpecifications(matches);
                
                // Get the current specification set name
                const currentSpecSet = SpecificationMatcher.getCurrentSpecSet();
                const specSetName = getSpecSetDisplayName(currentSpecSet);
                
                // Create new PDF document
                const { jsPDF } = jspdf;
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                });

                // Add metadata
                doc.setProperties({
                    title: `${specSetName} Technical Specifications`,
                    subject: 'Compiled technical specifications for project items',
                    author: 'Specification Manager',
                    creator: 'Specification Manager'
                });

                // Start adding content
                let y = MARGIN;
                
                // Add title
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text(`${specSetName} Technical Specifications`, PAGE_WIDTH / 2, y, { align: 'center' });
                y += 10;

                // Add date
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const currentDate = new Date().toLocaleDateString();
                doc.text(`Generated on: ${currentDate}`, PAGE_WIDTH / 2, y, { align: 'center' });
                y += 15;

                // Add items table
                y = addItemsTable(doc, items, y);
                y += 15;

                // Add specifications
                if (specs.mainSpecs.length > 0) {
                    // Add specifications title
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Technical Specifications', MARGIN, y);
                    y += 10;

                    // Add table of contents
                    y = addTableOfContents(doc, specs, y);
                    y += 10;

                    // Add page break
                    doc.addPage();
                    y = MARGIN;

                    // Add specifications content
                    y = addSpecificationsContent(doc, specs, y);
                } else {
                    // No specifications found
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'normal');
                    doc.text('No specifications were found for the provided items.', MARGIN, y);
                    y += 10;
                }

                // Generate and download the PDF
                const fileName = `${specSetName.replace(/\s+/g, '_')}_Specifications.pdf`;
                doc.save(fileName);
                resolve();
            } catch (error) {
                console.error('Error generating PDF:', error);
                reject(error);
            }
        });
    };

    /**
     * Add items table to the PDF
     * @param {Object} doc - jsPDF document object
     * @param {Array} items - Array of item objects
     * @param {number} y - Current y position on page
     * @returns {number} - New y position after adding table
     */
    const addItemsTable = (doc, items, y) => {
        // Set up table headers
        const headers = ['Item Number', 'Description', 'Quantity', 'Unit'];
        const columnWidths = [(PAGE_WIDTH - 2 * MARGIN) * 0.20, (PAGE_WIDTH - 2 * MARGIN) * 0.50, 
                               (PAGE_WIDTH - 2 * MARGIN) * 0.15, (PAGE_WIDTH - 2 * MARGIN) * 0.15];
        const startX = MARGIN;
        
        // Set header style
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        
        // Draw header row
        let x = startX;
        headers.forEach((header, index) => {
            doc.text(header, x, y);
            x += columnWidths[index];
        });
        y += 7;
        
        // Draw header underline
        doc.line(startX, y - 4, PAGE_WIDTH - MARGIN, y - 4);
        
        // Set data style
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Draw data rows (limited to the first page only for simplicity)
        const maxRows = 15; // Maximum rows to show on the first page
        const rowsToShow = Math.min(items.length, maxRows);
        
        for (let i = 0; i < rowsToShow; i++) {
            const item = items[i];
            
            // Check if we need a new page
            if (y > PAGE_HEIGHT - MARGIN) {
                doc.addPage();
                y = MARGIN;
                
                // Re-draw headers on new page
                x = startX;
                doc.setFont('helvetica', 'bold');
                headers.forEach((header, index) => {
                    doc.text(header, x, y);
                    x += columnWidths[index];
                });
                doc.line(startX, y + 3, PAGE_WIDTH - MARGIN, y + 3);
                y += 7;
                doc.setFont('helvetica', 'normal');
            }
            
            // Draw item data
            let x = startX;
            
            // Item Number
            doc.text(truncateText(item.itemNumber, 15), x, y);
            x += columnWidths[0];
            
            // Description
            doc.text(truncateText(item.description, 50), x, y);
            x += columnWidths[1];
            
            // Quantity
            doc.text(truncateText(item.quantity, 10), x, y);
            x += columnWidths[2];
            
            // Unit
            doc.text(truncateText(item.unit, 10), x, y);
            
            y += LINE_HEIGHT;
        }
        
        // If there are more items than shown, add a note
        if (items.length > maxRows) {
            doc.text(`+ ${items.length - maxRows} more items (full list in table of contents)`, startX, y + 5);
            y += 10;
        }
        
        return y;
    };

    /**
     * Add table of contents to the PDF
     * @param {Object} doc - jsPDF document object
     * @param {Object} specs - Object containing specifications
     * @param {number} y - Current y position on page
     * @returns {number} - New y position after adding table of contents
     */
    const addTableOfContents = (doc, specs, y) => {
        // Set up styling
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Table of Contents', MARGIN, y);
        y += 8;
        
        // Add main specifications to TOC
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        specs.mainSpecs.forEach((spec, index) => {
            // Check if we need a new page
            if (y > PAGE_HEIGHT - MARGIN) {
                doc.addPage();
                y = MARGIN;
            }
            
            const entry = `${index + 1}. ${spec.section}: ${spec.title}`;
            doc.text(entry, MARGIN, y);
            y += LINE_HEIGHT;
        });
        
        // Add supplemental specifications to TOC if they exist
        if (specs.supplementalSpecs.length > 0) {
            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Supplemental Specifications:', MARGIN, y);
            y += 8;
            
            doc.setFont('helvetica', 'normal');
            specs.supplementalSpecs.forEach((spec, index) => {
                // Check if we need a new page
                if (y > PAGE_HEIGHT - MARGIN) {
                    doc.addPage();
                    y = MARGIN;
                }
                
                const entry = `S${index + 1}. ${spec.code}: ${spec.title}`;
                doc.text(entry, MARGIN, y);
                y += LINE_HEIGHT;
            });
        }
        
        return y;
    };

    /**
     * Add specifications content to the PDF
     * @param {Object} doc - jsPDF document object
     * @param {Object} specs - Object containing specifications
     * @param {number} y - Current y position on page
     * @returns {number} - New y position after adding specifications
     */
    const addSpecificationsContent = (doc, specs, y) => {
        // Add main specifications
        specs.mainSpecs.forEach((spec, index) => {
            // Add a new page for each specification
            if (index > 0) {
                doc.addPage();
                y = MARGIN;
            }
            
            // Add section header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`${index + 1}. ${spec.section}: ${spec.title}`, MARGIN, y);
            y += 10;
            
            // Add spec content
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            // Split content into paragraphs and add them to the page
            const paragraphs = spec.content.split('\n\n');
            paragraphs.forEach(paragraph => {
                // Check if there's enough space for at least one line
                if (y > PAGE_HEIGHT - MARGIN - LINE_HEIGHT) {
                    doc.addPage();
                    y = MARGIN;
                }
                
                // Split paragraph into lines that fit on the page
                const maxLineWidth = PAGE_WIDTH - 2 * MARGIN;
                const lines = splitTextToLines(doc, paragraph, maxLineWidth);
                
                lines.forEach(line => {
                    // Check if we need a new page
                    if (y > PAGE_HEIGHT - MARGIN) {
                        doc.addPage();
                        y = MARGIN;
                    }
                    
                    doc.text(line, MARGIN, y);
                    y += LINE_HEIGHT;
                });
                
                // Add spacing between paragraphs
                y += 3;
            });
        });
        
        // Add supplemental specifications
        if (specs.supplementalSpecs.length > 0) {
            doc.addPage();
            y = MARGIN;
            
            // Add section header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Supplemental Specifications', MARGIN, y);
            y += 10;
            
            // Add each supplemental spec
            specs.supplementalSpecs.forEach((spec, index) => {
                // Add section header
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`S${index + 1}. ${spec.code}: ${spec.title}`, MARGIN, y);
                y += 8;
                
                // Add spec content
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                // Split content into paragraphs and add them to the page
                const paragraphs = spec.content.split('\n\n');
                paragraphs.forEach(paragraph => {
                    // Check if there's enough space for at least one line
                    if (y > PAGE_HEIGHT - MARGIN - LINE_HEIGHT) {
                        doc.addPage();
                        y = MARGIN;
                    }
                    
                    // Split paragraph into lines that fit on the page
                    const maxLineWidth = PAGE_WIDTH - 2 * MARGIN;
                    const lines = splitTextToLines(doc, paragraph, maxLineWidth);
                    
                    lines.forEach(line => {
                        // Check if we need a new page
                        if (y > PAGE_HEIGHT - MARGIN) {
                            doc.addPage();
                            y = MARGIN;
                        }
                        
                        doc.text(line, MARGIN, y);
                        y += LINE_HEIGHT;
                    });
                    
                    // Add spacing between paragraphs
                    y += 3;
                });
                
                // Add spacing between specifications
                y += 7;
            });
        }
        
        return y;
    };

    /**
     * Split text into lines that fit within a specified width
     * @param {Object} doc - jsPDF document object
     * @param {string} text - Text to split
     * @param {number} maxWidth - Maximum width in mm
     * @returns {Array} - Array of lines
     */
    const splitTextToLines = (doc, text, maxWidth) => {
        // Use jsPDF's built-in splitTextToSize function
        return doc.splitTextToSize(text, maxWidth);
    };

    /**
     * Truncate text if it exceeds a certain length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} - Truncated text
     */
    const truncateText = (text, maxLength) => {
        text = String(text || '');
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    };

    /**
     * Get display name for a specification set ID
     * @param {string} specSetId - The specification set ID
     * @returns {string} - The display name for the specification set
     */
    const getSpecSetDisplayName = (specSetId) => {
        const specSetNames = {
            'ladotd-2016': 'LA DOTD 2016',
            'txdot-2024': 'TxDOT 2024'
        };
        
        return specSetNames[specSetId] || 'Standard';
    };

    // Return public methods
    return {
        generateSpecificationsPDF
    };
})();
