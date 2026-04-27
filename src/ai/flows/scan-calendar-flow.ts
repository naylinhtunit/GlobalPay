'use server';
/**
 * @fileOverview A calendar scanning AI agent using Gemini Vision.
 *
 * - scanCalendar - A function that extracts dates and holiday names from a photo of a calendar.
 * - ScanCalendarInput - The input type for the scanCalendar function.
 * - ScanCalendarOutput - The return type for the scanCalendar function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScanCalendarInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a calendar paper, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanCalendarInput = z.infer<typeof ScanCalendarInputSchema>;

const CalendarEventSchema = z.object({
  date: z.string().describe('The date in YYYY-MM-DD format.'),
  title: z.string().describe('The name of the holiday or event.'),
  isWorkday: z.boolean().describe('Whether this is a workday or a holiday.'),
});

const ScanCalendarOutputSchema = z.object({
  events: z.array(CalendarEventSchema).describe('The list of detected calendar events and holidays.'),
  detectedMonth: z.string().optional().describe('The month detected in the calendar image (e.g., "April 2024").'),
});
export type ScanCalendarOutput = z.infer<typeof ScanCalendarOutputSchema>;

const prompt = ai.definePrompt({
  name: 'scanCalendarPrompt',
  input: { schema: ScanCalendarInputSchema },
  output: { schema: ScanCalendarOutputSchema },
  prompt: `You are an expert AI assistant specializing in OCR and document analysis for Japanese company calendars.

I will provide a photo of a company calendar (usually a paper calendar showing a specific month).
Your task is to identify all specific dates marked as holidays, special events, or non-working days.

Rules:
1. Identify the year and month if visible.
2. Extract the specific dates and their titles (e.g., "Company Anniversary", "Summer Holiday").
3. Determine if the day is a working day or not.
4. Output the results in a structured JSON format.

Photo: {{media url=photoDataUri}}`,
});

const scanCalendarFlow = ai.defineFlow(
  {
    name: 'scanCalendarFlow',
    inputSchema: ScanCalendarInputSchema,
    outputSchema: ScanCalendarOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function scanCalendar(input: ScanCalendarInput): Promise<ScanCalendarOutput> {
  return scanCalendarFlow(input);
}
