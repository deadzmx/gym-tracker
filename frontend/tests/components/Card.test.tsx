import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../../src/components/Card';

describe('Card', () => {
  it('renders children inside the body', () => {
    render(
      <Card>
        <p>body content</p>
      </Card>,
    );
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('shows title and description in header when provided', () => {
    render(<Card title="标题" description="描述" actions={<button>动作</button>} />);
    expect(screen.getByText('标题')).toBeInTheDocument();
    expect(screen.getByText('描述')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '动作' })).toBeInTheDocument();
  });

  it('omits header when no title and no actions', () => {
    const { container } = render(<Card>only body</Card>);
    // no border-b on the card root when no header is rendered
    const root = container.firstChild as HTMLElement;
    expect(root.querySelector('.border-b')).toBeNull();
  });
});
