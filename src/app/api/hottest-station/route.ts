import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getHottestMetar } from '../../../lib/queries';

export const runtime = 'edge'; // 'nodejs' is the default

export async function GET(request: NextRequest) {
    const hottest_metar = await getHottestMetar()

    return NextResponse.json(
        {
            body: hottest_metar,
        },
        {
            status: 200,
        },
    );
}