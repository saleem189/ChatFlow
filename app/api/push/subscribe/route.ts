import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { PushService } from "@/lib/services/push.service";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return handleError(new UnauthorizedError('You must be logged in'));
        }

        const body = await request.json();
        const { subscription } = body;

        if (!subscription) {
            return handleError(new ValidationError('Subscription data is required'));
        }

        const pushService = await getService<PushService>('pushService');
        await pushService.saveSubscription(session.user.id, subscription);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleError(error);
    }
}
