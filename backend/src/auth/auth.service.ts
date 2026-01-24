
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Msg91Service } from '../msg91/msg91.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private msg91: Msg91Service,
    ) { }

    async sendOtp(phone: string) {
        // Optional: Check if phone is valid or if user is banned before sending
        return this.msg91.sendOtp(phone);
    }

    async verifyTokenAndLogin(phone: string, token: string) {
        // 1. Verify Widget Access Token with MSG91
        const isValid = await this.msg91.verifyWidgetToken(token);
        if (!isValid) {
            throw new BadRequestException('Invalid or expired Widget Token');
        }

        // 2. Once verified, perform the login/registration logic
        return this.login(phone);
    }

    async verifyAndLogin(phone: string, otp: string) {
        // 0. Development Bypass
        const bypassOtp = process.env.DEV_OTP_BYPASS;
        if (bypassOtp && otp === bypassOtp) {
            console.log(`[AuthService] Bypassing OTP verification for ${phone} using DEV_OTP_BYPASS`);
            return this.login(phone);
        }

        // 1. Verify OTP with MSG91
        const isValid = await this.msg91.verifyOtp(phone, otp);
        if (!isValid) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        // 2. Once verified, perform the login/registration logic
        return this.login(phone);
    }

    private async login(phone: string) {
        // 1. Check if user exists
        let user = await this.prisma.users.findUnique({
            where: { phone },
        });

        // 2. If not, create them
        if (!user) {
            user = await this.prisma.users.create({
                data: {
                    phone,
                    role: 'consumer',
                    status: 'active',
                },
            });
        }

        if (user.status !== 'active') {
            throw new UnauthorizedException('User is suspended or banned');
        }

        // 3. Generate Token
        const payload = { sub: user.id, role: user.role };
        const access_token = this.jwtService.sign(payload);

        return {
            access_token,
            user: {
                id: user.id,
                phone: user.phone,
                role: user.role,
                display_name: user.display_name,
            },
        };
    }

    async onboard(userId: string, data: { ownerName: string; businessName: string; gstNumber?: string; category: any; whatsappNumber: string }) {
        // 1. Update User
        const user = await this.prisma.users.update({
            where: { id: userId },
            data: {
                display_name: data.ownerName,
                role: 'business_owner',
            },
        });

        // 2. Create or Update Business
        // We use upsert in case they are re-submitting or if they somehow already have a business record
        // Note: owner_id_business_name is a unique constraint in schema.prisma
        const business = await this.prisma.businesses.upsert({
            where: {
                owner_id_business_name: {
                    owner_id: userId,
                    business_name: data.businessName,
                }
            },
            update: {
                business_type: data.category,
                gst_number: data.gstNumber,
                whatsapp_number: data.whatsappNumber,
            },
            create: {
                owner_id: userId,
                business_name: data.businessName,
                business_type: data.category,
                gst_number: data.gstNumber,
                whatsapp_number: data.whatsappNumber,
            },
        });

        // 3. Ensure central branch exists for this business
        const branchCount = await this.prisma.business_branches.count({
            where: { business_id: business.id },
        });

        if (branchCount === 0) {
            await this.prisma.business_branches.create({
                data: {
                    business_id: business.id,
                    branch_name: 'Main Store',
                    city: 'Default City',
                    address_line: 'Update address in settings',
                    is_active: true,
                },
            });
        }

        return {
            success: true,
            user: {
                id: user.id,
                phone: user.phone,
                role: user.role,
                display_name: user.display_name,
            },
            business,
        };
    }
}
