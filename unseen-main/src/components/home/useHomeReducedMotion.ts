import { useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/** Local development previews motion by default; production respects the OS preference. */
export function useHomeReducedMotion() {
  const reduced = useReducedMotion();
  const { search } = useLocation();
  const fullPreview = import.meta.env.DEV && new URLSearchParams(search).get('motion') !== 'reduced';
  return Boolean(reduced) && !fullPreview;
}
