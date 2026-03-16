export type PreviewUpdateAction = 'clear' | 'replace';

export function getPreviewUpdateAction(
  currentKey: string,
  sourceKey: string | null,
  hasContent: boolean,
  replaceExisting = false
): PreviewUpdateAction {
  if (!hasContent || !sourceKey) {
    return 'clear';
  }
  if (!replaceExisting && currentKey === sourceKey) {
    return 'clear';
  }
  return 'replace';
}
