
import { schedule } from '@netlify/functions';
import { main } from '../../lib/generateContent';

export const handler = schedule('0 * * * *', async () => {
    await main();
    return { statusCode: 200 };
});
