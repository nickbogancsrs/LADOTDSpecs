/**
 * LA DOTD Specification Manager - Specification Matcher Module
 * 
 * This module handles matching item numbers to their corresponding
 * technical specifications in the LA DOTD Standard Specifications.
 */

const SpecificationMatcher = (() => {
    // Private module variables
    let specifications = [];
    let supplementalSpecs = [];
    let isInitialized = false;

    /**
     * Initialize the module by loading specification data
     * @returns {Promise} - Promise that resolves when initialization is complete
     */
    const init = async () => {
        try {
            // Load main specification data
            specifications = await loadJSON('assets/data/specifications.json');
            
            // Load supplemental specification data
            supplementalSpecs = await loadJSON('assets/data/supplementalSpecs.json');
            
            isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize SpecificationMatcher:', error);
            throw new Error('Failed to load specification data');
        }
    };

    /**
     * Load JSON data from a URL
     * @param {string} url - URL to fetch JSON from
     * @returns {Promise<Object>} - Promise resolving to parsed JSON
     */
    const loadJSON = async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load data from ${url}: ${response.statusText}`);
        }
        return response.json();
    };

    /**
     * Match items with their specifications
     * @param {Array} items - Array of item objects with itemNumber property
     * @returns {Promise<Array>} - Promise resolving to array of specification matches
     */
    const matchItems = async (items) => {
        // Ensure module is initialized
        if (!isInitialized) {
            await init();
        }

        // Create matches for each item
        const matches = items.map(item => {
            const match = matchItemToSpec(item.itemNumber);
            return {
                itemNumber: item.itemNumber,
                specReference: match.specReference,
                specContent: match.specContent,
                supplementalRefs: match.supplementalRefs
            };
        });

        return matches;
    };

    /**
     * Match a single item number to its specification
     * @param {string} itemNumber - The item number to match
     * @returns {Object} - Object containing specification information
     */
    const matchItemToSpec = (itemNumber) => {
        // Clean the item number
        const cleanItemNumber = itemNumber.toString().trim();
        
        // Try to find an exact match first
        let spec = specifications.find(s => s.itemNumber === cleanItemNumber);
        
        // If no exact match, try a prefix match
        if (!spec && cleanItemNumber.length >= 3) {
            const prefix = cleanItemNumber.substring(0, 3);
            spec = specifications.find(s => s.itemNumber.startsWith(prefix));
        }

        // If still no match, return default
        if (!spec) {
            return {
                specReference: 'No specification found',
                specContent: '',
                supplementalRefs: []
            };
        }

        // Find supplemental specifications referenced by this spec
        const supplementalRefs = findSupplementalSpecs(spec.specContent);
        
        return {
            specReference: `${spec.section} ${spec.title}`,
            specContent: spec.specContent,
            supplementalRefs: supplementalRefs
        };
    };

    /**
     * Find supplemental specifications referenced in the main spec content
     * @param {string} content - The specification content to search
     * @returns {Array} - Array of supplemental spec references
     */
    const findSupplementalSpecs = (content) => {
        if (!content) return [];
        
        const refs = [];
        
        // For demo purposes, just check if the content mentions any supplemental spec codes
        supplementalSpecs.forEach(suppSpec => {
            if (content.includes(suppSpec.code)) {
                refs.push({
                    code: suppSpec.code,
                    title: suppSpec.title,
                    content: suppSpec.content
                });
            }
        });
        
        return refs;
    };

    /**
     * Get all specifications for a list of item matches
     * @param {Array} matches - Array of specification matches
     * @returns {Promise<Array>} - Promise resolving to array of full specifications
     */
    const getFullSpecifications = async (matches) => {
        // Ensure module is initialized
        if (!isInitialized) {
            await init();
        }

        // Extract unique spec references
        const uniqueSpecs = new Set();
        const uniqueSupplementals = new Set();
        
        matches.forEach(match => {
            if (match.specReference !== 'No specification found') {
                uniqueSpecs.add(match.specReference);
                
                match.supplementalRefs.forEach(suppRef => {
                    uniqueSupplementals.add(suppRef.code);
                });
            }
        });

        // Get full specification content
        const fullSpecs = Array.from(uniqueSpecs).map(specRef => {
            const spec = specifications.find(s => `${s.section} ${s.title}` === specRef);
            return spec || { 
                section: specRef,
                title: 'Unknown',
                content: 'Specification content not available'
            };
        });

        // Get full supplemental specifications
        const fullSupplementals = Array.from(uniqueSupplementals).map(code => {
            const suppSpec = supplementalSpecs.find(s => s.code === code);
            return suppSpec || {
                code: code,
                title: 'Unknown Supplemental Specification',
                content: 'Supplemental specification content not available'
            };
        });

        return {
            mainSpecs: fullSpecs,
            supplementalSpecs: fullSupplementals
        };
    };

    // Return public methods
    return {
        init,
        matchItems,
        getFullSpecifications
    };
})();
