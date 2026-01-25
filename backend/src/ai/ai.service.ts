import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
    private readonly apiKey: string;
    private readonly apiUrl = 'https://api.deepseek.com/chat/completions';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
    }

    async generateDescription(itemName: string, campaignTitle: string): Promise<string> {
        if (!this.apiKey) {
            return 'DeepSeek API Key not configured. Please add DEEPSEEK_API_KEY to your .env file.';
        }

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that writes catchy and professional product descriptions for a marketplace app called OfferMarket. The description should be concise (max 2-3 sentences), highlighting the benefits and why the customer should grab the offer.',
                        },
                        {
                            role: 'user',
                            content: `Write a product description for "${itemName}" which is part of an offer campaign titled "${campaignTitle}". Keep it engaging and professional.`,
                        },
                    ],
                    max_tokens: 150,
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('DeepSeek API Error:', error.response?.data || error.message);
            throw new Error('Failed to generate description from AI');
        }
    }
}
