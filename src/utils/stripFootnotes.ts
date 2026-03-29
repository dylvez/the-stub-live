/** Remove footnote references like [1], [2][3], [10] from AI-generated text */
export function stripFootnotes(text: string): string {
  return text.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
}
