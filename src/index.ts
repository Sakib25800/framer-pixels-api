function getCORSAllowOriginHeader(request: Request, env: Env) {
	const origin = request.headers.get('Origin');
	if (!origin) return '*';

	const originURL = new URL(origin);

	// Allow localhost
	if (originURL.hostname === 'localhost') {
		return originURL.origin;
	}

	// Allow anything ending in framercdn.com
	if (originURL.hostname.endsWith('framercdn.com')) {
		return originURL.origin;
	}

	return '*';
}

function addCorsHeaders(request: Request, response: Response, env: Env) {
	const headers = new Headers(response.headers);

	headers.set('Access-Control-Allow-Origin', getCORSAllowOriginHeader(request, env));
	headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');

	return new Response(response.body, {
		headers: headers,
		status: response.status,
		statusText: response.statusText,
	});
}

async function handleRequest(request: Request, env: Env) {
	try {
		// Forward to Pexels API
		const pexelsBaseUrl = 'https://api.pexels.com/v1';
		const requestUrl = new URL(request.url);

		// Create new request to Pexels
		const pexelsUrl = new URL(requestUrl.pathname + requestUrl.search, pexelsBaseUrl);
		console.log('Forwarding to Pexels:', pexelsUrl.toString());

		const pexelsRequest = new Request(pexelsUrl, {
			method: request.method,
			headers: {
				Authorization: env.PEXELS_API_KEY,
			},
		});

		const response = await fetch(pexelsRequest);
		if (!response.ok) {
			throw new Error(`Pexels API responded with ${response.status}`);
		}

		return response;
	} catch (error) {
		console.error('Error in handleRequest:', error);
		throw error;
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return addCorsHeaders(request, new Response(null, { status: 204 }), env);
		}

		try {
			const response = await handleRequest(request, env);
			return addCorsHeaders(request, response, env);
		} catch (error) {
			console.error('Error in fetch:', error);
			const message = error instanceof Error ? error.message : 'Unknown';
			const errorResponse = new Response(`😔 Internal error: ${message}`, {
				status: 500,
			});
			return addCorsHeaders(request, errorResponse, env);
		}
	},
};
