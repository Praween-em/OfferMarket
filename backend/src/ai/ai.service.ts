import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';


@Injectable()
export class AiService {
    constructor(private configService: ConfigService) { }

    async generateDescription(itemName: string, campaignTitle: string, shopName: string): Promise<string> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
        if (!apiKey) {
            console.warn('⚠️ GEMINI_API_KEY is missing');
            return 'Gemini API Key missing.';
        }

        const prompt = `Write a professional 4-sentence description for the product "${itemName}" as part of the "${campaignTitle}" sale at "${shopName}" for the app Ofera. 
        The description should be exciting, include cool emojis, and perfectly highlight the offer details. 
        If the product name is clear, specify its key specifications in bullet points. 
        Ensure the tone is tailored for a premium shopping app experience.`;

        try {
            console.log(`📡 Calling Gemini 2.0 Flash via v1beta API...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await axios.post(url, {
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                console.log(`✅ Success with gemini-2.0-flash`);
                return text.trim();
            }

            throw new Error('No text returned from Gemini');

        } catch (error: any) {
            console.error(`❌ Gemini API failed: ${error.message}`);

            if (error.response?.data?.error) {
                console.error('API Error details:', JSON.stringify(error.response.data.error));
            }

            if (error.response?.status === 429) {
                throw new InternalServerErrorException('AI Quota Exceeded. Please check your Google AI Console billing/limits.');
            }

            // Fallback content if API fails
            return `Don't miss out on this amazing ${itemName}! Available now as part of our ${campaignTitle}. Grab this exclusive deal before it's gone!`;
        }
    }
}
