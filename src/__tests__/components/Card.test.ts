import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Card from '../../components/Card.svelte';
import CardTestWrapper from './CardTestWrapper.svelte';

describe('Card Component', () => {
    it('should render the title if provided', () => {
        render(Card, { title: 'Test Title' });
        expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('should apply the variant class', () => {
        const { container } = render(Card, { variant: 'dump' });
        const card = container.querySelector('.todo-flow-card');
        expect(card).toBeTruthy();
        expect(card?.classList.contains('variant-dump')).toBe(true);
    });

    it('should render slots correctly via wrapper', () => {
        render(CardTestWrapper);
        expect(screen.getByTestId('default-slot')).toBeTruthy();
        expect(screen.getByTestId('actions-slot')).toBeTruthy();
    });
});
