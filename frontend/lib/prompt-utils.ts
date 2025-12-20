/**
 * Cleans system-generated prompts to display user-friendly text.
 * @param prompt The raw prompt string from the database.
 * @returns A cleaned, user-friendly prompt string.
 */
export function cleanPrompt(prompt: string): string {
    if (!prompt) return "Untitled";
    
    const p = prompt.trim();
    const lp = p.toLowerCase();
    
    // Check for "Restore Photo" system prompt
    if (lp.includes("critical task: restore")) return "Restore Old Photo";
    
    // Check for "Upscale Image" system prompt
    if (lp.includes("upscale this image")) return "Upscale Image";
    
    // Check for "Expand Image" system prompt
    if (lp.includes("expand the image with request:")) {
        const match = p.match(/request: (.*?)\. Expand/i);
        return match ? match[1] : p;
    }
    
    return p;
}

