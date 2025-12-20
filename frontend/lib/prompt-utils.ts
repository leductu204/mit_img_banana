/**
 * Cleans system-generated prompts to display user-friendly text.
 * @param prompt The raw prompt string from the database.
 * @returns A cleaned, user-friendly prompt string.
 */
export function cleanPrompt(prompt: string): string {
    if (!prompt) return "Untitled";
    
    // Check for "Restore Photo" system prompt
    if (prompt.includes("CRITICAL TASK: Restore")) return "Restore Old Photo";
    
    // Check for "Upscale Image" system prompt
    if (prompt.includes("Upscale this image")) return "Upscale Image";
    
    // Check for "Expand Image" system prompt
    if (prompt.includes("Expand the image with request:")) {
        const match = prompt.match(/request: (.*?)\. Expand/);
        return match ? match[1] : prompt;
    }
    
    return prompt;
}
