/**
 * LA DOTD Specification Manager - Utilities Module
 * 
 * This module provides common utility functions used throughout the application.
 */

const Utils = (() => {
    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    const escapeHtml = (str) => {
        if (!str) return '';
        
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    /**
     * Format a date as a string
     * @param {Date} date - Date object to format
     * @returns {string} - Formatted date string (MM/DD/YYYY)
     */
    const formatDate = (date) => {
        if (!date) return '';
        
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${month}/${day}/${year}`;
    };

    /**
     * Debounce a function to limit how often it can be called
     * @param {Function} func - Function to debounce
     * @param {number} wait - Time to wait in milliseconds
     * @returns {Function} - Debounced function
     */
    const debounce = (func, wait) => {
        let timeout;
        
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    /**
     * Create a UUID v4
     * @returns {string} - UUID string
     */
    const uuidv4 = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    /**
     * Convert a string to title case
     * @param {string} str - String to convert
     * @returns {string} - Title case string
     */
    const toTitleCase = (str) => {
        if (!str) return '';
        
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    /**
     * Format a number with commas as thousands separators
     * @param {number} num - Number to format
     * @returns {string} - Formatted number string
     */
    const formatNumber = (num) => {
        if (num === null || num === undefined) return '';
        
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    /**
     * Check if a string is valid JSON
     * @param {string} str - String to check
     * @returns {boolean} - True if valid JSON
     */
    const isValidJSON = (str) => {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    };

    /**
     * Get file extension from a filename
     * @param {string} filename - Filename
     * @returns {string} - File extension (lowercase, without dot)
     */
    const getFileExtension = (filename) => {
        if (!filename) return '';
        
        return filename.split('.').pop().toLowerCase();
    };

    // Return public methods
    return {
        escapeHtml,
        formatDate,
        debounce,
        uuidv4,
        toTitleCase,
        formatNumber,
        isValidJSON,
        getFileExtension
    };
})();
