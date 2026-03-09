import https from 'https';
import querystring from 'querystring';

const API_URL = 'https://precisepipe-api.activatortube.com/front-api/pc/airtable/testCreateChannelQuote';

function generateUniqueParams() {
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:.T]/g, '-').toLowerCase();
    const uniqueId = `${dateStr}_${timestamp}`;
    
    return {
        channelName: `quote-${uniqueId}`,
        emailTitle: `test create channel ${uniqueId}`,
        compliance: 'Lee',
        sales: 'Lee',
        internCompliance: '',
        buyer: 'Justin Crawford'
    };
}

function createChannelQuote(params) {
    return new Promise((resolve, reject) => {
        const queryString = querystring.stringify(params);
        const url = `${API_URL}?${queryString}`;
        
        const options = {
            method: 'POST',
            // headers: {
            //     'loginVerify': 'eyJpZCI6InJlY0VhSVFuTWpzaDRheDc2IiwidHlwZSI6IlBPIiwia2V5IjoiMjcxZDY1ZTVlOGJkNGY5MWEwYWMyNWVjOThlNzYzYzcifQ==',
            //     'Pagefrom': 'PO'
            // }
        };
        
        const req = https.request(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    success: res.statusCode >= 200 && res.statusCode < 300,
                    timestamp: new Date().toISOString(),
                    params: params,
                    status: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers,
                    data: data,
                    dataLength: data.length
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                timestamp: new Date().toISOString(),
                params: params,
                error: error.message
            });
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            resolve({
                success: false,
                timestamp: new Date().toISOString(),
                params: params,
                error: 'Request timeout'
            });
        });
        
        req.end();
    });
}

async function main() {
    console.log('调用 API...\n');
    
    const params = generateUniqueParams();
    console.log('请求参数:', params);
    
    const result = await createChannelQuote(params);
    
    console.log('\n========================================');
    console.log('响应结果:');
    console.log('========================================');
    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
