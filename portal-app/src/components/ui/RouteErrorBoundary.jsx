/**
 * The boundary around the routed content (#378).
 *
 * Identical to ErrorBoundary except that it clears itself when the URL
 * changes. A plain boundary keeps its error state across an in-app
 * navigation - the router swaps the children, but this component stays
 * mounted - so once one page threw, every other page reached from the navbar
 * showed the crash screen too. Only the full page loads ("Go to home", a
 * manual reload) recovered.
 */

import { useLocation } from "react-router-dom";

import ErrorBoundary from "@/components/ui/ErrorBoundary";

export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary name="route" resetKeys={[pathname]}>
      {children}
    </ErrorBoundary>
  );
}
