import { NextResponse } from "next/server";

export async function GET() {
    // NEXT_PUBLIC_* variables are client-side and safe to use directly
    // They're validated at build time by Next.js
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
        return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    return NextResponse.json({ publicKey });
}
