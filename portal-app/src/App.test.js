import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app shell', () => {
  // App uses basename="/diya-ed"; set a matching URL for BrowserRouter.
  window.history.pushState({}, "Test", "/diya-ed/");
  render(<App />);
  expect(screen.getByText("DIYA Ed Portal")).toBeInTheDocument();
});
