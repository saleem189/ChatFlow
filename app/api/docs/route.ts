/**
 * API Documentation Endpoint
 * GET /api/docs - Returns OpenAPI/Swagger documentation
 */

import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Chat Application API',
    version: '1.0.0',
    description: 'RESTful API for the Chat Application built with Next.js 16',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      description: 'Production server',
    },
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          statusCode: {
            type: 'number',
            description: 'HTTP status code',
          },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string', maxLength: 2000 },
          type: { type: 'string', enum: ['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'AUDIO'] },
          fileUrl: { type: 'string', nullable: true },
          fileName: { type: 'string', nullable: true },
          fileSize: { type: 'number', nullable: true },
          fileType: { type: 'string', nullable: true },
          senderId: { type: 'string' },
          roomId: { type: 'string' },
          isEdited: { type: 'boolean' },
          isDeleted: { type: 'boolean' },
          replyToId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Room: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          isGroup: { type: 'boolean' },
          avatar: { type: 'string', nullable: true },
          ownerId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          avatar: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          status: { type: 'string', enum: ['ONLINE', 'OFFLINE', 'AWAY'] },
          lastSeen: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/messages': {
      get: {
        summary: 'Get messages for a room',
        description: 'Retrieve paginated messages for a specific chat room',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'roomId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Room ID',
          },
          {
            name: 'cursor',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Pagination cursor',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'number', default: 50 },
            description: 'Number of messages to retrieve',
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    messages: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Message' },
                    },
                    hasMore: { type: 'boolean' },
                    nextCursor: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Send a message',
        description: 'Create and send a new message to a room',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['roomId', 'content'],
                properties: {
                  roomId: { type: 'string' },
                  content: { type: 'string', maxLength: 2000 },
                  fileUrl: { type: 'string', nullable: true },
                  fileName: { type: 'string', nullable: true },
                  fileSize: { type: 'number', nullable: true },
                  fileType: { type: 'string', nullable: true },
                  replyToId: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Message created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Message' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/messages/search': {
      get: {
        summary: 'Search messages',
        description: 'Search messages in a room using full-text search',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'roomId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'query',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 3 },
            description: 'Search query (minimum 3 characters)',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'number', default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    messages: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Message' },
                    },
                    count: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/rooms': {
      get: {
        summary: 'Get user rooms',
        description: 'Retrieve all rooms for the authenticated user',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rooms: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Room' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a room',
        description: 'Create a new chat room',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'participantIds'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  isGroup: { type: 'boolean', default: false },
                  participantIds: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Room created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Room' },
              },
            },
          },
        },
      },
    },
    '/api/users': {
      get: {
        summary: 'Get all users',
        description: 'Retrieve a list of all users (for search/selection)',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search by name or email',
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/upload': {
      post: {
        summary: 'Upload a file',
        description: 'Upload a file (image, video, document, etc.)',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload (max 10MB)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'File uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    fileUrl: { type: 'string' },
                    fileName: { type: 'string' },
                    fileSize: { type: 'number' },
                    fileType: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request - Invalid file',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

