const express = require('express');
const app = express();

app.use(express.json());

app.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ message: 'Server is working' });
});

app.post('/test-register', async (req, res) => {
    try {
        console.log('Test register endpoint hit with body:', req.body);

        // Simple response without any database operations
        res.status(201).json({
            success: true,
            message: 'Test endpoint working',
            data: req.body
        });
    } catch (error) {
        console.error('Error in test register:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 4001;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});
