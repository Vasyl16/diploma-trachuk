export declare function buildDishImagePrompt(title: string, dishType?: string): string;
export declare function fetchPollinationsDishImage(prompt: string, options: {
    width: number;
    height: number;
    model: string;
}): Promise<{
    buffer: Buffer;
    contentType: string;
}>;
