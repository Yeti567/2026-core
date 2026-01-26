
const fetch = require('node-fetch');

const data = {
    company_name: 'Apex Safety Solutions',
    wsib_number: '123456789',
    company_email: 'admin@apexsafety.com',
    address: '123 Safety Way',
    city: 'Toronto',
    province: 'ON',
    postal_code: 'M5V 2L7',
    phone: '416-555-0199',
    industry: 'concrete_construction',
    employee_count: 10,
    years_in_business: 5,
    main_services: ['Foundations'],
    registrant_name: 'Blake Agent',
    registrant_position: 'owner',
    registrant_email: 'blake@apexsafety.com'
};

async function testRegistration() {
    try {
        console.log('Testing registration on http://localhost:3003/api/register...');
        const response = await fetch('http://localhost:3003/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        console.log('Status:', response.status);
        const result = await response.json();
        console.log('Response:', JSON.stringify(result, null, 2));

        if (response.ok) {
            console.log('SUCCESS: Registration API is working!');
        } else {
            console.log('FAILURE: API returned error.');
        }
    } catch (err) {
        console.error('Network error:', err.message);
    }
}

testRegistration();
