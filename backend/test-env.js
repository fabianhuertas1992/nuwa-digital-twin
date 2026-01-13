// test-env.js
import dotenv from 'dotenv';

dotenv.config();

console.log('✅ Puerto:', process.env.PORT);
console.log('✅ Python Path:', process.env.PYTHON_PATH);
console.log('✅ Node Env:', process.env.NODE_ENV);
console.log('✅ Database URL:', process.env.DATABASE_URL);