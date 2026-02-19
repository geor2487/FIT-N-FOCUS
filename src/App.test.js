import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', async () => {
  render(<App />);
  const titleElement = await screen.findByText(/FIT N' FOCUS/i);
  expect(titleElement).toBeInTheDocument();
});
