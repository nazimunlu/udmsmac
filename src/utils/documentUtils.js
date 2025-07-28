/**
 * Utility functions for handling document operations
 */

/**
 * Opens a document in a new tab or downloads it if it's a blob
 * @param {string} url - The document URL
 * @param {string} fileName - The name of the file
 * @param {string} fileType - The type of file (optional)
 */
export const openDocument = async (url, fileName, fileType = null) => {
    try {
        // Check if the URL exists
        if (!url) {
            console.error('No document URL provided');
            return;
        }

        // Try to open directly in new tab first (most reliable method)
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
            // If popup is blocked, try to fetch and download
            console.log('Popup blocked, trying download method...');
            downloadDocument(url, fileName);
        }
    } catch (error) {
        console.error('Error opening document:', error);
        
        // Final fallback: try direct link
        try {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (fallbackError) {
            console.error('All document opening methods failed:', fallbackError);
        }
    }
};

/**
 * Downloads a document
 * @param {string} url - The document URL
 * @param {string} fileName - The name of the file
 */
export const downloadDocument = async (url, fileName) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch document');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName || 'document';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Download failed:', error);
        
        // Final fallback: direct link
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'document';
        link.target = '_blank';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Validates if a URL is a valid Supabase storage URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid
 */
export const isValidDocumentUrl = (url) => {
    if (!url) return false;
    
    // Check if it's a valid URL
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}; 