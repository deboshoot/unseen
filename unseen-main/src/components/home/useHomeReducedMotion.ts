import { useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/** A local preview can opt into motion without changing system preferences. */
export function useHomeReducedMotion() {
  const reduced = useReducedMotion();
  const { search } = useLocation();
  const fullPreview = import.meta.env.DEV && new URLSearchParams(search).get('motion') === 'full';
  return Boolean(reduced) && !fullPreview;
}
