
import 'dotenv/config';
import { main } from '../netlify/functions/generateContent';

// Force enable for local testing
process.env.CONTENT_AUTOMATION_ENABLED = 'true';

console.log('--- Running Local Content Generation ---');
main().catch(console.error);
