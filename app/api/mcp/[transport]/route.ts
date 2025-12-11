import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';
import { saveEvent, getEvent, getAllEvents } from '@/lib/db';

// Create the MCP handler with event tools
const handler = createMcpHandler(
  async (server) => {
    // Tool: Create a new event
    server.tool(
      'create_event',
      'Creates a new event with a name, description, and fire date/time',
      {
        name: z.string().min(1, 'Event name is required'),
        description: z.string().min(1, 'Event description is required'),
        fireAt: z.string().datetime('Must be a valid ISO 8601 datetime string'),
      },
      async ({ name, description, fireAt }) => {
        try {
          const fireAtDate = new Date(fireAt);
          const event = await saveEvent(name, description, fireAtDate);
          return {
            content: [
              {
                type: 'text',
                text: `Event created successfully! Event ID: ${event.id}, Name: ${event.name}, Fires at: ${event.fireAt.toISOString()}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating event: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Get event by ID
    server.tool(
      'get_event',
      'Retrieves a specific event by its ID',
      {
        eventId: z.string().min(1, 'Event ID is required'),
      },
      async ({ eventId }) => {
        try {
          const event = await getEvent(eventId);

          if (!event) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Event with ID ${eventId} not found`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `Event Details:\nID: ${event.id}\nName: ${event.name}\nDescription: ${event.description}\nCreated: ${event.createdAt.toISOString()}\nFires At: ${event.fireAt.toISOString()}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error retrieving event: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Get all events
    server.tool(
      'list_events',
      'Retrieves all events, sorted by fire date in ascending order',
      {},
      async () => {
        try {
          const events = await getAllEvents();

          if (events.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No events found',
                },
              ],
            };
          }

          const eventsList = events
            .map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (event:any) =>
                `- ${event.name} (ID: ${event.id})\n  Description: ${event.description}\n  Fires At: ${event.fireAt.toISOString()}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `Found ${events.length} event(s):\n\n${eventsList}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error retrieving events: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
  {
    serverInfo: {
      name: 'Event Manager MCP Server',
      version: '1.0.0',
    },
  },
  {
    basePath: '/api/mcp',
  }
);

export { handler as GET, handler as POST, handler as DELETE };


