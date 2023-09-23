import { getHottestMadis } from '@/lib/queries';

export const runtime = 'edge'; // 'nodejs' is the default

export async function GET() {
    const hottest_madis = await getHottestMadis()

    const response = Response.json(hottest_madis, {
            status: 200,
            headers: {
                'Cache-Control': 'max-age=300',
                'CDN-Cache-Control': 'max-age=600',
                'Vercel-CDN-Cache-Control': 'max-age=600',
            },
        });

    return response;
}