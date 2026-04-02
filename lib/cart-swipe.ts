/** Positive deltaX = drag right (reveal delete). */
export const CART_SWIPE_REMOVE_THRESHOLD_PX = 72;

export function shouldRemoveCartItemBySwipe(
  deltaX: number,
  thresholdPx: number = CART_SWIPE_REMOVE_THRESHOLD_PX
): boolean {
  return deltaX >= thresholdPx;
}
