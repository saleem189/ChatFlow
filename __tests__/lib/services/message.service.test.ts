/**
 * MessageService Unit Tests
 * 
 * Tests for the MessageService business logic layer
 */

import { MessageService } from '@/lib/services/message.service';
import { MessageRepository } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import type { ILogger } from '@/lib/logger/logger.interface';
import type { CacheService } from '@/lib/cache/cache.service';

// Mock dependencies
const mockMessageRepo = {
  findByRoomId: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
} as unknown as MessageRepository;

const mockRoomRepo = {
  findById: jest.fn(),
  isParticipant: jest.fn(),
} as unknown as RoomRepository;

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  performance: jest.fn(),
} as unknown as ILogger;

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  invalidate: jest.fn(),
  getOrSet: jest.fn(),
} as unknown as CacheService;

describe('MessageService', () => {
  let messageService: MessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    messageService = new MessageService(
      mockMessageRepo,
      mockRoomRepo,
      mockLogger,
      mockCacheService,
      {} as any, // messageNotificationService
      {} as any, // messageReactionService
      {} as any  // messageReadService
    );
  });

  describe('getMessages', () => {
    it('should return messages for a valid room and user', async () => {
      const mockMessages = [
        {
          id: 'msg1',
          content: 'Hello',
          roomId: 'room1',
          senderId: 'user1',
          createdAt: new Date(),
        },
      ];

      (mockRoomRepo.isParticipant as jest.Mock).mockResolvedValue(true);
      (mockMessageRepo.findByRoomId as jest.Mock).mockResolvedValue(mockMessages);

      const result = await messageService.getMessages('room1', 'user1', { limit: 50 });

      expect(result.messages).toHaveLength(1);
      expect(mockRoomRepo.isParticipant).toHaveBeenCalledWith('room1', 'user1');
      expect(mockMessageRepo.findByRoomId).toHaveBeenCalled();
    });

    it('should throw ForbiddenError if user is not a participant', async () => {
      (mockRoomRepo.isParticipant as jest.Mock).mockResolvedValue(false);

      await expect(
        messageService.getMessages('room1', 'user1')
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('sendMessage', () => {
    it('should create and return a message', async () => {
      const mockMessage = {
        id: 'msg1',
        content: 'Test message',
        roomId: 'room1',
        senderId: 'user1',
        createdAt: new Date(),
      };

      (mockRoomRepo.isParticipant as jest.Mock).mockResolvedValue(true);
      (mockMessageRepo.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage('user1', 'room1', 'Test message');

      expect(result).toBeDefined();
      expect(mockMessageRepo.create).toHaveBeenCalled();
    });

    it('should throw ValidationError for empty content', async () => {
      await expect(
        messageService.sendMessage('user1', 'room1', '')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('searchMessages', () => {
    it('should search messages in a room', async () => {
      const mockResults = [
        {
          id: 'msg1',
          content: 'search term found',
          roomId: 'room1',
        },
      ];

      (mockRoomRepo.isParticipant as jest.Mock).mockResolvedValue(true);
      (mockMessageRepo.search as jest.Mock).mockResolvedValue(mockResults);

      const result = await messageService.searchMessages('room1', 'user1', 'search term');

      expect(result).toHaveLength(1);
      expect(mockMessageRepo.search).toHaveBeenCalledWith('room1', 'search term', 20);
    });

    it('should throw ValidationError for query too short', async () => {
      await expect(
        messageService.searchMessages('room1', 'user1', 'ab')
      ).rejects.toThrow(ValidationError);
    });
  });
});

