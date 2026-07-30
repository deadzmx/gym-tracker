import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../src/components/Button';

describe('Button', () => {
  it('renders children and is clickable', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>点我</Button>);
    const btn = screen.getByRole('button', { name: '点我' });
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        保存
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders spinner while loading', () => {
    render(<Button loading>保存</Button>);
    const btn = screen.getByRole('button');
    expect(btn.querySelector('span[aria-hidden="true"]')).toBeTruthy();
    expect(btn).toHaveAttribute('data-loading');
  });

  it('applies variant class', () => {
    render(<Button variant="danger">删除</Button>);
    expect(screen.getByRole('button').className).toMatch(/rose/);
  });
});
