/**
 * LA DOTD Specification Manager - File Handler Module
 * 
 * This module handles parsing of uploaded files (CSV and Excel)
 * and converting them to a standardized format for processing.
 */

const FileHandler = (() => {
    /**
     * Parse a CSV file and extract item information
     * @param {File} file - The CSV file to parse
     * @returns {Promise<Array>} - Promise resolving to array of item objects
     */
    const parseCSV = (file) => {
        return new Promise((resolve, reject) => {
            // Check if Papa Parse is available
            if (!Papa) {
                reject(new Error('CSV parsing library not loaded'));
                return;
            }

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    try {
                        if (results.errors && results.errors.length > 0) {
                            console.warn('CSV parsing warnings:', results.errors);
                        }

                        const items = processItemsData(results.data);
                        resolve(items);
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(new Error(`CSV parsing error: ${error.message}`));
                }
            });
        });
    };

    /**
     * Parse an Excel file and extract item information
     * @param {File} file - The Excel file to parse
     * @returns {Promise<Array>} - Promise resolving to array of item objects
     */
    const parseExcel = (file) => {
        return new Promise((resolve, reject) => {
            // Check if XLSX is available
            if (!XLSX) {
                reject(new Error('Excel parsing library not loaded'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Get the first worksheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '',
                        raw: false
                    });

                    // Process the data
                    if (jsonData.length < 2) {
                        reject(new Error('Excel file contains insufficient data'));
                        return;
                    }

                    // Extract headers from the first row
                    const headers = jsonData[0];
                    
                    // Map the remaining rows to objects
                    const rowObjects = jsonData.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            // Clean up the header name and handle undefined values
                            const cleanHeader = header ? header.trim().toLowerCase() : `column${index}`;
                            obj[cleanHeader] = row[index] || '';
                        });
                        return obj;
                    });

                    const items = processItemsData(rowObjects);
                    resolve(items);
                } catch (error) {
                    reject(new Error(`Excel parsing error: ${error.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('File reading failed'));
            };

            reader.readAsArrayBuffer(file);
        });
    };

    /**
     * Process parsed data and standardize it for the application
     * @param {Array} data - Array of raw data objects from parsed file
     * @returns {Array} - Array of standardized item objects
     */
    const processItemsData = (data) => {
        // No data
        if (!data || data.length === 0) {
            throw new Error('No data found in the file');
        }

        // Get the first row to check available fields
        const firstRow = data[0];
        const fields = Object.keys(firstRow).map(key => key.toLowerCase());

        // Determine which fields to use for item data
        const itemNumberField = determineField(fields, ['itemnumber', 'item number', 'item_number', 'item', 'number', 'id']);
        const descriptionField = determineField(fields, ['description', 'desc', 'item description', 'name']);
        const quantityField = determineField(fields, ['quantity', 'qty', 'amount', 'count']);
        const unitField = determineField(fields, ['unit', 'units', 'unitofmeasure', 'unit of measure', 'uom']);

        if (!itemNumberField) {
            throw new Error('Could not identify item number field in the data');
        }

        // Map the data to a standardized format
        return data.map((row, index) => {
            // Grab the value from the identified field or use a default
            const itemNumber = row[itemNumberField] || `Unknown-${index + 1}`;
            const description = row[descriptionField] || '';
            const quantity = row[quantityField] || '';
            const unit = row[unitField] || '';

            // Return standardized item object
            return {
                itemNumber: String(itemNumber).trim(),
                description: String(description).trim(),
                quantity: String(quantity).trim(),
                unit: String(unit).trim()
            };
        }).filter(item => item.itemNumber && item.itemNumber !== 'Unknown');
    };

    /**
     * Determine which field in the data corresponds to the desired content
     * @param {Array} fields - Array of available field names
     * @param {Array} possibleMatches - Array of possible field name matches
     * @returns {String|null} - Matching field name or null if no match
     */
    const determineField = (fields, possibleMatches) => {
        for (const match of possibleMatches) {
            const matchingField = fields.find(field => 
                field === match || field.includes(match)
            );
            if (matchingField) {
                return matchingField;
            }
        }
        return null;
    };

    // Return public methods
    return {
        parseCSV,
        parseExcel
    };
})();
