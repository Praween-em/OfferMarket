
require('dotenv').config();
const axios = require('axios');

async function testMsg91() {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const phone = '918374277617'; // Number from logs

    console.log('Testing MSG91 ---------------------------------');
    console.log('AuthKey:', authKey ? 'Present' : 'Missing');
    console.log('TemplateId:', templateId);
    console.log('Phone:', phone);

    const url = 'https://api.msg91.com/api/v5/otp';

    try {
        console.log('Sending Request...');
        const response = await axios.post(url, null, {
            params: {
                template_id: templateId,
                mobile: phone,
                authkey: authKey,
                otp: '1234'
            }
        });

        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('Error Occurred during SEND!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
    }

    console.log('\nWaiting 2 seconds before verifying...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Verifying (expecting failure or mismatch, but NOT "Mobile not found")...');
    const verifyUrl = 'https://api.msg91.com/api/v5/otp/verify';
    try {
        const verifyResponse = await axios.get(verifyUrl, {
            params: {
                mobile: phone,
                otp: '0000', // Wrong OTP
                authkey: authKey
            }
        });
        console.log('Verify Response:', JSON.stringify(verifyResponse.data, null, 2));
    } catch (error) {
        console.log('Verify Request Failed (Expected if OTP is wrong)');
        if (error.response) {
            console.log('Verify Status:', error.response.status);
            console.log('Verify Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Verify Error:', error.message);
        }
    }
}

testMsg91();
