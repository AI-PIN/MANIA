import ManiaApp from "./blend/ManiaApp";
import ErrorBoundary from "./blend/ErrorBoundary";
import { BASKETS } from "./blend/config";

export default function App() {
  return (
    <ErrorBoundary>
      <ManiaApp config={BASKETS.mania} />
    </ErrorBoundary>
  );
}
