// ================================
// Test Helpers
// ================================
// Utilities for testing React components and hooks

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // Don't retry failed queries in tests
                gcTime: 0, // Don't cache queries
            },
            mutations: {
                retry: false,
            },
        },
    });
}

// Mock session for testing
const mockSession = {
    user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

interface ProvidersProps {
    children: React.ReactNode;
    session?: typeof mockSession | null;
}

/**
 * Wrapper component with all providers for testing
 */
function Providers({ children, session = mockSession }: ProvidersProps) {
    const queryClient = createTestQueryClient();

    return (
        <SessionProvider session={session}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </SessionProvider>
    );
}

/**
 * Custom render function that wraps components with necessary providers
 * 
 * @example
 * const { getByText } = renderWithProviders(<MyComponent />);
 */
export function renderWithProviders(
    ui: React.ReactElement,
    options?: Omit<RenderOptions, 'wrapper'> & { session?: typeof mockSession | null }
) {
    const { session, ...renderOptions } = options || {};

    return render(ui, {
        wrapper: ({ children }) => <Providers session={session}>{children}</Providers>,
        ...renderOptions,
    });
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides?: Partial<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: 'USER' | 'ADMIN';
    status: 'ONLINE' | 'OFFLINE' | 'AWAY';
}>) {
    return {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        avatar: null,
        role: 'USER' as const,
        status: 'ONLINE' as const,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Create a mock room for testing
 */
export function createMockRoom(overrides?: Partial<{
    id: string;
    name: string;
    description: string;
    isGroup: boolean;
}>) {
    return {
        id: 'test-room-id',
        name: 'Test Room',
        description: 'A test room',
        isGroup: false,
        avatar: null,
        participants: [createMockUser()],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Create a mock message for testing
 */
export function createMockMessage(overrides?: Partial<{
    id: string;
    content: string;
    senderId: string;
    roomId: string;
}>) {
    const user = createMockUser();
    return {
        id: 'test-message-id',
        content: 'Hello, world!',
        type: 'TEXT' as const,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        roomId: 'test-room-id',
        createdAt: new Date().toISOString(),
        isEdited: false,
        isDeleted: false,
        reactions: {},
        ...overrides,
    };
}

/**
 * Wait for async operations in tests
 */
export function waitForAsync(ms = 0): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
