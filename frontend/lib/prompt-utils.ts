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
    
    // Check for "Product Photoshoot" pattern: "Product photoshoot with background: [user input]. Keep product..."
    if (lp.includes("product photoshoot with background:")) {
        const match = p.match(/background:\s*(.*?)\.\s*Keep product/i);
        return match ? match[1] : p;
    }
    
    // Check for "Product Backgrounds" pattern: "Change background to: [user input]. Product unchanged..."
    if (lp.includes("change background to:")) {
        const match = p.match(/change background to:\s*(.*?)\.\s*Product unchanged/i);
        return match ? match[1] : p;
    }
    
    // Check for "CRITICAL TASK" prompts (Product Photoshoot old format)
    if (lp.includes("critical task: create a professional product")) {
        const sceneMatch = p.match(/scene:\s*([^\n]+)/i);
        return sceneMatch ? sceneMatch[1].trim() : "Product Photoshoot";
    }
    
    return p;
}

