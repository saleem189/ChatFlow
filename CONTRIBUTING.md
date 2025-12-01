# Contributing to ChatFlow

Thank you for your interest in contributing to ChatFlow! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Style Guide](#code-style-guide)
5. [Architecture Guidelines](#architecture-guidelines)
6. [Testing Guidelines](#testing-guidelines)
7. [Pull Request Process](#pull-request-process)

---

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git

### Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/chatflow.git
   cd chatflow
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp env-example.txt .env.local
   # Edit .env.local with your configuration
   ```

4. **Set Up Database**
   ```bash
   npm run docker:up
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start Development**
   ```bash
   npm run dev:all
   ```

---

## 🔄 Development Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates
- `test/description` - Test additions/updates

### Commit Messages
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(messages): add reply functionality
fix(socket): prevent duplicate messages
docs(api): update message endpoint documentation
refactor(services): extract message service
```

---

## 📝 Code Style Guide

### TypeScript
- Use TypeScript strict mode
- Prefer `interface` for object shapes
- Use `type` for unions, intersections, and aliases
- Avoid `any` - use `unknown` if type is truly unknown
- Use meaningful variable and function names

```typescript
// ✅ Good
interface Message {
  id: string;
  content: string;
  senderId: string;
}

function sendMessage(content: string, roomId: string): Promise<Message> {
  // ...
}

// ❌ Bad
function send(msg: any, room: any): any {
  // ...
}
```

### React Components
- Use functional components with hooks
- Extract complex logic into custom hooks
- Keep components small and focused
- Use TypeScript for props

```typescript
// ✅ Good
interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  onReply?: (messageId: string) => void;
}

export function MessageBubble({ message, isSent, onReply }: MessageBubbleProps) {
  // ...
}

// ❌ Bad
export function MessageBubble(props: any) {
  // ...
}
```

### File Organization
- One component/class per file
- Use barrel exports (`index.ts`) for clean imports
- Group related files in folders

```
components/
  chat/
    message-bubble.tsx
    message-input.tsx
    index.ts  # Barrel export
```

### Naming Conventions
- **Components**: PascalCase (`MessageBubble.tsx`)
- **Hooks**: camelCase with `use` prefix (`useMessages.ts`)
- **Services**: PascalCase (`MessageService.ts`)
- **Repositories**: PascalCase (`MessageRepository.ts`)
- **Utilities**: camelCase (`formatMessageTime.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_MESSAGE_LENGTH`)

---

## 🏗️ Architecture Guidelines

### Follow the Established Patterns

1. **Repository Pattern** for data access
   - Extend `BaseRepository`
   - Keep database logic isolated
   - Return typed entities

2. **Service Layer** for business logic
   - Coordinate between repositories
   - Handle validation
   - Manage transactions

3. **Custom Hooks** for React logic
   - Extract reusable component logic
   - Keep components clean
   - Handle side effects

4. **Error Handling**
   - Use custom error classes
   - Handle errors consistently
   - Provide meaningful error messages

### Example Structure

```typescript
// Repository (Data Access)
export class MessageRepository extends BaseRepository<Message> {
  async findByRoomId(roomId: string): Promise<Message[]> {
    // Database queries
  }
}

// Service (Business Logic)
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository
  ) {}
  
  async sendMessage(userId: string, roomId: string, content: string) {
    // Business logic, validation, coordination
  }
}

// API Route (Thin Layer)
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  const body = await request.json();
  const message = await messageService.sendMessage(...);
  return NextResponse.json({ message });
}

// Custom Hook (React Logic)
export function useMessages(roomId: string) {
  // React state, effects, socket listeners
}
```

### When Adding New Features

1. **Create Repository** (if new entity)
   ```typescript
   lib/repositories/your-entity.repository.ts
   ```

2. **Create Service** (business logic)
   ```typescript
   lib/services/your-entity.service.ts
   ```

3. **Create API Route** (thin layer)
   ```typescript
   app/api/your-entity/route.ts
   ```

4. **Create Custom Hook** (if needed)
   ```typescript
   hooks/use-your-entity.ts
   ```

5. **Create Components** (UI)
   ```typescript
   components/your-feature/your-component.tsx
   ```

---

## 🧪 Testing Guidelines

### Unit Tests
- Test services and repositories
- Mock dependencies
- Test edge cases

```typescript
// __tests__/services/message.service.test.ts
describe('MessageService', () => {
  it('should send message successfully', async () => {
    // Arrange
    const mockRepo = createMockRepository();
    const service = new MessageService(mockRepo);
    
    // Act
    const message = await service.sendMessage(userId, roomId, content);
    
    // Assert
    expect(message).toBeDefined();
    expect(mockRepo.create).toHaveBeenCalled();
  });
});
```

### Integration Tests
- Test API routes
- Test database operations
- Use test database

### Component Tests
- Test user interactions
- Test rendering
- Use React Testing Library

---

## 🔍 Pull Request Process

### Before Submitting

1. **Update Documentation**
   - Update README if needed
   - Add JSDoc comments
   - Update CHANGELOG

2. **Run Tests**
   ```bash
   npm test
   npm run type-check
   npm run lint
   ```

3. **Check Code Style**
   ```bash
   npm run format
   ```

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Follows architecture patterns
- [ ] Commit messages follow convention

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test the changes

## Related Issues
Closes #123
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback
3. Once approved, PR will be merged
4. Thank you for contributing! 🎉

---

## 📚 Additional Resources

- [Architecture Guide](./ARCHITECTURE_GUIDE.md)
- [Implementation Examples](./IMPLEMENTATION_EXAMPLES.md)
- [API Documentation](./API.md) (if exists)

---

## ❓ Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

---

**Thank you for contributing to ChatFlow!** 🚀

