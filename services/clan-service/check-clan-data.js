const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // API Gateway URL

async function checkClanData() {
    console.log('🔍 Checking clan data to see what user ID is stored...\n');

    try {
        // Get the clan data (public route, no auth needed)
        const response = await axios.get(`${BASE_URL}/api/clans/cmeeajyrd0001pws03gswb011`);
        
        if (response.data.success) {
            const clan = response.data.data;
            console.log('📋 Clan Data:');
            console.log(`   Name: ${clan.name}`);
            console.log(`   Head ID: ${clan.headId}`);
            console.log(`   Admins: ${JSON.stringify(clan.admins)}`);
            console.log(`   Member IDs: ${JSON.stringify(clan.memberIds)}`);
            
            console.log('\n🎯 Analysis:');
            console.log(`   Frontend User ID: cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117`);
            console.log(`   Clan Head ID: ${clan.headId}`);
            console.log(`   Is Frontend User Head? ${clan.headId === 'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117'}`);
            console.log(`   Is Frontend User Admin? ${clan.admins && clan.admins.includes('cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117')}`);
        } else {
            console.log('❌ Failed to get clan data:', response.data);
        }
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }
}

checkClanData();
