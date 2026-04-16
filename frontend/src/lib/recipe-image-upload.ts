/** Read file as data URL for POST /recipes/:id/dish-image */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === "string") resolve(r.result);
      else reject(new Error("Could not read image"));
    };
    r.onerror = () => reject(new Error("Could not read image"));
    r.readAsDataURL(file);
  });
}
