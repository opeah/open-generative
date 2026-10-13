import { NextResponse } from 'next/server';
import { getProviderTransport, proxyProviderRequest } from 'studio/providers/server';

// Proxies /api/providers/<provider>/<upstream>/<path> to the provider's API,
// turning the x-provider-credential header into the provider's auth scheme.
// MuAPI keeps its historical routes (/api/v1, /api/workflow, …).
async function handle(request, { params }) {
    const { provider, upstream, path = [] } = await params;
    const transport = getProviderTransport(provider);
    if (!transport) {
        return NextResponse.json({ error: `Unknown provider "${provider}"` }, { status: 404 });
    }
    return proxyProviderRequest(request, transport, { upstream, path: path.map(encodeURIComponent).join('/') });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
