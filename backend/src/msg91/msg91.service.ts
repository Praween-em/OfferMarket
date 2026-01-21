import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class Msg91Service {
    private readonly logger = new Logger(Msg91Service.name);
    private readonly authKey: string;
    private readonly templateId: string;
    private readonly baseUrl = 'https://control.msg91.com/api/v5/otp';

    constructor(private configService: ConfigService) {
        this.authKey = this.configService.get<string>('MSG91_AUTH_KEY')!;
        this.templateId = this.configService.get<string>('MSG91_TEMPLATE_ID')!;
    }

    async sendOtp(phone: string): Promise<any> {
        try {
            this.logger.log(`Initiating OTP send for ${phone}. ID: ${this.templateId}`);

            // We use the Standard GET API for everything as it is the most reliable
            // per our connectivity tests (Test 4 passed).
            const url = 'https://api.msg91.com/api/v5/otp';

            const response = await axios.get(url, {
                params: {
                    template_id: this.templateId,
                    mobile: phone,
                    authkey: this.authKey
                }
            });

            this.logger.log(`MSG91 Response: ${JSON.stringify(response.data)}`);

            if (response.data.type === 'error') {
                this.logger.error(`MSG91 Send Error Details: ${response.data.message}`);
                throw new HttpException(response.data.message, HttpStatus.BAD_REQUEST);
            }

            return response.data;

        } catch (error: any) {
            const errorStatus = error.response?.status || 500;
            const errorData = error.response?.data;
            this.logger.error(`Failed to send OTP via MSG91 [Status ${errorStatus}]. Error: ${JSON.stringify(errorData)}`);

            throw new HttpException(errorData?.message || 'OTP Service Error', errorStatus);
        }
    }

    // New method for verifying the Access Token from the Widget
    async verifyWidgetToken(token: string): Promise<boolean> {
        try {
            this.logger.log(`Verifying Widget Access Token: ${token}`);

            const url = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';
            const response = await axios.post(url, {
                "authkey": this.authKey,
                "access-token": token
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
            });

            this.logger.log(`MSG91 Token Verify Response: ${JSON.stringify(response.data)}`);

            if (response.data.type === 'success' || response.data.message === 'success' || response.data.message === 'Token verified successfully') {
                return true;
            }

            this.logger.warn(`Widget Token Verification Failed. Response: ${JSON.stringify(response.data)}`);
            return false;

        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message;
            this.logger.warn(`MSG91 Token Verify Exception: ${errorMsg}`);
            return false;
        }
    }

    async verifyOtp(phone: string, otp: string): Promise<boolean> {
        try {
            this.logger.log(`Verifying OTP ${otp} for ${phone}`);

            // MSG91 Verify OTP is a GET or POST to /verify
            // Using GET as it's the most common for verification
            const response = await axios.get(`${this.baseUrl}/verify`, {
                params: {
                    mobile: phone,
                    otp: otp,
                    authkey: this.authKey,
                },
                headers: {
                    'authkey': this.authKey
                }
            });

            this.logger.log(`MSG91 Verify Response: ${JSON.stringify(response.data)}`);

            if (response.data.type === 'success') {
                return true;
            }

            this.logger.warn(`OTP Verification Failed for ${phone}: ${response.data.message}`);
            return false;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message;
            this.logger.warn(`MSG91 Verify Exception: ${errorMsg}`);
            return false;
        }
    }
}
