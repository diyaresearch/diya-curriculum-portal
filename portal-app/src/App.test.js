import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app shell', () => {
  // App is served at the site root (no basename); set a matching URL for BrowserRouter.
  window.history.pushState({}, "Test", "/");
  render(<App />);
  expect(screen.getByText("DIYA Ed Portal")).toBeInTheDocument();
});
